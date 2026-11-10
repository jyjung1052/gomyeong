/* ---- 지진: 햇살 가득한 붉은 바위 평원. 발을 쿵쿵 구를수록 땅이 점점 깊게 갈라지고, 둘레의 모래 더미가 스르르 무너져 그 틈으로 흘러 들어간다 ---- */
const QK_R=30;
function quakeH(x,z){ const r=Math.hypot(x,z); return .08*nz(x*.15,1,z*.15)+smooth(QK_R+4,QK_R+30,r)*(5+4*nz(x*.04,2,z*.04)); }
/* 갈라진 땅: 가지 친 균열을 한 번 만들어 두고, 쿵 할 때마다 더 길고 넓고 깊게 다시 그린다 */
function crackNet(seed){
  const R=rng(seed), lines=[];
  const branch=(x,y,a,len,wd,d0,gen)=>{ if(len<10||wd<.5) return; const pts=[[x,y,d0]]; let px=x,py=y,d=d0;
    for(let s=0;s<7;s++){ a+=(R()-.5)*.7; px+=Math.cos(a)*len/7; py+=Math.sin(a)*len/7; d+=len/7; pts.push([px,py,d]);
      if(s>1&&R()<.22) branch(px,py,a+(R()<.5?-1:1)*(.5+R()*.8),len*.55,wd*.6,d,gen+1); }
    lines.push({pts,wd,gen}); };
  const n=5+Math.floor(R()*3); for(let i=0;i<n;i++) branch(256,256,i/n*TAU+R()*.6,150+R()*90,7,0,0);
  return lines;
}
function drawCrack(c2,lines,L){
  const w=512; c2.clearRect(0,0,w,w); c2.lineCap='round'; c2.lineJoin='round';
  const reach=40+L*24, wk=.45+L*.13;
  const path=(ln,ox,oy)=>{ c2.beginPath(); let first=true;
    for(let i=0;i<ln.pts.length;i++){ const [x,y,d]=ln.pts[i]; if(d>reach){ if(i>0){ const [x0,y0,d0]=ln.pts[i-1], k=(reach-d0)/(d-d0); c2.lineTo(x0+(x-x0)*k+ox,y0+(y-y0)*k+oy); } break; }
      if(first){ c2.moveTo(x+ox,y+oy); first=false; } else c2.lineTo(x+ox,y+oy); } c2.stroke(); };
  /* 갈라진 가장자리 그늘 → 틈 → 깊은 바닥(단계가 오를수록 더 검고 넓게) → 볕 받는 모서리 */
  lines.forEach(ln=>{ c2.strokeStyle='rgba(110,60,30,.45)'; c2.lineWidth=ln.wd*wk*2.6; path(ln,0,0); });
  lines.forEach(ln=>{ c2.strokeStyle='rgba(255,214,170,.5)'; c2.lineWidth=ln.wd*wk*1.25; path(ln,-1.5,-1.5); });
  lines.forEach(ln=>{ c2.strokeStyle='rgba(58,28,12,.97)'; c2.lineWidth=ln.wd*wk*1.15; path(ln,0,0); });
  if(L>=2) lines.forEach(ln=>{ c2.strokeStyle=`rgba(12,5,2,${Math.min(1,.4+L*.08)})`; c2.lineWidth=ln.wd*wk*Math.min(.8,.25+L*.06); path(ln,.6,.6); });
  const pr=10+L*5, gr=c2.createRadialGradient(256,256,0,256,256,pr*2.2); gr.addColorStop(0,`rgba(15,7,3,${Math.min(.95,.3+L*.07)})`); gr.addColorStop(.45,'rgba(60,30,12,.5)'); gr.addColorStop(1,'rgba(60,30,12,0)');
  c2.fillStyle=gr; c2.beginPath(); c2.arc(256,256,pr*2.2,0,TAU); c2.fill();
}
function buildQuake(){
  const g=new THREE.Group(), R=rng(64);
  g.add(skyDome('#5a9ee0','#9cc8ef','#f6e4c8'));
  g.add(new THREE.HemisphereLight(0xfff2e0,0xa8684a,.85));
  const sun=new THREE.DirectionalLight(0xffe2b8,.7); sun.position.set(-30,50,20); g.add(sun);
  /* 붉은 흙 평원과 둘레의 언덕, 멀리 메사(탁자 바위) */
  const T=new THREE.PlaneGeometry(300,300,150,150); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color(), A=new THREE.Color('#c98a5a'), Bc=new THREE.Color('#e0aa74'), D=new THREE.Color('#a8673f');
  for(let i=0;i<tp.count;i++){ const x=tp.getX(i), z=tp.getZ(i); tp.setY(i,quakeH(x,z)); const n=nz(x*.1,3,z*.1)*.5+.5, n2=nz(x*.6,5,z*.6)*.5+.5;
    c.copy(A).lerp(Bc,n).lerp(D,smooth(.7,.95,n2)*.4); tc[i*3]=c.r; tc[i*3+1]=c.g; tc[i*3+2]=c.b; }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  const ground=new THREE.Mesh(T,VC({shininess:3})); g.add(ground);
  for(let i=0;i<12;i++){ const a=i/12*TAU+R()*.3, r=150+R()*70, h=25+R()*30, w=30+R()*40;
    const m=mesh(new THREE.CylinderGeometry(w*.85,w,h,9),M('#b8724a',{flatShading:true}),Math.cos(a)*r,h/2-2,Math.sin(a)*r); m.rotation.y=R()*6; g.add(m);
    g.add(mesh(new THREE.CylinderGeometry(w*.86,w*.86,1.2,9),M('#d89a68',{flatShading:true}),Math.cos(a)*r,h-1.4,Math.sin(a)*r)); }
  const rocks=[]; for(let i=0;i<70;i++){ const a=R()*TAU, r=QK_R+2+R()*30, x=Math.cos(a)*r, z=Math.sin(a)*r, s=.6+R()*2.4; rocks.push({x,y:quakeH(x,z)-s*.3,z,sx:s*1.3,sy:s*.8,sz:s,ry:R()*6,c:choice(R,['#a96a46','#b97b52','#946043'])}); }
  g.add(instances(rockGeo(),VC({vertexColors:false}),rocks));
  /* 마른 풀 덤불 */
  const shrubs=[]; for(let i=0;i<60;i++){ const a=R()*TAU, r=4+Math.sqrt(R())*(QK_R-2), x=Math.cos(a)*r, z=Math.sin(a)*r; shrubs.push({x,y:.1,z,sx:.4+R()*.4,sy:.3+R()*.3,sz:.4+R()*.4,c:choice(R,['#9c9a5a','#8a8a4c','#b0a868'])}); }
  g.add(instances(new THREE.IcosahedronGeometry(1,0),VC({vertexColors:false,flatShading:true}),shrubs));
  /* 모래 더미: 원을 따라 여기저기. 쿵 할 때마다 조금씩 내려앉아 갈라진 틈으로 흘러 들어가고, 잠잠해지면 다시 바람에 쌓인다 */
  const SC=['#f4dcae','#efd29e','#f7e3bb','#ead0a0'];
  const pileG=new THREE.LatheGeometry([[0,1],[.18,.97],[.38,.86],[.58,.62],[.76,.34],[.9,.13],[1.02,0]].map(([x,y])=>new THREE.Vector2(x,y)),28);
  displace(pileG,(x,y,z)=>{ const k=1+.07*nz(x*2.5,y*2,z*2.5); return [x*k,y*(1+.05*nz(x*3,5,z*3)),z*k]; });
  const piles=[]; for(let i=0;i<26;i++){ const a=i/26*TAU+R()*.15, r=6.5+R()*15, rad=1.5+R()*1.2, h0=1.1+R()*1.1;
    piles.push({x:Math.cos(a)*r,z:Math.sin(a)*r,r0:rad,h0,h:h0,ht:h0,ry:R()*6,c:choice(R,SC)}); }
  const pim=new THREE.InstancedMesh(pileG,VC({vertexColors:false,shininess:4}),piles.length);
  { const col=new THREE.Color(); piles.forEach((p,i)=>pim.setColorAt(i,col.set(p.c))); pim.instanceColor.needsUpdate=true; }
  g.add(pim);
  const o3=new THREE.Object3D();
  function drawPiles(){ piles.forEach((p,i)=>{ const k=1-p.h/p.h0, rr=p.r0*(1+.4*k);   /* 낮아질수록 옆으로 퍼진다 */
    o3.position.set(p.x,quakeH(p.x,p.z)-.02,p.z); o3.rotation.set(0,p.ry,0); o3.scale.set(rr,Math.max(.03,p.h),rr); o3.updateMatrix(); pim.setMatrixAt(i,o3.matrix); });
    pim.instanceMatrix.needsUpdate=true; }
  /* 흘러내리는 모래 알갱이: 더미에서 틈 쪽으로 미끄러져 가다 틈 속으로 쏙 */
  const SN=900, spos=new Float32Array(SN*3), sv=[...Array(SN)].map(()=>({life:0}));
  const sgeo=new THREE.BufferGeometry(); sgeo.setAttribute('position',new THREE.BufferAttribute(spos,3));
  const sandPts=new THREE.Points(sgeo,new THREE.PointsMaterial({color:0xc8925a,size:.13})); sandPts.frustumCulled=false; g.add(sandPts);
  for(let i=0;i<SN;i++) spos[i*3+1]=-99;
  let sni=0;
  function flow(p,c,n){ for(let k=0;k<n;k++){ const q=sv[sni]; sni=(sni+1)%SN; const a=Math.random()*TAU, rr=Math.random()*p.r0*(1+.4*(1-p.h/p.h0));
    const x=p.x+Math.cos(a)*rr, z=p.z+Math.sin(a)*rr, top=p.h*Math.max(0,1-rr/p.r0);
    /* 틈의 한 갈래 쪽으로: 가운데 근처 아무 데나 */
    const ta=Math.random()*TAU, tr=Math.random()*Math.min(2.4,.4+c.L*.22);
    Object.assign(q,{x,y:quakeH(x,z)+top+.05,z,tx:c.x+Math.cos(ta)*tr,tz:c.z+Math.sin(ta)*tr,sp:3+Math.random()*4,delay:Math.random()*.6,sink:0,life:6}); } }
  /* 발밑 갈라짐, 퍼져 나가는 충격파, 흙먼지, 튀는 자갈 */
  const cracks=[];
  function crack(x,z,power){
    let c=null, best=2.6; cracks.forEach(k=>{ const d=Math.hypot(k.x-x,k.z-z); if(d<best){ best=d; c=k; } });
    if(!c){ const cv=document.createElement('canvas'); cv.width=cv.height=512; const tex=new THREE.CanvasTexture(cv);
      const pg=new THREE.PlaneGeometry(1,1,16,16); pg.rotateX(-Math.PI/2);
      const m=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:1,polygonOffset:true,polygonOffsetFactor:-2}));
      m.position.set(x,0,z); m.rotation.y=Math.random()*TAU; m.renderOrder=2; g.add(m);
      c={x,z,m,cv,tex,lines:crackNet(Math.floor(Math.random()*1e6)),L:0,idle:0,size:9};
      const P=pg.attributes.position; for(let i=0;i<P.count;i++){ const v=new THREE.Vector3(P.getX(i)*c.size,0,P.getZ(i)*c.size).applyAxisAngle(new THREE.Vector3(0,1,0),m.rotation.y); P.setY(i,quakeH(x+v.x,z+v.z)-quakeH(x,z)+.03); }
      m.scale.set(c.size,1,c.size); m.position.y=quakeH(x,z); cracks.push(c);
      if(cracks.length>6){ const c0=cracks.shift(); g.remove(c0.m); c0.m.material.dispose(); c0.m.geometry.dispose(); c0.tex.dispose(); } }
    c.L=Math.min(12,c.L+.6+power*.9); c.idle=0; c.m.material.opacity=1;          /* 쿵 할수록 더 길고 깊게 */
    drawCrack(c.cv.getContext('2d'),c.lines,c.L); c.tex.needsUpdate=true; return c;
  }
  /* 둘레 모래 더미가 무너져 이 틈으로 흘러든다 */
  function slump(c,x,z,power,R0){ let moved=0;
    piles.forEach(p=>{ const d=Math.hypot(p.x-x,p.z-z); if(d>R0||p.ht<=.04) return;
      const amt=Math.min(p.ht-.03,p.h0*power*(.1+.12*(1-d/R0))); if(amt<=0) return; p.ht-=amt; p.idle=0; moved+=amt; flow(p,c,Math.round(8+amt/p.h0*90)); });
    if(moved>.05&&typeof Sound!=='undefined'&&Sound.sand) Sound.sand(Math.min(1,moved*.6)); }
  const rings=[]; const ringG=new THREE.RingGeometry(.9,1,64); ringG.rotateX(-Math.PI/2);
  function ring(x,z,speed,life,op){ const m=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:0xfff1d8,transparent:true,opacity:op,depthWrite:false})); m.position.set(x,.08,z); g.add(m); rings.push({m,age:0,speed,life,op}); }
  const dustT=canvasTex(64,64,(c2,w,h)=>{ const gr=c2.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2); gr.addColorStop(0,'rgba(222,180,140,.9)'); gr.addColorStop(1,'rgba(222,180,140,0)'); c2.fillStyle=gr; c2.fillRect(0,0,w,h); });
  const DN=120, dust=[...Array(DN)].map(()=>{ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:dustT,transparent:true,depthWrite:false,opacity:0})); s.visible=false; g.add(s); return {s,life:0}; });
  let di=0; const puff=(x,y,z,vx,vy,vz,size,life)=>{ const d=dust[di]; di=(di+1)%DN; d.s.visible=true; d.s.position.set(x,y,z); Object.assign(d,{vx,vy,vz,size,life,age:0}); };
  const PN=160, ppos=new Float32Array(PN*3), pv=[...Array(PN)].map(()=>({life:0}));
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(ppos,3));
  const pebbles=new THREE.Points(pg,new THREE.PointsMaterial({color:0x7a4a30,size:.09})); pebbles.frustumCulled=false; g.add(pebbles);
  let pi=0;
  let level=0;                                   // 지금 흔들림 세기(0~1): 연타가 빠를수록 올라간다
  drawPiles();
  return {group:g,fog:{c:0xf0dcc0,n:50,f:260},bg:0xf0dcc0,bounds:{circle:[0,0,QK_R-1]},spawn:{x:0,z:4},spawnJ:[2,2],
    avoid:piles.map(p=>({x:p.x,z:p.z,r:p.r0*.8})),groundH:quakeH,waterY:-1000,pitch:.3,pitchSit:.14,
    onAct(){ if(typeof Stomp!=='undefined') Stomp.open(); },
    setLevel(v){ level=v; },
    /* 한 번 쿵: 발밑이 갈라지고 충격파가 퍼진다. 세기에 따라 가까운 탑부터 무너진다 */
    stomp(x,z,power){
      const c=crack(x,z,power); ring(x,z,4+power*10,.7+power*.4,.55); slump(c,x,z,power,4+power*14);
      for(let k=0;k<6+power*10;k++){ const a=Math.random()*TAU; puff(x+Math.cos(a)*.4,.2,z+Math.sin(a)*.4,Math.cos(a)*(1+power*2),.4+Math.random()*.8,Math.sin(a)*(1+power*2),.9+power,1+Math.random()*.6); }
      for(let k=0;k<12+power*24;k++){ const p=pv[pi]; const a=Math.random()*TAU, r=Math.random()*(2+power*5); Object.assign(p,{x:x+Math.cos(a)*r,y:.05,z:z+Math.sin(a)*r,vx:0,vy:1.5+Math.random()*3*power,vz:0,life:1.2}); pi=(pi+1)%PN; }
    },
    /* 대지진: 큰 충격파가 끝까지 퍼지며 남은 탑을 모두 쓰러뜨린다 */
    bigQuake(x,z){
      let c=crack(x,z,1); c=crack(x,z,1); c.L=12; drawCrack(c.cv.getContext('2d'),c.lines,12); c.tex.needsUpdate=true; ring(x,z,26,2.2,.9); ring(x,z,18,2.6,.6);
      for(let k=0;k<70;k++){ const a=Math.random()*TAU, s=3+Math.random()*7; puff(x+Math.cos(a)*1.5,.4,z+Math.sin(a)*1.5,Math.cos(a)*s,.6+Math.random()*2,Math.sin(a)*s,2.5+Math.random()*2,2+Math.random()*1.5); }
      piles.forEach(p=>{ const d=Math.hypot(p.x-x,p.z-z); setTimeout(()=>{ const amt=p.ht-.03; if(amt>0){ p.ht=.03; p.idle=0; flow(p,c,Math.round(30+amt/p.h0*90)); } },d/26*1000); });   /* 모든 더미가 와르르 */
      if(typeof Sound!=='undefined'&&Sound.sand) setTimeout(()=>Sound.sand(1),300);
    },
    update(t,dt,me){
      /* 더미: 무너지는 중엔 목표 높이로 스르르, 잠잠하면 바람에 천천히 다시 쌓인다 */
      piles.forEach(p=>{ p.idle=(p.idle||0)+dt; if(level<.08&&p.idle>6) p.ht=Math.min(p.h0,p.ht+p.h0*dt*.12);
        p.h+=(p.ht-p.h)*Math.min(1,dt*(p.ht<p.h?2.2:1.5)); });
      drawPiles();
      /* 균열: 잠잠해지면 서서히 메워져 사라진다 */
      for(let i=cracks.length-1;i>=0;i--){ const c0=cracks[i]; c0.idle+=dt; if(level<.08&&c0.idle>9){ c0.m.material.opacity=Math.max(0,1-(c0.idle-9)/4); if(c0.idle>13){ g.remove(c0.m); c0.m.material.dispose(); c0.m.geometry.dispose(); c0.tex.dispose(); cracks.splice(i,1); } } }
      /* 모래 알갱이: 잠깐 기다렸다 틈 쪽으로 미끄러져 가서 틈 속으로 빠진다 */
      for(let i=0;i<SN;i++){ const q=sv[i]; if(q.life<=0) continue; q.life-=dt;
        if(q.delay>0){ q.delay-=dt; } else if(!q.sink){ const dx=q.tx-q.x, dz=q.tz-q.z, d=Math.hypot(dx,dz);
          if(d<.15){ q.sink=1; } else { const st=Math.min(d,q.sp*dt); q.x+=dx/d*st; q.z+=dz/d*st; const gy=quakeH(q.x,q.z)+.04; q.y+=(gy-q.y)*Math.min(1,dt*6); } }
        else { q.y-=dt*1.2; q.sink+=dt; if(q.sink>.5) q.life=0; }
        if(q.life<=0){ spos[i*3+1]=-99; continue; } spos[i*3]=q.x; spos[i*3+1]=q.y; spos[i*3+2]=q.z; }
      sgeo.attributes.position.needsUpdate=true;
      for(let i=rings.length-1;i>=0;i--){ const r=rings[i]; r.age+=dt; const k=r.age/r.life; r.m.scale.setScalar(1+r.age*r.speed); r.m.material.opacity=r.op*(1-k); if(k>=1){ g.remove(r.m); r.m.material.dispose(); rings.splice(i,1); } }
      for(const d of dust){ if(d.life<=0) continue; d.age+=dt; const k=d.age/d.life; if(k>=1){ d.life=0; d.s.visible=false; continue; }
        d.vx*=1-1.5*dt; d.vz*=1-1.5*dt; d.s.position.x+=d.vx*dt; d.s.position.y+=d.vy*dt; d.s.position.z+=d.vz*dt; const s=d.size*(1+k*1.5); d.s.scale.set(s,s,1); d.s.material.opacity=.7*(1-k); }
      for(let i=0;i<PN;i++){ const p=pv[i]; if(p.life>0){ p.life-=dt; p.vy-=12*dt; p.y=Math.max(.04,p.y+p.vy*dt); ppos[i*3]=p.x; ppos[i*3+1]=p.y; ppos[i*3+2]=p.z; } else ppos[i*3+1]=-99; }
      pg.attributes.position.needsUpdate=true;
      /* 흔들릴 때 바닥 먼지가 살랑 */
      if(level>.4&&me&&Math.random()<level*dt*8){ const a=Math.random()*TAU, r=2+Math.random()*12; puff(me.x+Math.cos(a)*r,.1,me.z+Math.sin(a)*r,0,.3,0,1.2,1.4); }
    }
  };
}
BUILD.quake=buildQuake;
