/* ---- 소리치기: 우레(대나무숲) 데크에 서면 "소리 지를까요?"가 뜬다.
   처음엔 온 힘을 짜내는 "으아아아악!", 두 번째부터는 외칠 말을 고른다(직접 써도 된다). ---- */
const Yell=(()=>{
  const SHOUTS=['으아아아아악!!!','아아아아악!!!!!!','시베리아에서 귤이나 까라!!!','월요일 싫어!!!','다 때려치울 거야!!!'];
  let count=0; try{ count=+(localStorage.getItem('gomyeong3d_yells')||0); }catch(e){}
  let active=null;                              // {t0,build,dur,text,fired}
  const box=document.createElement('div'); box.id='yellBox'; box.className='yellbox'; box.hidden=true;
  box.innerHTML='<p class="yq"></p><div class="ych"></div><form class="yme"><input maxlength="24" placeholder="직접 써서 외치기" aria-label="외칠 말"><button class="pill" type="submit">외치기</button></form><button class="pill sit ygo" type="button">네, 지를래요!</button>';
  const q=box.querySelector('.yq'), chips=box.querySelector('.ych'), form=box.querySelector('.yme'), inp=form.querySelector('input'), go=box.querySelector('.ygo');
  SHOUTS.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='pill ychip'; b.textContent=t; b.addEventListener('click',()=>pick(t)); chips.appendChild(b); });
  /* 두 번째부터는 외칠 말을 골라 두고, 큰 "네, 지를래요!" 버튼으로 지른다 */
  let sel=SHOUTS[0];
  function pick(t){ sel=t; chips.querySelectorAll('.ychip').forEach(b=>b.classList.toggle('on',b.textContent===t)); }
  pick(SHOUTS[0]);
  /* 처음엔 묻지 않고 바로 '아아악!'. 한 번 지르고 나면 외칠 말을 고르거나 쓸 수 있는 칸이 열린다 */
  let opened=false;
  go.addEventListener('click',()=>start(opened?sel:SHOUTS[0]));
  form.addEventListener('submit',e=>{ e.preventDefault(); const t=inp.value.trim(); if(t){ start(/[!]$/.test(t)?t:t+'!!!'); inp.value=''; inp.blur(); } });
  ['pointerdown','touchstart','wheel'].forEach(k=>box.addEventListener(k,e=>e.stopPropagation(),{passive:true}));
  (document.querySelector('#hud .bottom')||document.body).prepend(box);

  const pureScream=t=>/^[으아악앙이야와우워어억끄캬꺄ㅏㅡ!~.\s]+$/.test(t);
  /* 윽박지르기: 그냥 읽지 않고 한 마디씩 끊어서, 갈수록 빠르고 높게 몰아붙인 뒤 마지막에 진짜 고함을 붙인다 */
  function speak(text){
    let done=false; const tail=()=>{ if(done) return; done=true; Sound.scream&&Sound.scream(.85); if(world.shout) world.shout(1.2); shakeBoost=.9; };
    try{
      if(!window.speechSynthesis||pureScream(text)) return;
      const words=text.replace(/[!?.~]+/g,' ').trim().split(/\s+/).filter(Boolean);
      const v=speechSynthesis.getVoices().find(v=>/ko/i.test(v.lang));
      speechSynthesis.cancel();
      words.forEach((w,i)=>{
        const k=words.length>1?i/(words.length-1):1;
        const u=new SpeechSynthesisUtterance(w+'!'); u.lang='ko-KR'; if(v) u.voice=v;
        u.rate=Math.min(1.6,1.2+.35*k); u.pitch=Math.min(2,1.35+.6*k); u.volume=1;
        if(i===words.length-1) u.onend=tail;
        speechSynthesis.speak(u);
      });
      setTimeout(tail,900+text.length*190);   // 말이 끝났다는 알림이 안 와도(아이폰 등) 고함은 붙인다
    }catch(e){ tail(); }
  }
  let shakeBoost=0;
  function start(text){
    if(active||S.mode!=='scene'||!world.yellSpot) return;
    const m=S.me; if(m.sitting) setSit(false);
    m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false;
    try{ if(window.speechSynthesis){ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); } }catch(e){}   // 아이폰: 손가락으로 누른 순간에 말소리 길을 열어 둔다
    const build=.05; let dur=Math.min(5,2.3+text.length*.07+Math.random()*.8);   // 참는 몸짓 없이 곧바로 터뜨린다
    const real=Sound.shout(build,dur,!pureScream(text));   // 녹음 고함이면 그 길이에 몸짓을 맞춘다
    if(real&&pureScream(text)) dur=Math.max(1.1,real+.3);
    if(!pureScream(text)) dur=Math.min(7,2.4+text.length*.22);   // 한 마디씩 윽박지르는 동안 몸짓을 이어 간다
    active={t0:S.t,build,dur,text,fired:false};
    count++; opened=true; try{ localStorage.setItem('gomyeong3d_yells',String(count)); }catch(e){}
    box.hidden=true; touch();
  }
  /* 외친 말이 큰 글씨로 솟아오르고, 메아리처럼 여러 겹으로 흩어진다 */
  const floats=[];
  function textSprite(text,size){
    const tex=canvasTex(1024,256,(g,w,h)=>{
      g.clearRect(0,0,w,h); g.textAlign='center'; g.textBaseline='middle';
      let fs=150; g.font=`700 ${fs}px "Gowun Batang","Apple SD Gothic Neo",serif`;
      while(g.measureText(text).width>w-40&&fs>40){ fs-=8; g.font=`700 ${fs}px "Gowun Batang","Apple SD Gothic Neo",serif`; }
      g.lineWidth=fs*.16; g.strokeStyle='rgba(30,26,20,.85)'; g.strokeText(text,w/2,h/2);
      g.fillStyle='#fffbe8'; g.fillText(text,w/2,h/2);
    });
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false,fog:false}));
    sp.scale.set(size*4,size,1); sp.renderOrder=20; return sp;
  }
  function burst(text){
    const m=S.me, y=footPose(m.x,m.z).y;
    [[0,1.3,0,0,1],[.45,1,-1,.6,.55],[.9,.8,1,.9,.35],[1.35,.65,-.4,1.4,.22]].forEach(([delay,size,dx,dz,op])=>{
      const sp=textSprite(text,size); sp.position.set(m.x,y+2.4,m.z); sp.material.opacity=0; scene.add(sp);
      floats.push({sp,age:-delay,op,dx,dz,size});
    });
  }
  function tick(dt){
    for(let i=floats.length-1;i>=0;i--){
      const f=floats[i]; f.age+=dt; if(f.age<0) continue;
      const k=f.age/3.6; if(k>=1){ scene.remove(f.sp); f.sp.material.map.dispose(); f.sp.material.dispose(); floats.splice(i,1); continue; }
      f.sp.position.y+=dt*(1.2+k*1.5); f.sp.position.x+=dt*f.dx*1.4; f.sp.position.z+=dt*f.dz*1.4;
      const g=1+k*.9; f.sp.scale.set(f.size*4*g,f.size*g,1);
      f.sp.material.opacity=f.op*(k<.1?k/.1:1-Math.pow((k-.1)/.9,1.6));
    }
    const m=S.me;
    if(active){
      const u=S.t-active.t0;
      if(!active.fired&&u>=active.build){ active.fired=true; speak(active.text); burst(active.text); if(world.shout) world.shout(1,m.x,m.z); }
      if(u>active.build+active.dur+.4){ active=null; figure.yell(S.t,null,0); }
    }
    const show=!active&&S.mode==='scene'&&!S.busy&&world.yellSpot&&world.yellSpot(m.x,m.z)&&!m.walking;
    if(show&&box.hidden){
      q.textContent=opened?'또 지를까요? 외칠 말을 골라도 돼요':'소리 지를까요?';
      chips.hidden=!opened; form.hidden=!opened; go.hidden=false;
    }
    box.hidden=!show;
  }
  /* 몸짓: 꾹 참으며 몸부림 → 온 힘을 다해 터뜨림 */
  function pose(fig){
    if(!active) return;
    const u=S.t-active.t0;
    if(u<active.build) fig.yell(S.t,'build',u/active.build);
    else fig.yell(S.t,'yell',Math.min(1,(u-active.build)/active.dur));
  }
  /* 고함칠 때 카메라도 함께 떨린다 */
  function shake(){
    if(shakeBoost>0){ shakeBoost=Math.max(0,shakeBoost-.016); return .06*shakeBoost; }
    if(!active) return 0;
    const u=S.t-active.t0;
    return u<active.build?.012*u/active.build:(u<active.build+active.dur?.05*(1-(u-active.build)/active.dur):0);
  }
  return {tick,pose,shake,start,busy:()=>!!active};
})();
