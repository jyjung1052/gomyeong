/* ---- 상태 ---- */
const S={mode:'login',realm:null,user:'',t:0,busy:false,hover:-1,sitTime:0,breathOn:true,calm:false,lastAct:0,
  me:{x:0,z:3,tx:0,tz:3,heading:Math.PI,walking:false,sitting:false,pending:null,breath:0},
  cam:{yaw:0,pitch:.32,pitchGoal:.32,dist:8.5,zoom:1,tgt:new THREE.Vector3(0,1.45,3),pos:new THREE.Vector3()}};
const keys={left:0,right:0,up:0,down:0};
const el={
  login:$('login'),form:$('loginForm'),nick:$('nick'),hud:$('hud'),back:$('backBtn'),who:$('who'),
  name:$('placeName'),hint:$('placeHint'),mute:$('muteBtn'),vol:$('vol'),hubHint:$('hubHint'),
  breathText:$('breathText'),sitRow:$('sitRow'),actRow:$('actRow'),actBtn:$('actBtn'),breathBtn:$('breathBtn'),sitBtn:$('sitBtn'),lieBtn:$('lieBtn'),timer:$('timer'),
  veil:$('veil'),nav:$('doorNav')
};
const wait=ms=>new Promise(r=>setTimeout(r,reduce?30:ms));
const touch=()=>{ S.lastAct=performance.now(); };

/* ---- 세계 ---- */
const figure=buildFigure(); scene.add(figure.root);
const hub=buildHub();
const cache={};
let world=null;
/* 시야 비우기: 카메라와 내 몸 사이를 가리는 나무·바위(여러 개 찍어 낸 물체)는 그 한 그루를 통째로 화면에서 없앤다.
   들녘 풀숲처럼 몸이 묻혀야 하는 것은 material.userData.noCut 으로 뺀다 */
const CUT={uCam:{value:new THREE.Vector3()},uMe:{value:new THREE.Vector3()},uR:{value:.9}};
function cutaway(group){
  group.traverse(o=>{
    if(!o.isInstancedMesh) return;
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{
      if(!m||m.userData.noCut||m.userData.cutDone) return;
      m.userData.cutDone=true;
      const prev=m.onBeforeCompile, prevKey=m.customProgramCacheKey;
      m.onBeforeCompile=(sh,r)=>{
        if(prev) prev.call(m,sh,r);
        sh.uniforms.uCam=CUT.uCam; sh.uniforms.uMe=CUT.uMe; sh.uniforms.uR=CUT.uR;
        sh.vertexShader='uniform vec3 uCam;\nuniform vec3 uMe;\nuniform float uR;\n'+sh.vertexShader.replace('#include <project_vertex>',`
          #ifdef USE_INSTANCING
          {
            mat4 cutM=modelMatrix*instanceMatrix;
            vec3 cutO=(cutM*vec4(0.0,0.0,0.0,1.0)).xyz, cutUp=(cutM*vec4(0.0,1.0,0.0,0.0)).xyz;
            float cutS=length((cutM*vec4(1.0,0.0,0.0,0.0)).xyz);
            vec3 cutAB=uMe-uCam; float cutL=max(dot(cutAB,cutAB),1e-4); bool cutHide=false; float cutRad=min(1.5*cutS,3.2);
            for(int k=0;k<5;k++){
              vec3 q=cutO+cutUp*(0.3+float(k)*1.5);
              float t=dot(q-uCam,cutAB)/cutL;
              if(t>0.0&&t<0.95&&length(q-(uCam+cutAB*t))<uR*(0.4+0.6*t)+cutRad) cutHide=true;
            }
            if(cutHide&&cutS<6.0) transformed=vec3(0.0);   // 그 한 그루를 통째로 접어 없앤다
          }
          #endif
          #include <project_vertex>`);
      };
      m.customProgramCacheKey=()=>'cut2'+(prevKey?prevKey.call(m):'');
      m.needsUpdate=true;
    });
  });
}
function activate(w){
  if(world) scene.remove(world.group);
  if(!w.noCut) cutaway(w.group);   // 원두막은 예전처럼(가려도 그대로)
  world=w; scene.add(w.group);
  scene.fog=new THREE.Fog(w.fog.c,w.fog.n,w.fog.f);
  scene.background=new THREE.Color(w.bg);
  if(renderer) renderer.setClearColor(w.bg,1);
}
activate(hub);
function clampPos(p,w){
  const b=w.bounds;
  if(b.union){
    let bx=p.x, bz=p.z, bd=1e9;
    for(const r of b.union){ const qx=clamp(p.x,r[0],r[1]), qz=clamp(p.z,r[2],r[3]), d=Math.hypot(qx-p.x,qz-p.z); if(d<bd){ bd=d; bx=qx; bz=qz; } }
    p.x=bx; p.z=bz;
  }
  else if(b.rect){ p.x=clamp(p.x,b.rect[0],b.rect[1]); p.z=clamp(p.z,b.rect[2],b.rect[3]); }
  else{ const dx=p.x-b.circle[0], dz=p.z-b.circle[1], d=Math.hypot(dx,dz); if(d>b.circle[2]){ p.x=b.circle[0]+dx/d*b.circle[2]; p.z=b.circle[1]+dz/d*b.circle[2]; } }
  w.avoid.forEach(a=>{ const dx=p.x-a.x, dz=p.z-a.z, d=Math.hypot(dx,dz); if(d<a.r){ const k=d||1; p.x=a.x+dx/k*a.r; p.z=a.z+dz/k*a.r; } });
}
function clampMe(){
  const m=S.me, p={x:m.x,z:m.z}, q={x:m.tx,z:m.tz};
  clampPos(p,world); clampPos(q,world);
  m.x=p.x; m.z=p.z; m.tx=q.x; m.tz=q.z;
}
function resize(){
  const r=cv.getBoundingClientRect();
  W=Math.max(1,r.width); H=Math.max(1,r.height);
  if(renderer){ renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)); renderer.setSize(W,H,false); }
  camera.aspect=W/H;
  camera.fov=W/H<.8?66:52;
  camera.updateProjectionMatrix();
}

