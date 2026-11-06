/* ---- 베개 펀치: 우박 방에서 매달린 베개 앞에 서면 "베개 때릴까요?"가 뜬다. 10초 동안 [퍽!]을 연타한다 ---- */
const Punch=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_punch_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let today=0; try{ today=+(localStorage.getItem(dayKey())||0); }catch(e){}
  const TIME=10;
  let active=null, shakeT=0, rest=0;
  const box=document.createElement('div'); box.id='punchBox'; box.className='yellbox actbox'; box.hidden=true;
  box.innerHTML='<div class="yhead"><p class="yq">베개 때릴까요?</p><p class="ycount"></p></div><p class="yhint">10초 동안 [퍽!]을 마구 누르세요</p><form class="yrow"><input maxlength="12" placeholder="이름표 (안 써도 돼요)" aria-label="베개에 붙일 이름"><button class="pill sit ygo" type="submit">네, 때릴래요!</button></form>';
  const cnt=box.querySelector('.ycount'), form=box.querySelector('.yrow'), inp=form.querySelector('input');
  form.addEventListener('submit',e=>{ e.preventDefault(); inp.blur(); start(); });
  /* 연타 판: 남은 시간 막대, 때린 수와 콤보, 커다란 [퍽!] */
  const pad=document.createElement('div'); pad.id='punchPad'; pad.hidden=true;
  pad.innerHTML='<div class="pbar"><i></i></div><p class="pstat"><b class="pn">0</b>대 <span class="pc"></span></p><button class="ppunch" type="button">퍽!</button><p class="presult"></p>';
  const bar=pad.querySelector('.pbar i'), pn=pad.querySelector('.pn'), pc=pad.querySelector('.pc'), btn=pad.querySelector('.ppunch'), res=pad.querySelector('.presult');
  btn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); hit(); });
  ['pointerdown','touchstart','wheel'].forEach(k=>{ box.addEventListener(k,e=>e.stopPropagation(),{passive:true}); pad.addEventListener(k,e=>e.stopPropagation(),{passive:true}); });
  window.addEventListener('keydown',e=>{ if(active&&active.phase==='go'&&(e.code==='Space'||e.code==='Enter')){ e.preventDefault(); hit(); } });
  const bottom=document.querySelector('#hud .bottom')||document.body; bottom.prepend(box); bottom.prepend(pad);
  const spot=()=>(S.mode==='scene'&&world.punchSpot)?world.punchSpot(S.me.x,S.me.z):-1;
  const showCount=()=>{ cnt.textContent=today?`오늘 ${today}대`:''; cnt.hidden=!today; };
  showCount();

  function start(){
    if(active) return; const i=spot(); if(i<0) return;
    const m=S.me; m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false; m.heading=world.bagFace(i).heading;
    world.setNote(i,inp.value.trim()); inp.value='';
    active={i,phase:'go',t0:S.t,n:0,combo:0,best:0,last:-9,side:1,pt:-9,up:0,tEnd:0,move:'jab'};
    pn.textContent='0'; pc.textContent=''; res.textContent=''; btn.hidden=false; bar.style.width='100%';
    box.hidden=true; pad.hidden=false; touch();
  }
  function hit(){
    const a=active; if(!a||a.phase!=='go') return;
    const now=S.t; a.combo=now-a.last<.5?a.combo+1:1; a.last=now; a.best=Math.max(a.best,a.combo); a.n++;
    a.side=-a.side; a.pt=now;
    /* 매번 다른 기술: 주먹 뻗기·훅·팔꿈치·앞차기·돌려차기를 섞어 마구 */
    const r=Math.random(); a.move=r<.3?'jab':r<.52?'hook':r<.7?'elbow':r<.86?'fkick':'rkick';
    const kick=a.move==='fkick'||a.move==='rkick';
    const power=Math.min(1.8,(kick?1:.75)+a.combo*.05);
    world.punch(a.i,a.side,power,a.combo,a.move); Sound.punch&&Sound.punch(kick?power*1.3:power); shakeT=kick?.16:.1;
    pn.textContent=a.n; pc.textContent=a.combo>=3?`${a.combo} 콤보!`:''; touch();
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  }
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt); rest=Math.max(0,rest-dt);
    const m=S.me, a=active;
    if(a){
      const u=S.t-a.t0;
      if(a.phase==='go'){ bar.style.width=Math.max(0,100*(1-u/TIME))+'%';
        if(S.t-a.last>.5&&a.combo) { a.combo=0; pc.textContent=''; }
        if(u>=TIME){ a.phase='up'; a.tUp=S.t; btn.hidden=true; } }
      else if(a.phase==='up'){ a.up=(S.t-a.tUp)/.7;
        if(a.up>=.55&&!a.fin){ a.fin=true; world.finale(a.i); Sound.punch&&Sound.punch(2.2); Sound.whoosh&&Sound.whoosh(); shakeT=.5;
          today+=a.n; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount();
          res.textContent=`${a.n}대 때렸어요!`+(a.best>=3?` 최고 ${a.best} 콤보`:''); }
        if(a.up>=1){ a.phase='done'; a.tDone=S.t; figure.punch(S.t,null); } }
      else if(a.phase==='done'){ if(S.t-a.tDone>2.6){ pad.hidden=true; world.setNote(a.i,''); active=null; rest=.8; } }
    }
    const show=!active&&!rest&&!S.busy&&spot()>=0&&!m.walking;
    if(show&&world.bagFace){ const f=world.bagFace(spot()); m.heading+=angDiff(m.heading,f.heading)*(1-Math.exp(-8*dt)); }
    box.hidden=!show;
  }
  function pose(fig){
    const a=active; if(!a||a.phase==='done') return;
    const dur=a.move==='fkick'||a.move==='rkick'?.32:.22, since=S.t-a.pt, x=since/dur, k=x<1?(x<.35?Math.sin(x/.35*Math.PI/2):Math.cos((x-.35)/.65*Math.PI/2)):0;   /* 빠르게 뻗고 조금 천천히 거둔다 */
    fig.punch(S.t,{move:a.move,side:a.side,k,up:a.phase==='up'?a.up:0});
  }
  function shake(){ return shakeT>0?Math.min(.1,.2*shakeT):0; }
  return {tick,pose,shake,start,hit,busy:()=>!!active&&active.phase!=='done'};
})();
