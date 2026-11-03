/* ---- 함께 앉기: 지금 이 페이지를 열어 둔 사람들이 같은 공간에서 서로 보인다(저장되지 않고, 나가면 사라진다) ---- */
const Together=(()=>{
  let room=null, why='', started=false, acc=0, lastSent='', seenN=0, sync=0;
  const others=new Map();
  const pill=document.getElementById('together');
  const sid=()=>S.mode==='hub'?'hub':(S.mode==='scene'&&S.realm?S.realm.id:'');
  const num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;

  function labelSprite(name){
    const tex=canvasTex(256,64,(g,w,h)=>{
      g.clearRect(0,0,w,h);
      g.fillStyle='rgba(255,255,255,.82)';
      const r=h/2-4; g.beginPath(); g.moveTo(r+4,4); g.arcTo(w-4,4,w-4,h-4,r); g.arcTo(w-4,h-4,4,h-4,r); g.arcTo(4,h-4,4,4,r); g.arcTo(4,4,w-4,4,r); g.fill();
      g.fillStyle='#4a4840'; g.textAlign='center'; g.textBaseline='middle';
      g.font='600 28px "Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
      g.fillText(name,w/2,h/2+1);
    });
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,fog:false}));
    s.scale.set(1.5,.375,1); return s;
  }
  function addOther(id,name){
    const fig=buildFigure(); fig.root.visible=false;
    const lab=labelSprite(name); fig.root.add(lab);
    scene.add(fig.root);
    const o={fig,lab,name,s:'',x:0,z:0,tx:0,tz:0,h:Math.PI,th:Math.PI,sit:false,walk:false,fresh:true,breath:0};
    others.set(id,o); return o;
  }
  function drop(id){
    const o=others.get(id); if(!o) return;
    scene.remove(o.fig.root); others.delete(id);
  }
  function apply(peers){
    const seen=new Set(); seenN=peers.length;
    peers.forEach(p=>{
      if(p.sameTab) return;
      const d=p.presence||{};
      seen.add(p.peer);
      let name=typeof d.n==='string'?d.n.slice(0,12):'나그네';
      let o=others.get(p.peer);
      if(o&&o.name!==name){ drop(p.peer); o=null; }
      if(!o) o=addOther(p.peer,name);
      o.s=typeof d.s==='string'?d.s:'?'; o.tx=clamp(num(d.x,0),-60,60); o.tz=clamp(num(d.z,0),-60,60); o.th=num(d.h,Math.PI); o.sit=!!d.i; o.lie=!!d.l;
      if(o.fresh){ o.x=o.tx; o.z=o.tz; o.h=o.th; o.fresh=false; }
    });
    [...others.keys()].forEach(id=>{ if(!seen.has(id)) drop(id); });
    count();
  }
  function count(){
    if(!pill) return;
    const here=[...others.values()].filter(o=>o.s===sid()).length;
    const all=others.size;
    pill.hidden=!(started&&S.mode!=='login');
    if(!room) pill.textContent='혼자 앉는 중'+(why?' (연결 실패: '+why+')':'');
    else if(!room.connected()) pill.textContent='연결 중…';
    else pill.textContent=all===0?`지금은 혼자예요 (감지 ${seenN}명)`:(here>0?`함께 ${here}명`:`다른 곳에 ${all}명`);
    if(room&&room.debug) pill.textContent+=' · '+room.debug();
  }
  async function start(){
    if(started) return; started=true;
    try{
      if(window.claude&&window.claude.use) room=await window.claude.use('room');
      else room=await WsRoom.open();
      if(!room) return;
      room.onPeers(ch=>apply(ch.peers),()=>{ room=null; });
      apply(room.peers());
      send(true);
    }catch(e){ room=null; why=(e&&(e.type||e.message))||'오류'; }
    count();
  }
  function send(force){
    if(!room) return;
    const m=S.me, s=sid(); if(!s) return;
    const p={n:S.user||'나그네',s,x:Math.round(m.x*20)/20,z:Math.round(m.z*20)/20,h:Math.round(m.heading*20)/20,i:m.sitting?1:0,l:m.lie?1:0};
    const key=JSON.stringify(p);
    if(!force&&key===lastSent) return;
    lastSent=key; room.presence(p).catch(()=>{});
  }
  let down=0;
  function tick(dt,t){
    if(room&&room.close&&!room.connected()){ if((down+=dt)>12){ down=0; try{room.close();}catch(e){} room=null; [...others.keys()].forEach(drop); started=false; start(); return; } } else down=0;
    if(!room){ if(started&&(acc+=dt)>1){ acc=0; count(); } return; }
    acc+=dt; if(acc>=.2){ acc=0; send(false); }
    sync+=dt; if(sync>=1){ sync=0; apply(room.peers()); }
    const mine=sid(), fy=(world&&world.floorY)||0;
    let here=0;
    others.forEach(o=>{
      const vis=o.s===mine&&mine!=='';
      o.fig.root.visible=vis; if(!vis){ o.fresh=true; return; }
      here++;
      const dx=o.tx-o.x, dz=o.tz-o.z, d=Math.hypot(dx,dz);
      if(d>8){ o.x=o.tx; o.z=o.tz; o.walk=false; }
      else if(d>.04){ const st=Math.min(d,3.6*dt); o.x+=dx/d*st; o.z+=dz/d*st; o.walk=true; o.th=Math.atan2(dx,dz); }
      else o.walk=false;
      o.h+=angDiff(o.h,o.th)*(1-Math.exp(-10*dt));
      o.breath=o.sit?(1-Math.cos((t%10)/10*TAU))/2:0;
      const Q=footPose(o.x,o.z);
      const ly=o.sit&&o.lie?1:0;
      o.fig.root.position.set(o.x,Q.y+.27*ly,o.z); o.fig.root.rotation.order='YXZ'; o.fig.root.rotation.y=o.h; o.fig.root.rotation.x=Q.k*1.25-ly*Math.PI/2;
      o.fig.shadow.visible=!(world.groundH&&Q.dep>.05)&&!ly;
      o.fig.update(t,o.sit,o.walk,o.breath,S.realm?S.realm.color:'#ffffff',o.sit?.4:0,false,o.lie);
      o.lab.position.set(0,ly?0:(o.sit?1.85:2.45),ly?1.0:0);
    });
    if(S.mode!==Together._m){ Together._m=S.mode; }
    count();
  }
  return {start,tick,_m:''};
})();