/* ---- HUD ---- */
function fmt(sec){ const s=Math.floor(sec); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
let lastTimerSec=-1;
function syncHud(){
  const hubMode=S.mode==='hub', inScene=S.mode==='scene';
  el.hud.hidden=S.mode==='login';
  el.hud.classList.toggle('hubmode',hubMode);
  const dark=inScene&&S.realm&&S.realm.dark;   // 검은 방: 앉기·눕기 대신 그 방에서 할 일 버튼
  el.back.hidden=!inScene; el.who.hidden=!hubMode; el.sitRow.hidden=!inScene||dark; el.hubHint.hidden=!hubMode;
  el.actRow.hidden=!dark; el.actBtn.textContent=dark?({thunder:'소리 지르기',bolt:'깨부수기'}[S.realm.id]||S.realm.short):'';
  el.name.textContent=hubMode?'문을 하나 고르세요':(S.realm?S.realm.name:'');
  el.hint.textContent=hubMode?'하얀 방':(S.realm?S.realm.line:'');
  el.who.textContent=S.user+' 님';
  el.sitBtn.textContent=S.me.sitting?'일어나기':'여기 앉기'; el.lieBtn.textContent=S.me.lie?'앉기':'눕기';
  if(!inScene){ el.breathText.classList.remove('on'); el.hud.classList.remove('calm'); S.calm=false; }
}
function setSit(v){
  if(v&&S.realm&&S.realm.dark&&S.mode==='scene') return;   // 검은 방에서는 앉기 없음
  const m=S.me;
  if(v===m.sitting) return;
  if(v&&footPose(m.x,m.z).dep>.7){ el.sitBtn.textContent='물이 깊어요'; setTimeout(()=>{ el.sitBtn.textContent=S.me.sitting?'일어나기':'여기 앉기'; },1400); return; }
  m.sitting=v; if(!v) m.lie=false;
  if(v){ m.tx=m.x; m.tz=m.z; m.pending=null; S.cam.pitchGoal=world.pitchSit||.2; }
  else S.cam.pitchGoal=world.pitch||.32;
  Sound.setSeated(v);
  el.sitBtn.textContent=v?'일어나기':'여기 앉기'; el.lieBtn.textContent='눕기';
  touch();
}
function setLie(v){
  const m=S.me;
  if(v&&!m.sitting){ setSit(true); if(!m.sitting) return; }
  m.lie=!!v;
  S.cam.pitchGoal=v?.55:(world.pitchSit||.2);
  el.lieBtn.textContent=v?'앉기':'눕기';
  touch();
}

/* ---- 문과 장면 전환 ---- */
function snapCam(){
  const c=S.cam, m=S.me;
  c.tgt.set(m.x,footPose(m.x,m.z).y+(m.sitting?1.05:1.45),m.z);
  c.dist=camGoal();
}
function camGoal(){
  const portrait=W/H<.8;
  if(S.mode==='hub') return portrait?9.2:8;
  return (S.me.sitting?4.2:6.4)*(portrait?1.18:1);
}
async function fadeThrough(fn){
  S.busy=true;
  el.veil.style.opacity='1';
  await wait(780);
  fn();
  await new Promise(r=>requestAnimationFrame(()=>r()));
  el.veil.style.opacity='0';
  await wait(500);
  S.busy=false;
}
function enterRealm(realm){
  fadeThrough(()=>{
    const w=cache[realm.id]||(cache[realm.id]=BUILD[realm.id]());
    S.mode='scene'; S.realm=realm; S.sitTime=0; lastTimerSec=-1;
    activate(w);
    const m=S.me; m.sitting=false; m.walking=false; m.pending=null;
    m.x=w.spawn.x; m.z=w.spawn.z;
    /* 여럿이 한곳에 겹쳐 서지 않도록 들어서는 자리를 조금씩 흩는다 */
    if(w.spawnJ){ const J=w.spawnJ; if(J.length===1){ const a=Math.random()*TAU, r=Math.sqrt(Math.random())*J[0]; m.x+=Math.cos(a)*r; m.z+=Math.sin(a)*r; } else { m.x+=(Math.random()*2-1)*J[0]; m.z+=(Math.random()*2-1)*J[1]; } }
    m.tx=m.x; m.tz=m.z; m.heading=Math.PI;
    S.cam.yaw=0; S.cam.pitch=S.cam.pitchGoal=w.pitch||.32; S.cam.zoom=1;
    clampMe(); snapCam();
    Sound.setSeated(false); Sound.enter(realm.id);
    el.timer.textContent='앉은 시간 00:00';
    syncHud();
  });
}
function leaveRealm(){
  if(S.busy) return;
  const idx=Math.max(0,REALMS.indexOf(S.realm));
  fadeThrough(()=>{
    S.mode='hub'; S.realm=null; activate(hub);
    const m=S.me; m.sitting=false; m.walking=false; m.pending=null;
    m.x=DOORS[idx].ax; m.z=DOORS[idx].az; m.tx=m.x; m.tz=m.z; m.heading=Math.PI;
    S.cam.yaw=0; S.cam.pitch=S.cam.pitchGoal=.32; S.cam.zoom=1;
    clampMe(); snapCam();
    Sound.setSeated(false); Sound.enter('hub');
    syncHud();
  });
}
/* 아직 짓는 중인 검은 방 문: 들어가지 않고 안내만 한다 */
let soonT=0;
function soonNote(r){
  const h=el.hubHint, keep=h.dataset.base||(h.dataset.base=h.textContent);
  h.textContent=r.name+' 방은 지금 짓고 있어요. 곧 열려요.'; h.hidden=false;
  clearTimeout(soonT); soonT=setTimeout(()=>{ h.textContent=keep; },2600);
}
function goDoor(i){
  if(S.busy||S.mode!=='hub') return;
  const d=DOORS[i], m=S.me;
  m.pending=REALMS[i]; m.tx=d.ax; m.tz=d.az; clampMe();
  touch();
}
function walkTo(p){
  const m=S.me; m.pending=null; m.tx=p.x; m.tz=p.z; clampMe();
}

/* ---- 눌러서 고르기 ---- */
const ray=new THREE.Raycaster(), ndc=new THREE.Vector2(), gplane=new THREE.Plane(new THREE.Vector3(0,1,0),0), hitV=new THREE.Vector3(), meSphere=new THREE.Sphere(new THREE.Vector3(),1);
function pick(px,py){
  ndc.set(px/W*2-1,-(py/H)*2+1); ray.setFromCamera(ndc,camera);
  if(S.mode==='hub'){
    const hs=ray.intersectObjects(hub.portals,false);
    if(hs.length) return {door:hs[0].object.userData.door};
  }else{
    meSphere.center.set(S.me.x,footPose(S.me.x,S.me.z).y+.95,S.me.z); meSphere.radius=1;
    if(ray.ray.intersectsSphere(meSphere)) return {me:true};
    /* 작업대처럼 눌러서 고르는 물건: 그 앞 한가운데 자리로 */
    if(world.tapTargets){ const hs=ray.intersectObjects(world.tapTargets,true); if(hs.length){ let o=hs[0].object; while(o&&o.userData.spot==null) o=o.parent; if(o) return {spot:o.userData.spot}; } }
  }
  gplane.constant=-(world.floorY||0);
  if(ray.ray.intersectPlane(gplane,hitV)) return {ground:hitV.clone()};
  return null;
}
function onTap(px,py){
  touch();
  if(S.busy||S.mode==='login') return;
  const r=pick(px,py); if(!r) return;
  if(S.mode==='hub'){
    if(r.door!=null) goDoor(r.door); else if(r.ground) walkTo(r.ground);
    return;
  }
  const dark=S.realm&&S.realm.dark;
  if(r.me){ if(!dark) setSit(!S.me.sitting); return; }   // 검은 방에서는 앉지 않는다
  if(S.me.sitting) setSit(false);
  /* 검은 방: 작업대·연못 근처를 누르면 그 앞자리까지 곧장 걸어간다 */
  if(r.spot){ walkTo(r.spot); S.me.onDeck=false; return; }
  if(r.ground&&dark&&world.snapSpot){ const p=world.snapSpot(r.ground.x,r.ground.z,S.me.x,S.me.z); if(p){ walkTo(p); S.me.onDeck=false; return; } }
  if(r.ground) walkTo(r.ground);
}
let ptr=null;
/* 두 손가락 핀치: 벌리면 확대, 오므리면 축소 */
const pts=new Map(); let pinch=null;
const ZMIN=.35, ZMAX=2.2;
const pdist=()=>{ const a=[...pts.values()]; return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1; };
cv.addEventListener('pointerdown',e=>{
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pts.size===2){ ptr=null; pinch={d0:pdist(),z0:S.cam.zoom}; touch(); return; }
  if(pts.size>2) return;
  ptr={id:e.pointerId,x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};
  try{ cv.setPointerCapture(e.pointerId); }catch(err){}
  touch();
});
cv.addEventListener('pointermove',e=>{
  touch();
  if(pts.has(e.pointerId)) pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&pts.size===2){ S.cam.zoom=clamp(pinch.z0*pinch.d0/pdist(),ZMIN,ZMAX); return; }
  if(ptr&&ptr.id===e.pointerId){
    if(!ptr.moved&&Math.hypot(e.clientX-ptr.x,e.clientY-ptr.y)>8) ptr.moved=true;
    if(ptr.moved){
      S.cam.yaw+=(e.clientX-ptr.lx)*.006;
      S.cam.pitchGoal=clamp(S.cam.pitchGoal+(e.clientY-ptr.ly)*.004,.05,.95);
      S.cam.pitch=S.cam.pitchGoal;
    }
    ptr.lx=e.clientX; ptr.ly=e.clientY;
  }else if(S.mode==='hub'&&e.pointerType==='mouse'){
    const r=cv.getBoundingClientRect(), p=pick(e.clientX-r.left,e.clientY-r.top);
    S.hover=p&&p.door!=null?p.door:-1;
    cv.style.cursor=S.hover>=0?'pointer':'';
  }
});
cv.addEventListener('pointerup',e=>{
  pts.delete(e.pointerId); if(pts.size<2) pinch=null;
  if(!ptr||ptr.id!==e.pointerId) return;
  const p=ptr; ptr=null;
  if(!p.moved){ const r=cv.getBoundingClientRect(); onTap(p.x-r.left,p.y-r.top); }
});
cv.addEventListener('pointercancel',e=>{ pts.delete(e.pointerId); if(pts.size<2) pinch=null; ptr=null; });
cv.addEventListener('wheel',e=>{ e.preventDefault(); S.cam.zoom=clamp(S.cam.zoom+e.deltaY*.001,ZMIN,ZMAX); touch(); },{passive:false});

