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

  /* 2) 연출 시간표(초). 손동작·종이·소리·조각이 모두 이 시계 하나에 맞춰 움직인다 */
  const T_HOLD=.28, T_CLAP=.46, T_SQZ=.72, T_PULL=.84, T_UP=1.12, T_TOSS=1.08, T_REL=1.9, T_END=2.3, T_SNOW=5.2;
  let run=null, shakeT=0, punchZ=0;
  const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x), easeIn=x=>x<=0?0:x>=1?1:x*x*x, easeOut=x=>x<=0?0:x>=1?1:1-Math.pow(1-x,3);
  const L=(a,b,k)=>a+(b-a)*k;
  /* 자세 표: 들기 → 박수(모으기) → 꽉 쥐기 → 쫙 벌리기 → 만세 → 내리기 */
  const HOLD={lx:-1.15,lz:-.58,lf:-.3,rx:-1.15,rz:.58,rf:-.3,lean:.05,head:.12,mouth:0,brow:.15};
  const CLAP={lx:-1.2,lz:.5,lf:-.62,rx:-1.2,rz:-.5,rf:-.62,lean:.16,head:.2,mouth:.3,brow:.45,eyes:'shut'};
  const PULL={lx:-1.05,lz:-1.25,lf:-.08,rx:-1.05,rz:1.25,rf:-.08,lean:-.04,head:0,mouth:1,brow:.45};
  const UP={lx:-2.95,lz:-.38,lf:-.12,rx:-2.95,rz:.38,rf:-.12,lean:-.14,head:-.38,mouth:1.1,brow:0};
  const mix=(A,B,k)=>{ const o={}; for(const key in A){ if(typeof A[key]==='number') o[key]=L(A[key],B[key]??A[key],k); } o.eyes=k<.5?A.eyes:B.eyes; return o; };
  function poseAt(u){
    if(u<T_HOLD) return mix({lx:0,lz:0,lf:0,rx:0,rz:0,rf:0,lean:0,head:0,mouth:0,brow:0},HOLD,ease(u/T_HOLD));
    if(u<T_CLAP) return mix(HOLD,CLAP,easeIn((u-T_HOLD)/(T_CLAP-T_HOLD)));           /* 박수 치듯 빠르게 */
    if(u<T_SQZ){ const o=mix(CLAP,CLAP,0), j=Math.sin(u*90)*.05; o.lz+=j; o.rz-=j; return o; }   /* 와그작 쥐어짜며 부들부들 */
    if(u<T_PULL) return mix(CLAP,PULL,easeOut((u-T_SQZ)/(T_PULL-T_SQZ)));             /* 힘차게 쫙 */
    if(u<T_UP) return mix(PULL,UP,ease((u-T_PULL)/(T_UP-T_PULL)));                    /* 그대로 만세 */
    if(u<T_REL) return UP;
    return mix(UP,{lx:0,lz:0,lf:0,rx:0,rz:0,rf:0,lean:0,head:0,mouth:0,brow:0},ease((u-T_REL)/(T_END-T_REL)));
  }
  function begin(t){
    boxOpen=false; box.hidden=true;
    const m=S.me; if(m.sitting) setSit(false); m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false;
    m.heading=S.cam.yaw;                                    /* 카메라 쪽을 보고 선다: 손과 종이가 잘 보이게 */
    run={t0:S.t,text:t,ev:{},zoom0:S.cam.zoom,pitch0:S.cam.pitchGoal};
    world.paperShow&&world.paperShow(t); touch();
  }
  function close(){ if(!run) return; world.paperHide&&world.paperHide(); figure.armsPose(null); S.cam.zoom=run.zoom0; S.cam.pitchGoal=run.pitch0; run=null; }
  function openBox(){ if(run) return; boxOpen=true; box.hidden=false; touch(); }
  const once=(k,f)=>{ if(!run.ev[k]){ run.ev[k]=true; f(); } };
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt); punchZ*=Math.exp(-dt*7);
    if(!open_&&!boxOpen) box.hidden=true;
    if(!run) return;
    const u=S.t-run.t0, m=S.me;
    /* 카메라: 조금 다가가 낮게, 만세 뒤엔 살짝 물러나 하늘을 보게 */
    S.cam.zoom+=((u<T_UP?.62:.9)-S.cam.zoom)*Math.min(1,dt*3); S.cam.pitchGoal=u<T_UP?.16:.05;
    figure.root.updateMatrixWorld(true);
    const hl=figure.leftHand(), hr=figure.rightHand(), up=new THREE.Vector3(0,1,0);
    /* 종이: 손이 모일수록 구겨지고(박수 순간 완전히 뭉치), 벌리는 순간 찢긴다 */
    if(u<T_PULL+.01&&!run.ev.shred){
      const c=u<T_HOLD?0:u<T_CLAP?easeIn((u-T_HOLD)/(T_CLAP-T_HOLD))*.92:Math.min(1,.92+(u-T_CLAP)*.6);
      world.paperPose&&world.paperPose(hl,hr,up,c,u>T_CLAP&&u<T_SQZ?1:0);
    }
    if(u>=T_CLAP) once('clap',()=>{ Sound.crumple&&Sound.crumple(); setTimeout(()=>Sound.crumple&&Sound.crumple(),70); Sound.stomp&&Sound.stomp(.15); shakeT=.12; punchZ=.05; try{ navigator.vibrate&&navigator.vibrate(15); }catch(e){} });
    if(u>=T_SQZ+.04) once('shred',()=>{ const mid=hl.clone().add(hr).multiplyScalar(.5), side=hr.clone().sub(hl).normalize();
      world.paperShred&&world.paperShred(mid,side,up,230);
      [0,40,80,120,165].forEach((ms,i)=>setTimeout(()=>Sound.rip&&Sound.rip(.55+i*.1),ms)); setTimeout(()=>{ Sound.rip&&Sound.rip(1); Sound.rip&&Sound.rip(1); },225);
      shakeT=.45; punchZ=.14; try{ navigator.vibrate&&navigator.vibrate([20,20,20,20,40]); }catch(e){} });
    if(u>=T_TOSS) once('toss',()=>{ const c=hl.clone().add(hr).multiplyScalar(.5); c.y+=.2; world.paperToss&&world.paperToss(c,up); Sound.whoosh&&Sound.whoosh(); });
    /* 종이 눈: 카메라 앞 공간에 화면 가득 */
    if(u>=T_UP&&u<T_SNOW){ const k=1-Math.max(0,(u-4)/(T_SNOW-4)), n=Math.floor((70*k)*dt+Math.random()); if(n>0){ const cp=camera.position, look=new THREE.Vector3(); camera.getWorldDirection(look); look.y=0; look.normalize(); world.paperSnow&&world.paperSnow(cp,look,n); } }
    if(u>=T_END) once('count',()=>{ today++; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount(); figure.armsPose(null); S.cam.zoom=run.zoom0; S.cam.pitchGoal=run.pitch0; });
    if(u>=T_SNOW) run=null;
  }
  function pose(fig){ if(!run) return; const u=S.t-run.t0; if(u<T_END) fig.armsPose(poseAt(u)); }
  function shake(){ return shakeT>0?Math.min(.09,shakeT*.2):0; }
  return {_at:u=>{ if(run){ run.t0=S.t-u; if(u<T_SQZ){ run.ev={}; world.paperShow&&world.paperShow(run.text); } } },   /* 시험용: 특정 순간으로 감기 */tick,pose,shake,open:openBox,begin,close,busy:()=>(!!run&&S.t-run.t0<T_END)||boxOpen,isOpen:()=>!!run};
})();
