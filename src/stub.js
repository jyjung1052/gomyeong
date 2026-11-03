const handler={get:(t,k)=>{ if(k===Symbol.toPrimitive) return ()=>0; if(k==='then') return undefined; return P(); },apply:()=>P(),construct:()=>P(),set:()=>true,has:()=>true};
function P(){ return new Proxy(function(){},handler); }
global.THREE=P();
global.window=global;
global.document={getElementById:()=>P(),createElement:()=>P(),querySelector:()=>P()};
global.matchMedia=()=>({matches:false});
global.addEventListener=()=>{};
global.devicePixelRatio=1;
const raf=[]; global.requestAnimationFrame=f=>{raf.push(f);};
global.AudioContext=undefined;
let _cb=null; const sent=[];
const fakeRoom={connected:()=>true,onPeers:f=>{_cb=f;},peers:()=>[],presence:async p=>{sent.push(p);}};
global.claude={use:async n=>n==='room'?fakeRoom:null};
global.__sent=sent; global.__push=peers=>_cb&&_cb({peers});
const src=require('fs').readFileSync(require('path').join(__dirname,'..','dist','app.js'),'utf8').replace(/\}\)\(\);\s*$/,'globalThis.__T={setLie,Together,BUILD,S,update,hub,figure,enterRealm,setSit,goDoor,leaveRealm};})();');
(0,eval)(src);
const T=globalThis.__T;
let n=0;
for(const id of Object.keys(T.BUILD)){
  const w=T.BUILD[id]();
  for(let i=0;i<3;i++) w.update(i*.5,.016,T.S.me,-1);
  n++;
}
T.hub.update(1,.016,T.S.me,0);
T.S.mode='scene'; T.S.realm={id:'sea',color:'#4f9cc7'};
T.setSit(true); T.update(.016); T.update(.016); T.setLie(true); for(let i=0;i<20;i++) T.update(.05); T.setLie(false); T.update(.05);
T.S.mode='hub'; T.goDoor(2); T.update(.016);
(async()=>{
  T.S.user='시험'; T.Together.start(); await new Promise(r=>setTimeout(r,20));
  T.S.mode='hub';
  __push([{peer:'a',isMe:false,presence:{n:'하늘',s:'hub',x:1,z:2,h:3,i:0}},{peer:'b',isMe:false,presence:{n:'바다',s:'sea',x:0,z:0,h:0,i:1}},{peer:'me',isMe:true,presence:{}}]);
  for(let i=0;i<30;i++) T.update(.05);
  __push([{peer:'a',isMe:false,presence:{n:'하늘',s:'hub',x:3,z:2,h:3,i:1}}]);
  for(let i=0;i<30;i++) T.update(.05);
  console.log('PRESENCE_SENT',__sent.length,JSON.stringify(__sent[__sent.length-1]));
})();
console.log('STUB_RUN_OK scenes:',n);