const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down'};
window.addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT') return;
  touch();
  const k=keyMap[e.key];
  if(k&&S.mode!=='login'){ keys[k]=1; e.preventDefault(); return; }
  if(S.mode==='scene'){
    if(e.key==='Escape'){ leaveRealm(); return; }
    if((e.key===' '||e.key==='Enter')&&!(e.target&&e.target.tagName==='BUTTON')){ e.preventDefault(); setSit(!S.me.sitting); }
  }
});
window.addEventListener('keyup',e=>{ const k=keyMap[e.key]; if(k) keys[k]=0; });
window.addEventListener('blur',()=>{ keys.left=keys.right=keys.up=keys.down=0; });
window.addEventListener('pointermove',touch,{passive:true});

el.back.addEventListener('click',leaveRealm);
el.sitBtn.addEventListener('click',()=>setSit(!S.me.sitting));
/* 검은 방의 할 일 버튼: 가장 가까운 자리로 걸어가면 거기서 "소리 지를까요?"·"부숴 볼까요?"가 뜬다 */
el.actBtn.addEventListener('click',()=>{ if(!world.nearSpot) return; const m=S.me; if(m.sitting) setSit(false); walkTo(world.nearSpot(m.x,m.z)); m.onDeck=false; touch(); });
el.lieBtn.addEventListener('click',()=>setLie(!S.me.lie));
el.breathBtn.addEventListener('click',()=>{
  S.breathOn=!S.breathOn;
  el.breathBtn.textContent=S.breathOn?'호흡 안내 켬':'호흡 안내 끔';
  el.breathBtn.setAttribute('aria-pressed',String(S.breathOn));
  if(!S.breathOn) el.breathText.classList.remove('on');
});
let muted=false;
el.mute.addEventListener('click',()=>{
  muted=!muted; Sound.setMuted(muted);
  el.mute.textContent=muted?'소리 끔':'소리 켬';
  el.mute.setAttribute('aria-pressed',String(muted));
});
el.vol.addEventListener('input',()=>{
  Sound.setVolume(el.vol.value/100);
  if(muted){ muted=false; Sound.setMuted(false); el.mute.textContent='소리 켬'; el.mute.setAttribute('aria-pressed','false'); }
});
REALMS.forEach((r,i)=>{
  const b=document.createElement('button');
  b.type='button'; b.className='pill'; b.textContent=r.name+(r.soon?' 문(준비 중)':' 문으로 들어가기');
  b.addEventListener('click',()=>goDoor(i));
  el.nav.appendChild(b);
});

