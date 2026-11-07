/* ---- 쿵쿵 발 구르기: 지진 방. [쿵!]을 연타할수록 규모가 올라가 땅이 흔들리고, 규모 9.0이면 대지진 ---- */
const Stomp=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_quake_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let best=0; try{ best=+(localStorage.getItem(dayKey())||0); }catch(e){}
  let open_=false, level=0, last=-9, side=1, pt=-9, hitDone=true, cool=0, shakeT=0, n=0, bigT=-9;
  const pad=document.createElement('div'); pad.id='stompPad'; pad.className='tapPad'; pad.hidden=true;
  pad.innerHTML='<p class="pstat">규모 <b class="pm">0.0</b> <span class="pc"></span></p><div class="pbar"><i></i></div><button class="ppunch" type="button">쿵!</button><p class="presult"></p><button class="pill pclose" type="button">그만</button>';
  const pm=pad.querySelector('.pm'), pc=pad.querySelector('.pc'), bar=pad.querySelector('.pbar i'), btn=pad.querySelector('.ppunch'), res=pad.querySelector('.presult');
  btn.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); stomp(); });
  pad.querySelector('.pclose').addEventListener('click',close);
  ['pointerdown','touchstart','wheel'].forEach(k=>pad.addEventListener(k,e=>e.stopPropagation(),{passive:true}));
  window.addEventListener('keydown',e=>{ if(open_&&(e.code==='Space'||e.code==='Enter')){ e.preventDefault(); stomp(); } });
  (document.querySelector('#hud .bottom')||document.body).prepend(pad);
  const showBest=()=>{ res.textContent=best?`오늘 최대 규모 ${best.toFixed(1)}`:'빠르게 누를수록 규모가 올라가요'; };

  function openPad(){ if(open_) return; open_=true; pad.hidden=false; level=0; n=0; showBest(); const m=S.me; m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false; touch(); }
  function close(){ open_=false; pad.hidden=true; level=0; world.setLevel&&world.setLevel(0); Sound.quakeSet&&Sound.quakeSet(0); figure.stomp(S.t,null); }
  function stomp(){
    if(!open_||!hitDone&&S.t-pt<.1) return;
    const now=S.t, fast=now-last<.45; last=now; n++;
    level=Math.min(1,level+(fast?.075:.04)+(fast?.03*level:0));
    side=-side; pt=now; hitDone=false; touch();
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
  }
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt); cool=Math.max(0,cool-dt);
    if(!open_) return;
    /* 발이 땅에 닿는 순간 쿵 */
    if(!hitDone&&S.t-pt>=.13){ hitDone=true; const m=S.me, f=world.groundH?0:0, p=.25+level*.75;
      const fx=m.x+Math.sin(m.heading+side*1.4)*.12, fz=m.z+Math.cos(m.heading+side*1.4)*.12;
      world.stomp&&world.stomp(fx,fz,p); Sound.stomp&&Sound.stomp(p); shakeT=Math.max(shakeT,.18+p*.25);
      try{ navigator.vibrate&&navigator.vibrate(12+Math.round(p*30)); }catch(e){} }
    if(S.t-last>.6) level=Math.max(0,level-dt*(.18+level*.15));
    const M=level*9; pm.textContent=M.toFixed(1); bar.style.width=(level*100)+'%';
    pc.textContent=M>=7?'강진!':M>=5?'흔들흔들':M>=3?'쿵쿵':'';
    world.setLevel&&world.setLevel(level); Sound.quakeSet&&Sound.quakeSet(level);
    if(M>best+.05){ best=M; try{ localStorage.setItem(dayKey(),best.toFixed(1)); }catch(e){} }
    /* 규모 9.0: 대지진 */
    if(level>=.985&&!cool){ cool=4; bigT=S.t; const m=S.me; world.bigQuake&&world.bigQuake(m.x,m.z); Sound.bigQuake&&Sound.bigQuake(); shakeT=2;
      res.textContent='대지진! 규모 9.0'; try{ navigator.vibrate&&navigator.vibrate([60,40,120,40,200]); }catch(e){}
      level=.55; }
    else if(S.t-bigT>3) showBest();
  }
  /* 한 발을 높이 들었다가 쿵 내리찍는다. 주먹 쥔 팔은 아래로 힘껏 */
  function pose(fig){ if(!open_) return; const s=S.t-pt, lift=s<.1?Math.sin(s/.1*Math.PI/2):s<.13?1-(s-.1)/.03:0;
    fig.stomp(S.t,{side,lift:Math.max(0,lift),level}); }
  function shake(){ return shakeT>0?Math.min(.16,shakeT*.08)+level*.02:0; }
  return {tick,pose,shake,open:openPad,close,stomp,busy:()=>open_};
})();
