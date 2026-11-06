/* ---- 이불킥: 용오름 방 침대 옆에 서면 "이불킥 할까요?"가 뜬다. 흑역사를 고르면 누워서 이불을 뻥뻥 찬다 ---- */
const Kick=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_kick_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let today=0; try{ today=+(localStorage.getItem(dayKey())||0); }catch(e){}
  let active=null, sel=null, shakeT=0, rest=0;
  const box=document.createElement('div'); box.id='kickBox'; box.className='yellbox actbox'; box.hidden=true;
  box.innerHTML='<div class="yhead"><p class="yq">이불킥 할까요?</p><p class="ycount"></p></div><div class="ych"></div><form class="yrow"><input maxlength="16" placeholder="흑역사 직접 쓰기 (안 써도 돼요)" aria-label="떠오른 흑역사"><button class="pill sit ygo" type="submit">네, 찰래요!</button></form>';
  const cnt=box.querySelector('.ycount'), chips=box.querySelector('.ych'), form=box.querySelector('.yrow'), inp=form.querySelector('input');
  SP_SHAME.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='pill ychip'; b.textContent=t;
    b.addEventListener('click',()=>{ sel=sel===t?null:t; chips.querySelectorAll('.ychip').forEach(x=>x.classList.toggle('on',x.textContent===sel)); }); chips.appendChild(b); });
  form.addEventListener('submit',e=>{ e.preventDefault(); inp.blur(); start(); });
  ['pointerdown','touchstart','wheel'].forEach(k=>box.addEventListener(k,e=>e.stopPropagation(),{passive:true}));
  (document.querySelector('#hud .bottom')||document.body).prepend(box);
  const spot=()=>(S.mode==='scene'&&world.kickSpot)?world.kickSpot(S.me.x,S.me.z):-1;
  const showCount=()=>{ cnt.textContent=today?`오늘 이불킥 ${today}번`:''; cnt.hidden=!today; };
  showCount();

  /* 흑역사 글자: 머리 위에 떠서 발차기마다 휘청이다가, 마지막 한 방에 글자 하나하나 흩어진다 */
  const floats=[];
  function textSprite(text,h){
    const tex=canvasTex(1024,192,(g,w,hh)=>{ g.textAlign='center'; g.textBaseline='middle'; let fs=110; g.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`;
      while(g.measureText(text).width>w-40&&fs>36){ fs-=8; g.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`; }
      g.lineWidth=fs*.18; g.strokeStyle='rgba(40,30,70,.85)'; g.strokeText(text,w/2,hh/2); g.fillStyle='#fff6e0'; g.fillText(text,w/2,hh/2); });
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,depthTest:false,fog:false})); sp.scale.set(h*1024/192,h,1); sp.renderOrder=20; return sp;
  }
  function shatter(a){
    if(!a.sp) return; const p=a.sp.position.clone(); scene.remove(a.sp); a.sp.material.map.dispose(); a.sp.material.dispose(); a.sp=null;
    const chars=[...a.text.replace(/\s/g,'')]; const n=chars.length;
    chars.forEach((ch,i)=>{ const s=textSprite(ch,.55); s.scale.set(.55,.55,1); s.position.copy(p).add(new THREE.Vector3((i-(n-1)/2)*.32,0,0)); scene.add(s);
      const ang=Math.random()*TAU; floats.push({sp:s,vx:Math.cos(ang)*(1.5+Math.random()*2.5),vy:2+Math.random()*3,vz:Math.sin(ang)*(1.5+Math.random()*2.5),age:0,spin:(Math.random()-.5)*6}); });
  }
  function start(){
    if(active) return; const i=spot(); if(i<0) return;
    const m=S.me; m.tx=m.x; m.tz=m.z; m.pending=null; m.walking=false;
    const text=inp.value.trim()||sel||''; inp.value='';
    const a={t0:S.t,dur:3.6,i,text,ph:0,lastL:0,lastR:0,final:false,sp:null};
    if(text){ const bp=world.bedPose(i); a.sp=textSprite(text,.42); a.sp.position.set(bp.x,bp.y+1.7,bp.z); a.sp.material.opacity=0; scene.add(a.sp); }
    active=a; box.hidden=true; touch();
  }
  /* 다리 높이(0~1)와 세기 */
  function legs(a,u){
    if(u<.1) return {hl:0,hr:0,k:u/.1*.3};
    if(u<.82){ const k=.45+.55*((u-.1)/.72); return {hl:Math.max(0,Math.sin(a.ph)),hr:Math.max(0,Math.sin(a.ph+Math.PI)),k}; }
    if(u<.93){ const k=Math.sin((u-.82)/.11*Math.PI/2); return {hl:k,hr:k,k:1}; }
    const k=1-(u-.93)/.07; return {hl:Math.max(0,k),hr:Math.max(0,k),k:Math.max(0,k)};
  }
  function tick(dt){
    shakeT=Math.max(0,shakeT-dt); rest=Math.max(0,rest-dt);
    for(let i=floats.length-1;i>=0;i--){ const f=floats[i]; f.age+=dt; f.vy-=3*dt; f.sp.position.x+=f.vx*dt; f.sp.position.y+=f.vy*dt; f.sp.position.z+=f.vz*dt; f.sp.material.rotation+=f.spin*dt;
      f.sp.material.opacity=Math.max(0,1-f.age/1.6); if(f.age>1.6){ scene.remove(f.sp); f.sp.material.map.dispose(); f.sp.material.dispose(); floats.splice(i,1); } }
    const m=S.me, a=active;
    if(a){
      const u=(S.t-a.t0)/a.dur;
      if(u>=.1&&u<.82){ const f=3+3.5*((u-.1)/.72); a.ph+=TAU*f*dt; }
      const L=legs(a,u);
      /* 발이 꼭대기에 닿을 때마다 '펑!' */
      if(L.hl>.92&&a.lastL<=.92&&u<.82){ Sound.kick&&Sound.kick(L.k); shakeT=.12; if(a.sp){ a.sp.position.x+=(Math.random()-.5)*.25; a.sp.position.y+=.08; } }
      if(L.hr>.92&&a.lastR<=.92&&u<.82){ Sound.kick&&Sound.kick(L.k); shakeT=.12; if(a.sp){ a.sp.position.x+=(Math.random()-.5)*.25; a.sp.position.y+=.08; } }
      a.lastL=L.hl; a.lastR=L.hr;
      if(!a.final&&u>=.9){ a.final=true; shatter(a); world.spout(a.i); Sound.kick&&Sound.kick(1.4); Sound.whoosh&&Sound.whoosh(); shakeT=.6;
        today++; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount(); }
      if(a.sp){ a.sp.material.opacity=Math.min(1,u/.1); const bp=world.bedPose(a.i); a.sp.position.x+=(bp.x-a.sp.position.x)*.08; a.sp.position.y+=(bp.y+1.7-a.sp.position.y)*.1; a.sp.position.z+=(bp.z-a.sp.position.z)*.08; }
      figure.root.updateMatrixWorld(true); world.kickAnim(a.i,figure.legs);
      if(u>=1){ world.kickEnd(a.i); if(a.sp){ scene.remove(a.sp); a.sp=null; } active=null; figure.kick(S.t,null); rest=1; }
    }
    const show=!active&&!rest&&!S.busy&&spot()>=0&&!m.walking;
    if(show&&world.bedFace){ const f=world.bedFace(spot()); m.heading+=angDiff(m.heading,f.heading)*(1-Math.exp(-8*dt)); }
    box.hidden=!show;
  }
  /* 누운 자리로 몸을 옮기고 발차기 자세를 잡는다 */
  function pose(fig){
    const a=active; if(!a) return;
    const u=Math.min(1,(S.t-a.t0)/a.dur), bp=world.bedPose(a.i);
    fig.root.position.set(bp.x,bp.y,bp.z); fig.root.rotation.order='YXZ'; fig.root.rotation.y=bp.heading; fig.root.rotation.x=-Math.PI/2; fig.shadow.visible=false;
    fig.kick(S.t,legs(a,u));
  }
  function shake(){ return shakeT>0?Math.min(.12,.2*shakeT):0; }
  return {tick,pose,shake,start,busy:()=>!!active};
})();