/* 로그인 서버 없이 쿠키로 내 세션(이름)을 기억한다 */
const Cookie={
  get(k){ try{ const m=(document.cookie||'').split('; ').find(c=>c.startsWith(k+'=')); return m?decodeURIComponent(m.slice(k.length+1)):''; }catch(e){ return ''; } },
  set(k,v){ try{ document.cookie=k+'='+encodeURIComponent(v)+'; max-age=31536000; path=/; SameSite=Lax'+(location.protocol==='https:'?'; Secure':''); }catch(e){} }
};
try{ const saved=Cookie.get('gomyeong3d_name')||Cookie.get('gozu3d_name')||localStorage.getItem('gozu3d-name'); if(saved) el.nick.value=saved; }catch(e){}
el.form.addEventListener('submit',e=>{
  e.preventDefault();
  if(!renderer) return;
  const name=(el.nick.value||'').trim().slice(0,12)||'나그네';
  try{ localStorage.setItem('gozu3d-name',name); }catch(err){}
  Cookie.set('gomyeong3d_name',name);
  if(!Cookie.get('gomyeong3d_sid')) Cookie.set('gomyeong3d_sid',Math.random().toString(36).slice(2)+Date.now().toString(36));
  S.user=name;
  Together.start();
  Sound.init(); Sound.setVolume(el.vol.value/100);
  S.mode='hub';
  const m=S.me; m.x=HUB_C.x; m.z=HUB_C.z; m.tx=m.x; m.tz=m.z; m.heading=Math.PI;
  snapCam();
  Sound.enter('hub');
  syncHud();
  el.login.classList.add('gone');
  setTimeout(()=>{ el.login.hidden=true; },reduce?60:1000);
  touch();
});
/* 글꼴이 늦게 오면 문 글씨를 다시 그린다 */
if(document.fonts&&document.fonts.load){
  Promise.race([document.fonts.load('700 40px "Gowun Batang"','바다숲호숫가산동굴'),new Promise(r=>setTimeout(r,2500))]).then(()=>{
    hub.doors.forEach((d,i)=>{ d.portal.material.map=doorTexture(REALMS[i]); d.portal.material.needsUpdate=true; });
  }).catch(()=>{});
}

