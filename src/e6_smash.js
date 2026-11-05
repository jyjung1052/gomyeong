/* ---- 와장창: 벼락 방 작업대 앞에 서면 "부숴 볼까요?"가 뜬다. 물건을 고르고(이름표도 붙일 수 있다) 망치로 내리친다 ---- */
const Smash=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_smash_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let today=0; try{ today=+(localStorage.getItem(dayKey())||0); }catch(e){}
  let active=null, sel=null, shakeT=0, rest=0;   // rest: 부순 뒤 파편이 흩어지는 걸 볼 수 있게 잠깐 상자를 숨긴다
  const box=document.createElement('div'); box.id='smashBox'; box.className='yellbox'; box.hidden=true;
  box.innerHTML='<div class="yhead"><p class="yq">부숴 볼까요?</p><p class="ycount"></p></div><div class="ych"></div><form class="yrow"><input maxlength="12" placeholder="이름표 (안 써도 돼요)" aria-label="물건에 붙일 이름"><button class="pill sit ygo" type="submit">네, 부술래요!</button></form>';
  const cnt=box.querySelector('.ycount'), chips=box.querySelector('.ych'), form=box.querySelector('.yrow'), inp=form.querySelector('input'), go=box.querySelector('.ygo');
  SMASH_KINDS.forEach(k=>{ const b=document.createElement('button'); b.type='button'; b.className='pill ychip'; b.textContent=k.name; b.dataset.k=k.id;
    b.addEventListener('click',()=>pick(sel===k.id?null:k.id)); chips.appendChild(b); });
  function pick(id){ sel=id; chips.querySelectorAll('.ychip').forEach(b=>b.classList.toggle('on',b.dataset.k===id));
    const i=spot(); if(id&&i>=0&&world.setBench) world.setBench(i,id,inp.value.trim()); }
  form.addEventListener('submit',e=>{ e.preventDefault(); inp.blur(); start(); });
  ['pointerdown','touchstart','wheel'].forEach(k=>box.addEventListener(k,e=>e.stopPropagation(),{passive:true}));
  (document.querySelector('#hud .bottom')||document.body).prepend(box);
  const spot=()=>(S.mode==='scene'&&world.smashSpot)?world.smashSpot(S.me.x,S.me.z):-1;
  const showCount=()=>{ cnt.textContent=today?`오늘 ${today}개 부쉈어요`:''; cnt.hidden=!today; };
  showCount();

  function start(){
    if(active) return; const i=spot(); if(i<0) return;
    const m=S.me; if(m.sitting) setSit(false);
    const f=world.benchFace(i); m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false; m.heading=f.heading;
    const label=inp.value.trim();
    if(sel||label) world.setBench(i,sel||world.benchKind(i),label);
    inp.value='';
    active={t0:S.t,dur:1.5,i,hit:false};
    box.hidden=true; touch();
  }
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt); rest=Math.max(0,rest-dt);
    const m=S.me;
    if(active){
      const u=(S.t-active.t0)/active.dur;
      if(!active.hit&&u>=.62){
        active.hit=true; const snd=world.smash(active.i); if(snd) Sound.smash(snd);
        shakeT=.5; today++; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount();
      }
      if(u>=1){ active=null; figure.smash(S.t,null); rest=1.2; }
    }
    const show=!active&&!rest&&!S.busy&&spot()>=0&&!m.walking;
    box.hidden=!show;
  }
  function pose(fig){ if(active) fig.smash(S.t,Math.min(1,(S.t-active.t0)/active.dur)); }
  function shake(){ return shakeT>0?.14*shakeT/.5:0; }
  return {tick,pose,shake,start,busy:()=>!!active};
})();
