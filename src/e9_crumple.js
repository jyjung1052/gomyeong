/* ---- 구겨 던지기: 눈사태 방 책상 앞에서 걱정을 종이에 쓰고, [구기기!]를 연타해 구긴 뒤, [던지기!]로 비탈 아래로 ---- */
const Crumple=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_aval_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let today=0; try{ today=+(localStorage.getItem(dayKey())||0); }catch(e){}
  const NEED=8;                                   // 이만큼 누르면 다 구겨진다
  let active=null, sel=null, shakeT=0, rest=0;
  const box=document.createElement('div'); box.id='crumpleBox'; box.className='yellbox actbox'; box.hidden=true;
  box.innerHTML='<div class="yhead"><p class="yq">뭘 구겨 버릴까요?</p><p class="ycount"></p></div><div class="ych"></div><form class="yrow"><input maxlength="12" placeholder="걱정 쓰기 (안 써도 돼요)" aria-label="종이에 쓸 걱정"><button class="pill sit ygo" type="submit">종이에 쓰기</button></form>';
  const cnt=box.querySelector('.ycount'), chips=box.querySelector('.ych'), form=box.querySelector('.yrow'), inp=form.querySelector('input');
  AV_WORRY.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='pill ychip'; b.textContent=t;
    b.addEventListener('click',()=>{ sel=sel===t?null:t; chips.querySelectorAll('.ychip').forEach(x=>x.classList.toggle('on',x.textContent===sel)); }); chips.appendChild(b); });
  form.addEventListener('submit',e=>{ e.preventDefault(); inp.blur(); start(); });
  /* 구기기·던지기 판 */
  const pad=document.createElement('div'); pad.id='crumplePad'; pad.className='tapPad'; pad.hidden=true;
  pad.innerHTML='<div class="pbar"><i></i></div><button class="ppunch" type="button">구기기!</button><p class="presult"></p>';
  const bar=pad.querySelector('.pbar i'), btn=pad.querySelector('.ppunch'), res=pad.querySelector('.presult');
  btn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); press(); });
  ['pointerdown','touchstart','wheel'].forEach(k=>{ box.addEventListener(k,e=>e.stopPropagation(),{passive:true}); pad.addEventListener(k,e=>e.stopPropagation(),{passive:true}); });
  window.addEventListener('keydown',e=>{ if(active&&(active.phase==='knead'||active.phase==='ready')&&(e.code==='Space'||e.code==='Enter')){ e.preventDefault(); press(); } });
  const bottom=document.querySelector('#hud .bottom')||document.body; bottom.prepend(box); bottom.prepend(pad);
  const spot=()=>(S.mode==='scene'&&world.crumpleSpot)?world.crumpleSpot(S.me.x,S.me.z):-1;
  const showCount=()=>{ cnt.textContent=today?`오늘 ${today}개 굴려 보냄`:''; cnt.hidden=!today; };
  showCount();

  function start(){
    if(active) return; const i=spot(); if(i<0) return;
    const m=S.me; m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false; m.heading=world.deskFace(i).heading;
    const text=inp.value.trim()||sel||''; inp.value='';
    world.paperSet(i,text);
    active={i,phase:'knead',n:0,pt:-9,t0:S.t};
    btn.textContent='구기기!'; btn.hidden=false; res.textContent='와작와작 구겨 주세요'; bar.style.width='0%';
    box.hidden=true; pad.hidden=false; touch();
  }
  function press(){
    const a=active; if(!a) return;
    if(a.phase==='knead'){
      a.n++; a.pt=S.t; world.paperCrumple(a.i,Math.min(1,a.n/NEED)); Sound.crumple&&Sound.crumple(); bar.style.width=Math.min(100,a.n/NEED*100)+'%';
      btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
      if(a.n>=NEED){ a.phase='ready'; btn.textContent='던지기!'; res.textContent='다 구겼어요. 비탈 아래로 힘껏!'; }
    }else if(a.phase==='ready'){ a.phase='throw'; a.tT=S.t; btn.hidden=true; res.textContent=''; }
    touch();
  }
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt); rest=Math.max(0,rest-dt);
    const m=S.me, a=active;
    if(a){
      if(a.phase==='throw'){ const u=(S.t-a.tT)/.8;
        /* 던진 뒤엔 카메라가 멀찍이 물러나 내려다보며 굴러가는 눈덩이를 따라간다 */
        if(a.thrown){ const p=world.ballPos&&world.ballPos(); if(p) S.camFocus={x:p.x,y:p.y,z:p.z};
          S.cam.zoom+=(2.6-S.cam.zoom)*Math.min(1,dt*1.5); S.cam.pitchGoal=.5;
          const ya=Math.atan2(-a.dir.x,-a.dir.z); S.cam.yaw+=angDiff(S.cam.yaw,ya)*Math.min(1,dt*2); }
        if(u>=.52&&!a.thrown){ a.thrown=true; figure.root.updateMatrixWorld(true);
          a.dir=(()=>{ const f=world.deskFace(a.i); return {x:Math.sin(f.heading),z:Math.cos(f.heading)}; })();
          world.launch(a.i,figure.rightHand(),()=>{ Sound.avalanche&&Sound.avalanche(); shakeT=1.6; res.textContent='와르르르!';
            today++; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount(); a.tEnd=S.t; });
          Sound.whoosh&&Sound.whoosh(); res.textContent='데굴데굴…'; }
        if(u>=1&&!a.posed){ a.posed=true; figure.crumple(S.t,null); }
        if(a.tEnd&&S.t-a.tEnd>3.6||S.t-a.tT>18){ pad.hidden=true; active=null; rest=.6; S.camFocus=null; S.cam.zoom=1; S.cam.pitchGoal=world.pitch||.32; }
      }
    }
    const show=!active&&!rest&&!S.busy&&spot()>=0&&!m.walking;
    if(show&&world.deskFace){ const f=world.deskFace(spot()); m.heading+=angDiff(m.heading,f.heading)*(1-Math.exp(-8*dt)); }
    box.hidden=!show;
  }
  function pose(fig){
    const a=active; if(!a) return;
    if(a.phase==='knead'||a.phase==='ready'){ const since=S.t-a.pt; fig.crumple(S.t,{mode:'knead',k:since<.25?Math.sin(since/.25*Math.PI):(a.phase==='ready'?.2:0)}); }
    else if(a.phase==='throw'&&!a.posed) fig.crumple(S.t,{mode:'throw',u:Math.min(1,(S.t-a.tT)/.8)});
  }
  function shake(){ return shakeT>0?Math.min(.08,.05*shakeT):0; }
  return {tick,pose,shake,start,press,busy:()=>!!active&&(active.phase!=='throw'||!active.posed)};
})();