/* ---- 갱신과 그리기 ---- */
const angDiff=(a,b)=>{ let d=(b-a)%TAU; if(d>Math.PI) d-=TAU; if(d<-Math.PI) d+=TAU; return d; };
let breathLabel='';
/* 발 높이와 헤엄 자세: 계곡처럼 땅 높이가 있는 장면에서 쓴다 */
/* 발밑 그림자·빛 고리를 바닥 기울기에 맞춰 눕힌다(비탈에서 반쯤 묻히지 않게) */
const _n=new THREE.Vector3(), _q=new THREE.Quaternion(), _qi=new THREE.Quaternion(), _Z=new THREE.Vector3(0,0,1);
function alignFlats(fig,x,z){
  const w=world; if(!fig.flats) return;
  if(w&&w.groundH){ const e=.35, hx=(w.groundH(x+e,z)-w.groundH(x-e,z))/(2*e), hz=(w.groundH(x,z+e)-w.groundH(x,z-e))/(2*e); _n.set(-hx,1,-hz).normalize(); }
  else _n.set(0,1,0);
  _q.setFromUnitVectors(_Z,_n); _qi.copy(fig.root.quaternion).invert();
  fig.flats.forEach(f=>f.quaternion.copy(_qi).multiply(_q));
}
function footPose(x,z){
  const w=world;
  if(!w||!w.groundH) return {y:(w&&w.floorY)||0,k:0,dep:0};
  const b=w.groundH(x,z), dep=w.waterY-b, k=dep>.75?smooth(.75,1.1,dep):0;
  return {y:lerp(b,w.waterY-.35,k),k,dep};
}
function update(dt){
  const m=S.me, c=S.cam;
  S.t+=dt;
  const fx=-Math.sin(c.yaw), fz=-Math.cos(c.yaw), rx=Math.cos(c.yaw), rz=-Math.sin(c.yaw);
  const kf=keys.up-keys.down, kr=keys.right-keys.left;
  const active=S.mode!=='login'&&!S.busy&&!Yell.busy()&&!Smash.busy();
  if((kf||kr)&&active){
    if(m.sitting) setSit(false);
    const l=Math.hypot(kf,kr)||1;
    const vx=(fx*kf+rx*kr)/l, vz=(fz*kf+rz*kr)/l;
    const sw=1-.4*clamp(footPose(m.x,m.z).dep,0,1.2)/1.2; m.x+=vx*3.4*sw*dt; m.z+=vz*3.4*sw*dt; m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=true;
    m.heading+=angDiff(m.heading,Math.atan2(vx,vz))*(1-Math.exp(-12*dt));
  }else if(!m.sitting&&S.mode!=='login'&&!Yell.busy()&&!Smash.busy()){
    const dx=m.tx-m.x, dz=m.tz-m.z, d=Math.hypot(dx,dz);
    if(d>.05){
      const st=Math.min(d,3.4*(1-.4*clamp(footPose(m.x,m.z).dep,0,1.2)/1.2)*dt);
      m.x+=dx/d*st; m.z+=dz/d*st; m.walking=true;
      m.heading+=angDiff(m.heading,Math.atan2(dx,dz))*(1-Math.exp(-12*dt));
    }else m.walking=false;
  }else{
    m.walking=false;
    if(m.sitting) m.heading+=angDiff(m.heading,Math.atan2(fx,fz)+(m.lie?Math.PI:0))*(1-Math.exp(-1.6*dt));
  }
  clampMe();
  /* 데크에 발을 들이면 걸어가던 것을 멈춘다(키로 움직일 때는 그대로) */
  const onDeck=!!((world.yellSpot&&world.yellSpot(m.x,m.z))||(world.smashSpot&&world.smashSpot(m.x,m.z)>=0));
  const tgtOn=!!((world.yellSpot&&world.yellSpot(m.tx,m.tz))||(world.smashSpot&&world.smashSpot(m.tx,m.tz)>=0));   // 목적지가 그 자리 안이면 끝까지 간다
  if(onDeck&&!m.onDeck&&!(kf||kr)&&!tgtOn){ m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false; }
  m.onDeck=onDeck;
  const P=footPose(m.x,m.z);
  m.swim=damp(m.swim||0,P.k,6,dt); m.lieK=damp(m.lieK||0,m.lie?1:0,4,dt);
  if(P.dep>.05&&m.sitting&&P.dep>.7) setSit(false);
  if(S.mode==='hub'&&m.pending&&!m.walking&&!S.busy){ const r=m.pending; m.pending=null; if(r.soon) soonNote(r); else enterRealm(r); }

  if(S.mode==='scene'){
    if(m.sitting){
      S.sitTime+=dt;
      const sec=Math.floor(S.sitTime);
      if(sec!==lastTimerSec){ lastTimerSec=sec; el.timer.textContent='앉은 시간 '+fmt(S.sitTime); }
    }
    const p=S.sitTime%10;
    let b,label;
    if(p<4){ b=(1-Math.cos(p/4*Math.PI))/2; label='들이쉬세요'; }
    else if(p<5){ b=1; label='잠시 멈춤'; }
    else{ b=1-(1-Math.cos((p-5)/5*Math.PI))/2; label='내쉬세요'; }
    m.breath=m.sitting?b:0;
    const showText=m.sitting&&S.breathOn;
    if(showText&&label!==breathLabel){ breathLabel=label; el.breathText.textContent=label; }
    el.breathText.classList.toggle('on',showText);
    const calm=m.sitting&&performance.now()-S.lastAct>5000;
    if(calm!==S.calm){ S.calm=calm; el.hud.classList.toggle('calm',calm); }
  }

  world.update(S.t,dt,m,S.hover);
  figure.root.position.set(m.x,P.y+.27*m.lieK,m.z);
  figure.root.rotation.order='YXZ';
  figure.root.rotation.y=m.heading; figure.root.rotation.x=m.swim*1.25-m.lieK*Math.PI/2;
  figure.shadow.visible=!(world.groundH&&P.dep>.05)&&m.lieK<.3;
  alignFlats(figure,m.x,m.z);
  const haloK=m.sitting?clamp(S.sitTime/45,0,1)*.9+.1:0;
  figure.update(S.t,m.sitting,m.walking,m.breath,S.realm?S.realm.color:'#ffffff',haloK,S.breathOn&&S.mode==='scene',m.lie);
  Yell.pose(figure); Yell.tick(dt); Smash.pose(figure); Smash.tick(dt);
  if(S.mode==='scene'&&S.realm&&S.realm.dark) el.actRow.hidden=!$('yellBox').hidden||!$('smashBox').hidden||Yell.busy()||Smash.busy();   // 상자가 뜨면 버튼은 비켜 준다
  Together.tick(dt,S.t);

  /* 카메라: 캐릭터 뒤에서 따라가고, 앉으면 가까워진다 */
  c.pitch=damp(c.pitch,c.pitchGoal,3,dt);
  c.dist=damp(c.dist,camGoal(),2.6,dt);
  c.tgt.x=damp(c.tgt.x,m.x,9,dt); c.tgt.z=damp(c.tgt.z,m.z,9,dt);
  c.tgt.y=damp(c.tgt.y,P.y+(m.sitting?1.05-.65*m.lieK:1.45-.5*m.swim),3,dt);
  const d=c.dist*c.zoom, cp=Math.cos(c.pitch);
  c.pos.set(c.tgt.x+Math.sin(c.yaw)*cp*d,Math.max(.5,c.tgt.y+Math.sin(c.pitch)*d),c.tgt.z+Math.cos(c.yaw)*cp*d);
  if(world.groundH){ const lo=Math.max(world.groundH(c.pos.x,c.pos.z),world.waterY)+.7; if(c.pos.y<lo) c.pos.y=lo; }
  camera.position.copy(c.pos);
  const sk=Yell.shake()+Smash.shake(); if(sk){ camera.position.x+=(Math.random()-.5)*sk*2; camera.position.y+=(Math.random()-.5)*sk*2; camera.position.z+=(Math.random()-.5)*sk*2; }
  camera.lookAt(c.tgt);
  CUT.uCam.value.copy(c.pos); CUT.uMe.value.set(m.x,P.y+(m.sitting?.5:.85),m.z);
}
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  update(dt);
  if(renderer) renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
window.addEventListener('resize',resize);
resize(); snapCam();
requestAnimationFrame(frame);
