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
const src=require('fs').readFileSync(require('path').join(__dirname,'..','dist','app.js'),'utf8').replace(/\}\)\(\);\s*$/,'globalThis.__T={setLie,Together,BUILD,S,update,hub,figure,enterRealm,setSit,goDoor,leaveRealm,Yell,Smash,Kick,Punch,Tear,activate};})();');
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
/* 우레: 데크에 서서 소리치기 한 번을 끝까지 */
{ const w=T.BUILD.thunder(); T.activate(w); T.S.mode='scene'; T.S.realm={id:'thunder',color:'#d4b04a'};
  const m=T.S.me; m.x=3.2; m.z=0; m.tx=3.2; m.tz=0; m.sitting=false;
  if(!w.yellSpot(3.2,0)||w.yellSpot(0,20)||w.yellSpot(0,0)) throw new Error('yellSpot');
  T.update(.05); T.Yell.start('시베리아에서 귤이나 까라!!!'); if(!T.Yell.busy()) throw new Error('yell not started');
  let k=0; while(T.Yell.busy()&&k<400){ T.update(.05); k++; }
  if(T.Yell.busy()) throw new Error('yell never ended');
  console.log('YELL_OK frames',k); T.S.mode='hub'; T.activate(T.hub); }
/* 벼락: 작업대 앞에서 물건 고르고 내리쳐 부수기 */
{ const w=T.BUILD.bolt(); T.activate(w); T.S.mode='scene'; T.S.realm={id:'bolt',color:'#f0e070'};
  const f=w.benchFace(0), m=T.S.me; m.x=f.x; m.z=f.z; m.tx=f.x; m.tz=f.z; m.sitting=false;
  if(w.smashSpot(f.x,f.z)!==0||w.smashSpot(0,0)!==-1) throw new Error('smashSpot');
  T.update(.05); T.Smash.start(); if(!T.Smash.busy()) throw new Error('smash not started');
  let k=0; while(T.Smash.busy()&&k<200){ T.update(.05); k++; }
  if(T.Smash.busy()) throw new Error('smash stuck');
  for(let i=0;i<120;i++) T.update(.05);   // 파편이 떨어지고 새 물건이 놓인다
  if(!w.benchKind(0)) throw new Error('no respawn');
  console.log('SMASH_OK frames',k); T.S.mode='hub'; T.activate(T.hub); }
/* 용오름: 침대 옆에서 이불킥 */
{ const w=T.BUILD.spout(); T.activate(w); T.S.mode='scene'; T.S.realm={id:'spout',color:'#6f8fe0',dark:true};
  const sp=w.nearSpot(0,0), m=T.S.me; m.x=sp.x; m.z=sp.z; m.tx=sp.x; m.tz=sp.z; m.sitting=false;
  if(w.kickSpot(sp.x,sp.z)<0||w.kickSpot(0,0)!==-1) throw new Error('kickSpot');
  T.update(.05); T.Kick.start(); if(!T.Kick.busy()) throw new Error('kick not started');
  let k=0; while(T.Kick.busy()&&k<300){ T.update(.05); k++; }
  if(T.Kick.busy()) throw new Error('kick stuck');
  for(let i=0;i<120;i++) T.update(.05);
  console.log('KICK_OK frames',k); T.S.mode='hub'; T.activate(T.hub); }
/* 우박: 베개 앞에서 10초 연타 */
{ const w=T.BUILD.hail(); T.activate(w); T.S.mode='scene'; T.S.realm={id:'hail',color:'#b9c8d8',dark:true};
  const sp=w.nearSpot(0,0), m=T.S.me; m.x=sp.x; m.z=sp.z; m.tx=sp.x; m.tz=sp.z; m.sitting=false;
  if(w.punchSpot(sp.x,sp.z)<0||w.punchSpot(0,0)!==-1) throw new Error('punchSpot');
  T.update(.05); T.Punch.start(); if(!T.Punch.busy()) throw new Error('punch not started');
  let k=0; while(T.Punch.busy()&&k<400){ if(k%3===0) T.Punch.hit&&T.Punch.hit(); T.update(.05); k++; }
  if(T.Punch.busy()) throw new Error('punch stuck');
  for(let i=0;i<80;i++) T.update(.05);
  console.log('PUNCH_OK frames',k); T.S.mode='hub'; T.activate(T.hub); }
/* 눈사태: 종이 찢기 판을 열고 닫기 */
{ const w=T.BUILD.avalanche(); T.activate(w); T.S.mode='scene'; T.S.realm={id:'avalanche',color:'#dce6f0',dark:true};
  w.onAct(); if(!T.Tear.busy()) throw new Error('tear box not open');
  T.Tear.begin('야근'); for(let i=0;i<40;i++) T.update(.05); w.tearBits(50,T.S.me); for(let i=0;i<60;i++) T.update(.05);
  T.Tear.close(); for(let i=0;i<5;i++) T.update(.05);
  console.log('TEAR_OK'); T.S.mode='hub'; T.activate(T.hub); }
console.log('STUB_RUN_OK scenes:',n);
