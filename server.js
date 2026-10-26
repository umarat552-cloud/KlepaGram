const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(process.env.DB_PATH||path.join(__dirname,'klepagram.db'));
db.exec(`PRAGMA journal_mode=WAL;
create table if not exists users(id integer primary key,username text unique,name text,hash text,salt text,ts integer);
create table if not exists sessions(token text primary key,uid integer);
create table if not exists chats(id integer primary key,type text,title text,handle text unique,owner integer,ts integer);
create table if not exists members(chat integer,uid integer,role text,last_read integer default 0,primary key(chat,uid));
create table if not exists msgs(id integer primary key,chat integer,uid integer,text text,ts integer);
create index if not exists mi on msgs(chat,id);`);
const all=(s,...a)=>db.prepare(s).all(...a),one=(s,...a)=>db.prepare(s).get(...a),run=(s,...a)=>db.prepare(s).run(...a);
const online=new Map(),HANDLE=/^[a-z][a-z0-9_]{4,31}$/,BAD='Юзернейм: 5–32 символа, латиница, цифры, _, первая буква';
const hash=(p,s)=>crypto.scryptSync(String(p),s,32);
const taken=h=>one('select 1 x from users where username=?',h)||one('select 1 x from chats where handle=?',h);
const norm=s=>String(s||'').trim().toLowerCase().replace(/^@/,'');
const push=(uid,o)=>{for(const c of online.get(uid)||[])wsSend(c.sock,JSON.stringify(o))};
const role=(u,ch)=>one('select role from members where chat=? and uid=?',ch,u);
function chatsFor(uid){
  return all('select c.id,c.type,c.title,c.handle,c.ts,m.role,m.last_read,(select count(*) from members where chat=c.id) n from chats c join members m on m.chat=c.id and m.uid=?',uid).map(c=>{
    if(c.type==='dm'){const o=one('select u.id,u.name,u.username from members m join users u on u.id=m.uid where m.chat=? and m.uid!=?',c.id,uid);c.title=o.name;c.handle=o.username;c.peer=o.id}
    c.last=one('select m.id,m.text,m.ts,u.name from msgs m join users u on u.id=m.uid where m.chat=? order by m.id desc limit 1',c.id)||null;
    c.unread=one('select count(*) n from msgs where chat=? and id>? and uid!=?',c.id,c.last_read,uid).n;
    return c}).sort((a,b)=>((b.last&&b.last.ts)||b.ts)-((a.last&&a.last.ts)||a.ts));
}
function enter(c,uid,token){
  c.uid=uid;if(!online.has(uid))online.set(uid,new Set());online.get(uid).add(c);
  if(!token){token=crypto.randomBytes(24).toString('hex');run('insert into sessions values(?,?)',token,uid)}
  return{me:one('select id,username,name from users where id=?',uid),token,chats:chatsFor(uid)};
}
const H={
  ping(){},
  register(c,m){
    const u=norm(m.username);if(!HANDLE.test(u))throw BAD;
    if(String(m.password||'').length<6)throw'Пароль: минимум 6 символов';
    if(taken(u))throw'Юзернейм занят';
    const salt=crypto.randomBytes(16).toString('hex'),name=String(m.name||'').trim().slice(0,40)||u;
    const r=run('insert into users(username,name,hash,salt,ts) values(?,?,?,?,?)',u,name,hash(m.password,salt).toString('hex'),salt,Date.now());
    return enter(c,Number(r.lastInsertRowid));
  },
  login(c,m){
    if((c.fails||0)>=10)throw'Слишком много попыток';
    const u=one('select * from users where username=?',norm(m.username));
    if(!u||!crypto.timingSafeEqual(hash(m.password,u.salt),Buffer.from(u.hash,'hex'))){c.fails=(c.fails||0)+1;throw'Неверный юзернейм или пароль'}
    return enter(c,u.id);
  },
  resume(c,m){const s=one('select uid from sessions where token=?',String(m.token));if(!s)throw'Сессия истекла';return enter(c,s.uid,m.token)},
  chats(c){return{chats:chatsFor(c.uid)}},
  history(c,m){
    const ch=one('select * from chats where id=?',m.chat);
    if(!ch||(!role(c.uid,ch.id)&&!ch.handle))throw'Нет доступа';
    const b=Number(m.before)||0;
    return{msgs:all('select m.id,m.uid,m.text,m.ts,u.name from msgs m join users u on u.id=m.uid where m.chat=? and (?=0 or m.id<?) order by m.id desc limit 50',ch.id,b,b).reverse()};
  },
  send(c,m){
    const ch=one('select * from chats where id=?',m.chat),mem=ch&&role(c.uid,ch.id),text=String(m.text||'').trim().slice(0,4000);
    if(!mem)throw'Вы не участник';if(!text)throw'Пусто';
    if(ch.type==='channel'&&mem.role!=='owner')throw'В канал пишет только владелец';
    const ts=Date.now(),id=Number(run('insert into msgs(chat,uid,text,ts) values(?,?,?,?)',ch.id,c.uid,text,ts).lastInsertRowid);
    const msg={id,uid:c.uid,text,ts,name:one('select name from users where id=?',c.uid).name};
    for(const r of all('select uid from members where chat=?',ch.id))push(r.uid,{ev:'msg',chat:ch.id,msg});
  },
  read(c,m){run('update members set last_read=max(last_read,?) where chat=? and uid=?',Number(m.id)||0,m.chat,c.uid)},
  search(c,m){
    const q=norm(m.q).slice(0,40).replace(/[%_]/g,'');if(!q)return{users:[],chats:[]};
    return{users:all("select id,username,name from users where (username like ?||'%' or lower(name) like '%'||?||'%') and id!=? limit 15",q,q,c.uid),
      chats:all("select c.id,c.type,c.title,c.handle,(select count(*) from members where chat=c.id) n,exists(select 1 from members where chat=c.id and uid=?) member from chats c where c.handle is not null and (c.handle like ?||'%' or lower(c.title) like '%'||?||'%') limit 15",c.uid,q,q)};
  },
  openDm(c,m){
    const p=one('select id from users where username=?',norm(m.username));
    if(!p)throw'Пользователь не найден';if(p.id===c.uid)throw'Это вы';
    let ch=one("select c.id from chats c join members a on a.chat=c.id and a.uid=? join members b on b.chat=c.id and b.uid=? where c.type='dm'",c.uid,p.id);
    let id=ch&&ch.id;
    if(!id){id=Number(run("insert into chats(type,owner,ts) values('dm',?,?)",c.uid,Date.now()).lastInsertRowid);
      run("insert into members(chat,uid,role) values(?,?,'member')",id,c.uid);run("insert into members(chat,uid,role) values(?,?,'member')",id,p.id)}
    return{chats:chatsFor(c.uid),chat:id};
  },
  create(c,m){
    const type=m.type==='channel'?'channel':'group',title=String(m.title||'').trim().slice(0,64);
    if(!title)throw'Введите название';
    let h=norm(m.handle)||null;
    if(h){if(!HANDLE.test(h))throw BAD;if(taken(h))throw'Юзернейм занят'}
    const id=Number(run('insert into chats(type,title,handle,owner,ts) values(?,?,?,?,?)',type,title,h,c.uid,Date.now()).lastInsertRowid);
    run("insert into members(chat,uid,role) values(?,?,'owner')",id,c.uid);
    return{chats:chatsFor(c.uid),chat:id};
  },
  join(c,m){
    const ch=one('select * from chats where id=?',m.chat);if(!ch||!ch.handle)throw'Чат закрыт';
    run("insert or ignore into members(chat,uid,role) values(?,?,'member')",ch.id,c.uid);
    return{chats:chatsFor(c.uid),chat:ch.id};
  },
  leave(c,m){run('delete from members where chat=? and uid=?',m.chat,c.uid);return{chats:chatsFor(c.uid)}},
  profile(c,m){
    const name=String(m.name||'').trim().slice(0,40),u=norm(m.username),cur=one('select * from users where id=?',c.uid);
    if(!name)throw'Введите имя';
    if(u!==cur.username){if(!HANDLE.test(u))throw BAD;if(taken(u))throw'Юзернейм занят'}
    run('update users set name=?,username=? where id=?',name,u,c.uid);
    return{me:one('select id,username,name from users where id=?',c.uid)};
  }
};
function onText(c,txt){
  let m;try{m=JSON.parse(txt)}catch{return}
  try{
    const f=H[m.t];if(!f)throw'?';
    if(!c.uid&&!['register','login','resume','ping'].includes(m.t))throw'Нужен вход';
    wsSend(c.sock,JSON.stringify({id:m.id,ok:1,...(f(c,m)||{})}));
  }catch(e){
    if(typeof e!=='string')console.error(e);
    wsSend(c.sock,JSON.stringify({id:m.id,err:typeof e==='string'?e:'Ошибка сервера'}));
  }
}
function wsSend(s,str,op=1){
  if(s.destroyed)return;const p=Buffer.from(str);let h;
  if(p.length<126)h=Buffer.from([128|op,p.length]);
  else if(p.length<65536){h=Buffer.alloc(4);h[0]=128|op;h[1]=126;h.writeUInt16BE(p.length,2)}
  else{h=Buffer.alloc(10);h[0]=128|op;h[1]=127;h.writeBigUInt64BE(BigInt(p.length),2)}
  s.write(Buffer.concat([h,p]));
}
function parse(c){
  const b=c.buf;if(b.length<2)return null;
  let len=b[1]&127,off=2;
  if(len===126){if(b.length<4)return null;len=b.readUInt16BE(2);off=4}
  else if(len===127){if(b.length<10)return null;len=Number(b.readBigUInt64BE(2));off=10}
  if(len>1e6){c.sock.destroy();return null}
  const mk=b[1]&128?4:0,end=off+mk+len;if(b.length<end)return null;
  let p=Buffer.from(b.subarray(off+mk,end));
  if(mk){const k=b.subarray(off,off+4);for(let i=0;i<p.length;i++)p[i]^=k[i&3]}
  c.buf=b.subarray(end);return{op:b[0]&15,p};
}
const srv=http.createServer((req,res)=>{
  const u=req.url.split('?')[0];
  if(u==='/'||u==='/index.html'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});return res.end(fs.readFileSync(path.join(__dirname,'public','index.html')))}
  if(u==='/health')return res.end('ok');
  res.writeHead(404);res.end();
});
srv.on('upgrade',(req,sock)=>{
  const key=req.headers['sec-websocket-key'];if(!key)return sock.destroy();
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
  const c={sock,uid:0,buf:Buffer.alloc(0)};
  sock.on('data',d=>{c.buf=Buffer.concat([c.buf,d]);let f;while((f=parse(c))){
    if(f.op===8)return sock.end();if(f.op===9)wsSend(sock,f.p.toString(),10);else if(f.op===1)onText(c,f.p.toString())}});
  const drop=()=>{const s=online.get(c.uid);if(s){s.delete(c);if(!s.size)online.delete(c.uid)}};
  sock.on('close',drop);sock.on('error',()=>sock.destroy());
});
setInterval(()=>online.forEach(s=>s.forEach(c=>wsSend(c.sock,'',9))),30000);
srv.listen(process.env.PORT||3000,()=>console.log('KlepaGram: port',process.env.PORT||3000));
