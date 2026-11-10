/* ---- 종이 찢기: 눈사태 방. 한 번 누르면 하나로 이어지는 연출:
   ① 양손으로 종이 양끝을 잡고 박수 치듯 모아 와그작 구기고 → ② 힘껏 벌리는 순간 촤촤촤촥 잘게 찢어지고
   → ③ 만세! 조각이 하늘로 확 → ④ 수많은 종이 조각이 팔랑팔랑 눈처럼 화면 가득 내려와 쌓인다 ---- */
const Tear=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_tear_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let today=0; try{ today=+(localStorage.getItem(dayKey())||0); }catch(e){}
  let open_=false, boxOpen=false, sel=null;   /* open_: 예전 찢기 판(없앰) */
  /* 1) 무엇을 찢을지 고르는 상자 */
  const box=document.createElement('div'); box.id='tearBox'; box.className='yellbox actbox'; box.hidden=true;
  box.innerHTML='<div class="yhead"><p class="yq">무엇을 찢어 버릴까요?</p><p class="ycount"></p></div><div class="ych"></div><form class="yrow"><input maxlength="12" placeholder="걱정 쓰기 (안 써도 돼요)" aria-label="종이에 쓸 걱정"><button class="pill sit ygo" type="submit">찢기 시작</button></form><button class="pill ycancel" type="button">닫기</button>';
  const cnt=box.querySelector('.ycount'), chips=box.querySelector('.ych'), form=box.querySelector('.yrow'), inp=form.querySelector('input');
  AV_WORRY.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='pill ychip'; b.textContent=t;
    b.addEventListener('click',()=>{ sel=sel===t?null:t; chips.querySelectorAll('.ychip').forEach(x=>x.classList.toggle('on',x.textContent===sel)); }); chips.appendChild(b); });
  form.addEventListener('submit',e=>{ e.preventDefault(); inp.blur(); begin(inp.value.trim()||sel||''); inp.value=''; });
  box.querySelector('.ycancel').addEventListener('click',()=>{ boxOpen=false; box.hidden=true; });
  ['pointerdown','touchstart','wheel'].forEach(k=>box.addEventListener(k,e=>e.stopPropagation(),{passive:true}));
  (document.querySelector('#hud .bottom')||document.body).prepend(box);
  const showCount=()=>{ cnt.textContent=today?`오늘 ${today}장 찢음`:''; cnt.hidden=!today; }; showCount();

  /* 2) 연출 시간표(초). 손동작·종이·소리·조각이 모두 이 시계 하나에 맞춰 움직인다
     종이 들기 → (모았다 벌리기 × 5: 벌릴 때마다 촤! 하고 반씩 더 잘게) → 한 번 더 모아서 → 만세와 함께 촤!!!!! 하늘로 → 종이 눈 */
  const T_HOLD=.3, CYC=.34, NCYC=5, C_IN=.15, C_OUT=.13;
  const T_LAST=T_HOLD+CYC*NCYC, T_GATHER=T_LAST+.14, T_BURST=T_GATHER+.2, T_UP=T_BURST+.06, T_REL=T_UP+.9, T_END=T_REL+.45, T_SNOW=T_END+3.6;
  let run=null, shakeT=0;
  const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x), easeIn=x=>x<=0?0:x>=1?1:x*x*x, easeOut=x=>x<=0?0:x>=1?1:1-Math.pow(1-x,3);
  const L=(a,b,k)=>a+(b-a)*k;
  const REST={lx:0,lz:0,lf:0,rx:0,rz:0,rf:0,lean:0,head:0,mouth:0,brow:0};
  const HOLD={lx:-1.15,lz:-.58,lf:-.3,rx:-1.15,rz:.58,rf:-.3,lean:.05,head:.12,mouth:0,brow:.15};
  const CLAP={lx:-1.2,lz:.5,lf:-.62,rx:-1.2,rz:-.5,rf:-.62,lean:.16,head:.18,mouth:.3,brow:.45,eyes:'shut'};
  const PULL={lx:-1.08,lz:-1.15,lf:-.1,rx:-1.08,rz:1.15,rf:-.1,lean:0,head:.05,mouth:.9,brow:.45};
  const UP={lx:-2.95,lz:-.38,lf:-.12,rx:-2.95,rz:.38,rf:-.12,lean:-.16,head:-.4,mouth:1.15,brow:0};
  const mix=(A,B,k)=>{ const o={}; for(const key in A){ if(typeof A[key]==='number') o[key]=L(A[key],B[key]??A[key],k); } o.eyes=k<.5?A.eyes:B.eyes; return o; };
  /* 지금 몇 번째 왕복인지와 그 안의 위치 */
  const cyc=u=>{ const c=Math.floor((u-T_HOLD)/CYC); return {c,w:u-T_HOLD-c*CYC}; };
  function poseAt(u){
    if(u<T_HOLD) return mix(REST,HOLD,ease(u/T_HOLD));
    if(u<T_LAST){ const {c,w}=cyc(u), from=c===0?HOLD:PULL;
      if(w<C_IN) return mix(from,CLAP,easeIn(w/C_IN));                     /* 박수 치듯 탁 모으고 */
      if(w<C_IN+C_OUT) return mix(CLAP,PULL,easeOut((w-C_IN)/C_OUT));       /* 쫙 벌린다 */
      return PULL; }
    if(u<T_GATHER) return mix(PULL,CLAP,easeIn((u-T_LAST)/(T_GATHER-T_LAST)));   /* 마지막으로 꽉 모아 쥐고 */
    if(u<T_UP) return mix(CLAP,UP,easeOut((u-T_GATHER)/(T_UP-T_GATHER)));        /* 만세! */
    if(u<T_REL) return UP;
    return mix(UP,REST,ease((u-T_REL)/(T_END-T_REL)));
  }
  function begin(t){
    boxOpen=false; box.hidden=true;
    const m=S.me; if(m.sitting) setSit(false); m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false;
    m.heading=S.cam.yaw;                                    /* 카메라 쪽을 보고 선다: 손과 종이가 잘 보이게 */
    run={t0:S.t,text:t,ev:{},zoom0:S.cam.zoom,pitch0:S.cam.pitchGoal,level:0};
    world.paperShow&&world.paperShow(t); touch();
  }
  function close(){ if(!run) return; world.paperHide&&world.paperHide(); world.heldRelease&&world.heldRelease(); figure.armsPose(null); S.cam.zoom=run.zoom0; S.cam.pitchGoal=run.pitch0; run=null; }
  function openBox(){ if(run) return; boxOpen=true; box.hidden=false; touch(); }
  const once=(k,f)=>{ if(!run.ev[k]){ run.ev[k]=true; f(); } };
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt);
    if(!open_&&!boxOpen) box.hidden=true;
    if(!run) return;
    const u=S.t-run.t0;
    S.cam.zoom+=((u<T_UP?.62:.9)-S.cam.zoom)*Math.min(1,dt*3); S.cam.pitchGoal=u<T_UP?.16:.05;
    figure.root.updateMatrixWorld(true);
    const hl=figure.leftHand(), hr=figure.rightHand(), up=new THREE.Vector3(0,1,0), mid=hl.clone().add(hr).multiplyScalar(.5), side=hr.clone().sub(hl).normalize();
    /* 처음 한 장: 모으면 살짝 구겨지듯 접힌다 */
    if(run.level===0) world.paperPose&&world.paperPose(hl,hr,up,u<T_HOLD?0:Math.min(.55,easeIn(Math.min(1,(u-T_HOLD)/C_IN))*.55),0);
    else world.heldPose&&world.heldPose(hl,hr,up,cyc(u).w<C_IN);
    /* 왕복마다: 손이 맞닿는 순간 탁, 벌리는 순간 촤! — 반씩 더 잘게 */
    for(let c=0;c<NCYC;c++){ const t0=T_HOLD+c*CYC;
      if(u>=t0+C_IN-.01) once('clap'+c,()=>{ Sound.crumple&&Sound.crumple(); shakeT=Math.max(shakeT,.08); });
      if(u>=t0+C_IN+.03) once('rip'+c,()=>{
        run.level=c+1; const n=Math.min(64,2<<c), size=.3/Math.pow(1.45,c);
        if(c===0) world.paperHide&&world.paperHide();
        world.heldSet&&world.heldSet(n,size); world.heldPose&&world.heldPose(hl,hr,up,0);
        world.heldCrumbs&&world.heldCrumbs(mid,side,up,6+c*6,size*.5);
        const k=.55+c*.09; [0,35,70].forEach((ms,i)=>setTimeout(()=>Sound.rip&&Sound.rip(Math.min(1,k+i*.05)),ms));
        shakeT=Math.max(shakeT,.18+c*.05); try{ navigator.vibrate&&navigator.vibrate(12+c*4); }catch(e){} });
    }
    /* 촤!!!!!: 마지막 만세와 함께 전부 하늘로 */
    if(u>=T_BURST) once('burst',()=>{ const c=mid.clone(); c.y+=.15;
      world.heldRelease&&world.heldRelease(up); world.paperShred&&world.paperShred(c,side,up,120); world.paperToss&&world.paperToss(c,up);
      [0,30,60,90,120,150].forEach((ms,i)=>setTimeout(()=>Sound.rip&&Sound.rip(.8+i*.04),ms)); setTimeout(()=>{ Sound.rip&&Sound.rip(1); Sound.rip&&Sound.rip(1); Sound.whoosh&&Sound.whoosh(); },190);
      shakeT=.6; try{ navigator.vibrate&&navigator.vibrate([25,20,25,20,25,20,80]); }catch(e){} });
    /* 종이 눈: 카메라 앞 공간에 화면 가득 */
    if(u>=T_UP&&u<T_SNOW){ const k=1-Math.max(0,(u-(T_SNOW-1.2))/1.2), n=Math.floor((110*k)*dt+Math.random()); if(n>0){ const cp=camera.position, look=new THREE.Vector3(); camera.getWorldDirection(look); look.y=0; look.normalize(); world.paperSnow&&world.paperSnow(cp,look,n); } }
    if(u>=T_END) once('count',()=>{ today++; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount(); figure.armsPose(null); S.cam.zoom=run.zoom0; S.cam.pitchGoal=run.pitch0; });
    if(u>=T_SNOW) run=null;
  }
  function pose(fig){ if(!run) return; const u=S.t-run.t0; if(u<T_END) fig.armsPose(poseAt(u)); }
  function shake(){ return shakeT>0?Math.min(.09,shakeT*.2):0; }
  return {_at:u=>{ if(run){ run.t0=S.t-u; } },tick,pose,shake,open:openBox,begin,close,busy:()=>(!!run&&S.t-run.t0<T_END)||boxOpen,isOpen:()=>!!run};
})();
