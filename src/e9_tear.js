/* ---- 종이 찢기: 눈사태(뒷마당) 방. [촤!]를 한 번 누를 때마다 딱 한 번 찢는다. 모두 10번.
   1~9번: 양손을 바깥으로 쫙 벌리며 촤! — 누를 때마다 조각이 더 많고 잘게
   10번: 파촤!!! 만세와 함께 모든 조각이 하늘로 터지고 → 종이 눈이 뒷마당 가득 내려앉는다 ---- */
const Tear=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_tear_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let today=0; try{ today=+(localStorage.getItem(dayKey())||0); }catch(e){}
  let boxOpen=false, sel=null;
  /* 1) 무엇을 찢을지 고르는 상자 */
  const box=document.createElement('div'); box.id='tearBox'; box.className='yellbox actbox'; box.hidden=true;
  box.innerHTML='<div class="yhead"><p class="yq">무엇을 찢어 버릴까요?</p><p class="ycount"></p></div><div class="ych"></div><form class="yrow"><input maxlength="12" placeholder="걱정 쓰기 (안 써도 돼요)" aria-label="종이에 쓸 걱정"><button class="pill sit ygo" type="submit">찢기 시작</button></form><button class="pill ycancel" type="button">닫기</button>';
  const cnt=box.querySelector('.ycount'), chips=box.querySelector('.ych'), form=box.querySelector('.yrow'), inp=form.querySelector('input');
  AV_WORRY.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='pill ychip'; b.textContent=t;
    b.addEventListener('click',()=>{ sel=sel===t?null:t; chips.querySelectorAll('.ychip').forEach(x=>x.classList.toggle('on',x.textContent===sel)); }); chips.appendChild(b); });
  form.addEventListener('submit',e=>{ e.preventDefault(); inp.blur(); begin(inp.value.trim()||sel||''); inp.value=''; });
  box.querySelector('.ycancel').addEventListener('click',()=>{ boxOpen=false; box.hidden=true; });
  /* 2) 찢기 판: n / 10, 커다란 [촤!] */
  const pad=document.createElement('div'); pad.id='tearPad'; pad.className='tapPad'; pad.hidden=true;
  pad.innerHTML='<p class="pstat"><b class="pn">0</b> / 10 <span class="pc"></span></p><div class="pbar"><i></i></div><button class="ppunch" type="button">촤!</button><p class="presult"></p><button class="pill pclose" type="button">그만</button>';
  const pn=pad.querySelector('.pn'), pc=pad.querySelector('.pc'), bar=pad.querySelector('.pbar i'), btn=pad.querySelector('.ppunch'), res=pad.querySelector('.presult'), pcl=pad.querySelector('.pclose');
  btn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); tap(); });
  pcl.addEventListener('click',close);
  ['pointerdown','touchstart','wheel'].forEach(k=>{ box.addEventListener(k,e=>e.stopPropagation(),{passive:true}); pad.addEventListener(k,e=>e.stopPropagation(),{passive:true}); });
  window.addEventListener('keydown',e=>{ if(run&&run.phase==='tear'&&(e.code==='Space'||e.code==='Enter')&&document.activeElement!==inp){ e.preventDefault(); tap(); } });
  const bottom=document.querySelector('#hud .bottom')||document.body; bottom.prepend(box); bottom.prepend(pad);
  const showCount=()=>{ cnt.textContent=today?`오늘 ${today}장 찢음`:''; cnt.hidden=!today; }; showCount();

  const N=10, DUR=.3;                                     /* 한 번 찢는 동작 길이(초) */
  const COUNT=[2,3,4,6,8,11,14,18,24];                     /* k번째 찢은 뒤 손에 남은 조각 수 */
  const SIZE=k=>.3*Math.pow(.08/.3,(k-1)/8);               /* 조각 크기: .3 → .08 */
  /* 마지막 파촤!!! 시간표 */
  const F_GATHER=.16, F_BURST=.3, F_UP=.36, F_REL=1.25, F_END=1.7, F_SNOW=5.4, F_DONE=6.6;
  let run=null, shakeT=0;
  const ease=x=>x<=0?0:x>=1?1:x*x*(3-2*x), easeIn=x=>x<=0?0:x>=1?1:x*x*x, easeOut=x=>x<=0?0:x>=1?1:1-Math.pow(1-x,3);
  const L=(a,b,k)=>a+(b-a)*k;
  const REST={lx:0,lz:0,lf:0,rx:0,rz:0,rf:0,lean:0,head:0,mouth:0,brow:0};
  const HOLD={lx:-1.15,lz:-.58,lf:-.3,rx:-1.15,rz:.58,rf:-.3,lean:.05,head:.12,mouth:0,brow:.15};
  const PINCH={lx:-1.18,lz:-.3,lf:-.48,rx:-1.18,rz:.3,rf:-.48,lean:.1,head:.16,mouth:.2,brow:.4,eyes:'shut'};
  const PULL={lx:-1.06,lz:-1.2,lf:-.08,rx:-1.06,rz:1.2,rf:-.08,lean:-.02,head:.04,mouth:.95,brow:.5};
  const WIDE={lx:-1.12,lz:-.82,lf:-.22,rx:-1.12,rz:.82,rf:-.22,lean:.04,head:.1,mouth:.15,brow:.2};
  const CLAP={lx:-1.2,lz:.5,lf:-.62,rx:-1.2,rz:-.5,rf:-.62,lean:.16,head:.18,mouth:.3,brow:.45,eyes:'shut'};
  const UP={lx:-2.95,lz:-.38,lf:-.12,rx:-2.95,rz:.38,rf:-.12,lean:-.16,head:-.4,mouth:1.15,brow:0};
  const mix=(A,B,k)=>{ const o={}; for(const key in A){ if(typeof A[key]==='number') o[key]=L(A[key],B[key]??A[key],k); } o.eyes=k<.5?A.eyes:B.eyes; return o; };
  /* 한 번 찢기: 살짝 모아 쥐고(.09) → 바깥으로 쫙(.1) → 넓게 잡은 채로 숨 고르기 */
  function tearPose(s,base){
    if(s<.09) return mix(base,PINCH,easeIn(s/.09));
    if(s<.19) return mix(PINCH,PULL,easeOut((s-.09)/.1));
    return mix(PULL,WIDE,ease((s-.19)/(DUR-.19)));
  }
  function finalPose(s){
    if(s<F_GATHER) return mix(WIDE,CLAP,easeIn(s/F_GATHER));          /* 마지막으로 꽉 모아 쥐고 */
    if(s<F_UP) return mix(CLAP,UP,easeOut((s-F_GATHER)/(F_UP-F_GATHER)));   /* 만세! */
    if(s<F_REL) return UP;
    return mix(UP,REST,ease((s-F_REL)/(F_END-F_REL)));
  }
  function poseNow(){
    const r=run; if(!r) return null; const u=S.t-r.t0;
    if(r.phase==='final'){ const s=S.t-r.tF; return s<F_END?finalPose(s):null; }
    if(r.phase!=='tear') return null;
    if(u<.3&&r.k===0) return mix(REST,HOLD,ease(u/.3));
    const s=S.t-r.tk; if(r.k>0&&s<DUR) return tearPose(s,r.k===1?HOLD:WIDE);
    return r.k===0?HOLD:WIDE;
  }
  function updPad(){ pn.textContent=run?run.k:0; bar.style.width=((run?run.k:0)*10)+'%';
    btn.textContent=run&&run.k>=N-1?'파촤!!!':'촤!'; btn.classList.toggle('final',!!run&&run.k>=N-1);
    pc.textContent=!run?'':run.k>=N-1?'마지막!':run.k>=6?'잘게잘게':run.k>=3?'촤촤!':''; }
  function begin(t){
    boxOpen=false; box.hidden=true;
    const m=S.me; if(m.sitting) setSit(false); m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false;
    m.heading=S.cam.yaw;                                    /* 카메라 쪽을 보고 선다: 손과 종이가 잘 보이게 */
    run={t0:S.t,text:t,phase:'tear',k:0,tk:-9,pend:0,zoom0:S.cam.zoom,pitch0:S.cam.pitchGoal};
    world.paperShow&&world.paperShow(t);
    pad.hidden=false; S.camDrop=.75; btn.hidden=false; pcl.hidden=false; res.textContent='누를 때마다 한 번씩 찢어요'; updPad(); touch();
  }
  /* 한 번 누름 = 한 번 찢기. 동작 중에 누른 것은 차례로 이어서 찢는다 */
  function tap(){
    const r=run; if(!r||r.phase!=='tear'||r.k+r.pend>=N) return;
    if(S.t-r.t0<.3||(r.k>0&&S.t-r.tk<DUR*.62)){ r.pend++; return; }
    go();
  }
  function go(){
    const r=run; r.pend=Math.max(0,r.pend-1); r.k++; touch();
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    if(r.k<N){ r.tk=S.t; r.ripped=false; }
    else { r.phase='final'; r.tF=S.t; r.ev={}; btn.hidden=true; pcl.hidden=true; }
    updPad();
  }
  function close(){
    if(!run) return; world.paperHide&&world.paperHide(); world.heldRelease&&world.heldRelease();
    figure.armsPose(null); if(!run.restored){ S.cam.zoom=run.zoom0; S.cam.pitchGoal=run.pitch0; }
    run=null; pad.hidden=true; S.camDrop=0;
  }
  function openBox(){ if(run) return; boxOpen=true; box.hidden=false; touch(); }
  const once=(k,f)=>{ if(!run.ev[k]){ run.ev[k]=true; f(); } };
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt);
    if(!boxOpen) box.hidden=true;
    const r=run; if(!r) return;
    if(r.phase==='tear'&&r.pend>0&&r.k<N&&(S.t-r.t0>=.3)&&(r.k===0||S.t-r.tk>=DUR*.62)) go();
    const fin=r.phase==='final'||r.phase==='snow', s=fin?S.t-r.tF:0;
    if(!r.restored){ S.cam.zoom+=((fin&&s>=F_UP?.9:.62)-S.cam.zoom)*Math.min(1,dt*3); S.cam.pitchGoal=fin&&s>=F_UP?.05:.16; }
    figure.root.updateMatrixWorld(true);
    const hl=figure.leftHand(), hr=figure.rightHand(), up=new THREE.Vector3(0,1,0), mid=hl.clone().add(hr).multiplyScalar(.5), side=hr.clone().sub(hl).normalize();
    if(r.phase==='tear'){
      const sk=S.t-r.tk;
      if(r.k===0||(r.k===1&&!r.ripped)) world.paperPose&&world.paperPose(hl,hr,up,r.k===1?Math.min(.45,easeIn(Math.min(1,sk/.09))*.45):0,0);   /* 처음 한 장 */
      else world.heldPose&&world.heldPose(hl,hr,up,sk<.09);
      /* 손이 바깥으로 쫙 벌어지는 순간 촤! */
      if(r.k>0&&!r.ripped&&sk>=.12){ r.ripped=true; const k=r.k, n=COUNT[k-1], size=SIZE(k);
        if(k===1) world.paperHide&&world.paperHide();
        world.heldSet&&world.heldSet(n,size); world.heldPose&&world.heldPose(hl,hr,up,0);
        world.heldCrumbs&&world.heldCrumbs(mid,side,up,5+k*3,size*.55);           /* 떨어진 부스러기는 마당에 쌓인다 */
        const v=Math.min(1,.55+k*.05); Sound.rip&&Sound.rip(v); setTimeout(()=>Sound.rip&&Sound.rip(Math.min(1,v+.08)),40);
        shakeT=Math.max(shakeT,.14+k*.02); try{ navigator.vibrate&&navigator.vibrate(10+k*3); }catch(e){} }
      return;
    }
    if(r.phase==='final'&&s<F_BURST) world.heldPose&&world.heldPose(hl,hr,up,1);
    if(s>=F_GATHER-.02) once('crush',()=>{ Sound.crumple&&Sound.crumple(); shakeT=Math.max(shakeT,.12); });
    /* 파촤!!!: 만세와 함께 전부 하늘로 폭발 */
    if(s>=F_BURST) once('burst',()=>{ const c=mid.clone(); c.y+=.15;
      world.heldRelease&&world.heldRelease(up); world.paperShred&&world.paperShred(c,side,up,160); world.paperToss&&world.paperToss(c,up);
      Sound.pop&&Sound.pop(); [0,25,50,75,100,125,150].forEach((ms,i)=>setTimeout(()=>Sound.rip&&Sound.rip(Math.min(1,.82+i*.03)),ms));
      setTimeout(()=>{ Sound.rip&&Sound.rip(1); Sound.rip&&Sound.rip(1); Sound.whoosh&&Sound.whoosh(); },180);
      shakeT=.75; pc.textContent='파촤!!!'; try{ navigator.vibrate&&navigator.vibrate([30,20,30,20,40,20,120]); }catch(e){} });
    /* 종이 눈: 카메라 앞 마당 가득 */
    if(s>=F_UP&&s<F_SNOW){ const k=1-Math.max(0,(s-(F_SNOW-1.4))/1.4), n=Math.floor((130*k)*dt+Math.random()); if(n>0){ const cp=camera.position, look=new THREE.Vector3(); camera.getWorldDirection(look); look.y=0; look.normalize(); world.paperSnow&&world.paperSnow(cp,look,n); } }
    if(s>=F_END) once('count',()=>{ today++; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount();
      figure.armsPose(null); S.cam.zoom=r.zoom0; S.cam.pitchGoal=r.pitch0; r.restored=true; r.phase='snow';
      res.textContent=`10번 다 찢었어요! 오늘 ${today}장`; });
    if(s>=F_DONE){ run=null; pad.hidden=true; S.camDrop=0; }
  }
  function pose(fig){ const p=poseNow(); if(p) fig.armsPose(p); }
  function shake(){ return shakeT>0?Math.min(.1,shakeT*.2):0; }
  return {tick,pose,shake,open:openBox,begin,close,tap,count:()=>run?run.k:0,
    busy:()=>(!!run&&run.phase!=='snow')||boxOpen,isOpen:()=>!!run};
})();
