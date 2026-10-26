const fs=require('fs'),path=require('path');
module.exports=({db,H,one,run,norm,HANDLE,taken})=>{
  for(const c of ['avatar','bio','birth'])try{db.exec('alter table users add column '+c+' text')}catch{}
  try{db.exec('alter table chats add column avatar text')}catch{}
  const okAv=a=>typeof a==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(a)&&a.length<250000;
  const U='select id,username,name,bio,birth,(avatar is not null) av from users where ';
  global.kgHttp=(req,res)=>{
    const u=req.url.split('?')[0];
    if(u==='/extra.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});res.end(fs.readFileSync(path.join(__dirname,'public','extra.js')));return true}
    const m=/^\/a\/(n|c)\/([^/]+)$/.exec(u);if(!m)return false;
    const id=decodeURIComponent(m[2]);
    const r=m[1]==='n'?one('select avatar a from users where username=?',id.toLowerCase()):one('select avatar a from chats where id=?',Number(id));
    if(!r||!r.a){res.writeHead(404);res.end();return true}
    const [h,b]=r.a.split(',');
    res.writeHead(200,{'content-type':h.slice(5,h.indexOf(';')),'cache-control':'public,max-age=30'});res.end(Buffer.from(b,'base64'));return true;
  };
  const chatInfo=(uid,id)=>{
    const ch=one('select id,type,title,handle,owner,(select count(*) from members where chat=chats.id) n from chats where id=?',id);
    if(!ch||(!one('select 1 x from members where chat=? and uid=?',ch.id,uid)&&!ch.handle))throw'Нет доступа';
    ch.own=ch.owner===uid;ch.ownerName=(one('select name from users where id=?',ch.owner)||{}).name;return{p:ch};
  };
  H.myprofile=c=>({p:one(U+'id=?',c.uid)});
  H.user=(c,m)=>{const p=one(U+'username=?',norm(m.username));if(!p)throw'Не найден';return{p}};
  H.setprofile=(c,m)=>{
    const cur=one('select * from users where id=?',c.uid),name=String(m.name||'').trim().slice(0,40),u=norm(m.username);
    const bio=String(m.bio'').slice(0,200),birth=/^\d{4}-\d{2}-\d{2}$/.test(m.birth'')?m.birth:null;
    if(!name)throw'Введите имя';
    if(u!==cur.username){if(!HANDLE.test(u))throw'Юзернейм: 5–32 символа, латиница, цифры, _';if(taken(u))throw'Юзернейм занят'}
    let av=cur.avatar;if(m.avatar===''||m.avatar===null)av=null;else if(m.avatar){if(!okAv(m.avatar))throw'Фото слишком большое';av=m.avatar}
    run('update users set name=?,username=?,bio=?,birth=?,avatar=? where id=?',name,u,bio,birth,av,c.uid);
    return{p:one(U+'id=?',c.uid)};
  };
  H.chatinfo=(c,m)=>chatInfo(c.uid,m.chat);
  H.editchat=(c,m)=>{
    const ch=one('select * from chats where id=?',m.chat);if(!ch||ch.owner!==c.uid)throw'Только владелец';
    const t=String(m.title'').trim().slice(0,64)ch.title;let av=ch.avatar;
    if(m.avatar){if(!okAv(m.avatar))throw'Фото слишком большое';av=m.avatar}
    run('update chats set title=?,avatar=? where id=?',t,av,ch.id);return chatInfo(c.uid,ch.id);
  };
};
