(()=>{
const R=document.documentElement,TH=()=>localStorage.getItem('kg_th')||'light';
const setTh=t=>{localStorage.setItem('kg_th',t);R.dataset.theme=t};setTh(TH());
const st=document.createElement('style');st.textContent=
:root[data-theme=light]{--tx:#10131a;--t2:#667085;--gl:rgba(255,255,255,.55);--gb:rgba(255,255,255,.9);--sh:rgba(30,40,80,.16);--in:rgba(255,255,255,.75);--bg:#eaf1ff;--hl:rgba(255,255,255,.85)}
:root[data-theme=dark]{--tx:#f2f4f8;--t2:#9aa3b2;--gl:rgba(30,34,50,.5);--gb:rgba(255,255,255,.22);--sh:rgba(0,0,0,.55);--in:rgba(70,78,104,.55);--bg:#070a14;--hl:rgba(255,255,255,.28)}
:root[data-theme=light] body{background:linear-gradient(160deg,#eaf1ff,#f4eaff)}
.ik{width:1.1em;height:1.1em;vertical-align:-.2em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-right:3px}
.ib .ik{width:22px;height:22px;margin:0}
.sh2{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.35);display:flex;align-items:flex-end;justify-content:center}
.sh2>div{width:min(520px,100%);max-height:90dvh;overflow:auto;border-radius:32px 32px 0 0;padding:22px;text-align:center;animation:up .35s both}
.lb{display:block;text-align:left;color:var(--t2);font-size:13px;margin:12px 0 -4px 6px}
.avb{width:96px!important;height:96px!important;font-size:36px!important;margin:auto};
document.head.append(st);
const P={grp:'M9 11a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5a3.2 3.2 0 010 6M18 14.7c1.8.7 3 2.5 3 5.3',ch:'M4 10v4l12 5V5L4 10zM16 9.5a3 3 0 010 5M7 14.5l1.5 5',bk:'M15 5l-7 7 7 7',sh:'M12 15V4M7.5 8.5L12 4l4.5 4.5M5 13v6h14v-6',mo:'M5 12h.01M12 12h.01M19 12h.01',cake:'M4 20h16M5 20v-7h14v7M12 13V9M12 6.5v.01'};
const ik=k=><svg class="ik" viewBox="0 0 24 24"><path d="${P[k]}"/></svg>;
[['#bk','bk'],['#csh','sh'],['#cmn','mo']].forEach(([s,k])=>document.querySelector(s).innerHTML=ik(k));
let ver=Date.now();
const U=(k,i)=>/a/${k}/${encodeURIComponent(i)}?v=${ver};
const paint=(el,u)=>{if(!el)return;const i=new Image();i.onload=()=>{el.style.cssText+=;background-image:url(${u});background-size:cover;background-position:center;color:transparent};i.src=u};
const shrink=f=>new Promise(r=>{const im=new Image();im.onload=()=>{const s=Math.min(im.width,im.height),c=document.createElement('canvas');c.width=c.height=256;c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,256,256);r(c.toDataURL('image/jpeg',.82))};im.src=URL.createObjectURL(f)});
const q=s=>document.querySelector(s);
function deco(){
 document.querySelectorAll('.r1 b,.mid b,#ct').forEach(b=>{const n=b.firstChild;if(n&&n.nodeType==3&&/^(👥|📢) /u.test(n.nodeValue)){const g=n.nodeValue.startsWith('👥');n.nodeValue=n.nodeValue.slice(3);b.insertAdjacentHTML('afterbegin',ik(g?'grp':'ch'))}});
 document.querySelectorAll('.row[data-c]').forEach(r=>{const c=chats.find(x=>x.id==r.dataset.c);if(c)paint(r.querySelector('.av'),c.type=='dm'?U('n',c.handle):U('c',c.id))});
 document.querySelectorAll('.row[data-u]').forEach(r=>paint(r.querySelector('.av'),U('n',r.dataset.u)));
 document.querySelectorAll('.row[data-p]').forEach(r=>{try{paint(r.querySelector('.av'),U('c',JSON.parse(r.dataset.p).id))}catch{}});
 if(cur)paint(q('#chav .av'),cur.type=='dm'?U('n',cur.handle):U('c',cur.id));
}
const _ren=window.ren;window.ren=function(){_ren();if(tab=='me')prof();deco()};
['hdr','doSearch'].forEach(n=>{const o=window[n];window[n]=function(...a){const r=o.apply(this,a);Promise.resolve(r).then(deco);return r}});
async function prof(){
 let p;try{p=(await call('myprofile')).p}catch(e){return}
 if(tab!='me')return;let na;
 q('#view').innerHTML=<div class="card2 g" style="text-align:center"><div class="av avb" id="pav" style="background:hsl(${(me.id*47)%360} 65% 52%)">${esc([...me.name][0]).toUpperCase()}</div><button class="btn s" id="pa">Сменить фото</button><input id="pf" type="file" accept="image/*" hidden><label class="lb">Имя</label><input id="pn" value="${esc(p.name)}"><label class="lb">Юзернейм</label><input id="pu" value="${esc(p.username)}" autocapitalize="off"><label class="lb">О себе</label><input id="pb" value="${esc(p.bio||'')}" maxlength="200"><label class="lb">День рождения</label><input id="pd" type="date" value="${p.birth||''}"><div class="err" id="pe"></div><button class="btn" id="psv">Сохранить</button><button class="btn s" id="pth"></button><button class="btn s" id="psh">Поделиться профилем</button><button class="btn d" id="plo">Выйти</button></div>;
 const tl=()=>q('#pth').textContent='Тема: '+(TH()=='dark'?'тёмная':'светлая');tl();
 if(p.av)paint(q('#pav'),U('n',p.username));
 q('#pa').onclick=()=>q('#pf').click();
 q('#pf').onchange=async e=>{if(e.target.files[0]){na=await shrink(e.target.files[0]);paint(q('#pav'),na)}};
 q('#psv').onclick=async()=>{try{const r=await call('setprofile',{name:q('#pn').value,username:q('#pu').value,bio:q('#pb').value,birth:q('#pd').value,avatar:na});me.name=r.p.name;me.username=r.p.username;ver=Date.now();toast('Сохранено');prof()}catch(e){q('#pe').textContent=e}};
 q('#pth').onclick=()=>{setTh(TH()=='dark'?'light':'dark');tl()};
 q('#psh').onclick=()=>share('@'+me.username);
 q('#plo').onclick=()=>{localStorage.removeItem('kg_tok');location.reload()};
}
async function info(){
 if(!cur)return;const dm=cur.type=='dm';let p;
 try{p=(await call(dm?'user':'chatinfo',dm?{username:cur.handle}:{chat:cur.id})).p}catch(e){return toast(e)}
 const own=!dm&&p.own,nm=p.namep.title,b=p.birth?new Date(p.birth).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'}):'',h=p.usernamep.handle;let na;
 const o=document.createElement('div');o.className='sh2';
 o.innerHTML=<div class="g"><div class="av avb" id="ia" style="background:hsl(${(p.id*47)%360} 65% 52%)">${esc([...nm][0]).toUpperCase()}</div><h2 style="margin:10px 0 2px">${esc(nm)}</h2><div style="color:var(--t2)">${h?'@'+esc(h):''}</div>${p.bio?<p>${esc(p.bio)}</p>:''}${b?<p>${ik('cake')}${b}</p>:''}${dm?'':<p style="color:var(--t2)">${p.type=='channel'?'Канал':'Группа'} · ${p.n} уч. · владелец: ${esc(p.ownerName)}</p>}${own?<input id="et" value="${esc(p.title)}"><input id="ef" type="file" accept="image/*" hidden><button class="btn s" id="ea">Сменить фото</button><button class="btn" id="es">Сохранить</button>:''}<button class="btn s" id="ex">Закрыть</button></div>;
 document.body.append(o);
 const cl=()=>o.remove();o.onclick=e=>{if(e.target==o)cl()};o.querySelector('#ex').onclick=cl;
 paint(o.querySelector('#ia'),dm?U('n',p.username):U('c',p.id));
 if(own){
  o.querySelector('#ea').onclick=()=>o.querySelector('#ef').click();
  o.querySelector('#ef').onchange=async e=>{if(e.target.files[0]){na=await shrink(e.target.files[0]);paint(o.querySelector('#ia'),na)}};
  o.querySelector('#es').onclick=async()=>{try{await call('editchat',{chat:p.id,title:o.querySelector('#et').value,avatar:na});ver=Date.now();const r=await call('chats');chats=r.chats;cur=chats.find(x=>x.id==p.id)||cur;hdr();ren();cl()}catch(e){toast(e)}};
 }
}
q('#chat #chav').onclick=info;q('#chat .tt').onclick=info;
deco();
})();
