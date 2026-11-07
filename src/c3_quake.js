/* ---- 지진: 햇살 가득한 붉은 바위 평원. 발을 쿵쿵 구를수록 땅이 갈라지고 흔들려, 둘레의 나무 블록 탑들이 휘청이다 와르르 무너진다 ---- */
const QK_R=30;
function quakeH(x,z){ const r=Math.hypot(x,z); return .08*nz(x*.15,1,z*.15)+smooth(QK_R+4,QK_R+30,r)*(5+4*nz(x*.04,2,z*.04)); }
function crackTex(){
  return canvasTex(256,256,(g,w,h)=>{ g.clearRect(0,0,w,h); g.strokeStyle='rgba(60,30,15,.85)'; g.lineCap='round';
    const R=rng(9);
    const branch=(x,y,a,len,wd)=>{ if(len<6||wd<.6) return; g.lineWidth=wd; g.beginPath(); g.moveTo(x,y); let px=x,py=y;
      for(let s=0;s<6;s++){ a+=(R()-.5)*.7; px+=Math.cos(a)*len/6; py+=Math.sin(a)*len/6; g.lineTo(px,py); } g.stroke();
      if(R()<.8) branch(px,py,a+(R()-.5)*1.4,len*.6,wd*.6); if(R()<.5) branch(px,py,a+(R()-.5)*1.4,len*.5,wd*.55); };
    for(let i=0;i<7;i++) branch(w/2,h/2,i/7*TAU+R()*.5,w*.34,5);
    const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,26); gr.addColorStop(0,'rgba(70,35,15,.55)'); gr.addColorStop(1,'rgba(70,35,15,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h); });
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
  /* 나무 블록 탑: 원을 따라 여기저기. 흔들리다 무너지고, 잠시 뒤 되감기처럼 다시 쌓인다 */
  const BC=['#f2c14e','#f78154','#4d9de0','#7ac74f','#e15a97','#ffffff','#9b72cf'];
  const towers=[]; const blocks=[];
  for(let i=0;i<26;i++){ const a=i/26*TAU+R()*.15, r=9+R()*16, x=Math.cos(a)*r, z=Math.sin(a)*r, n=6+Math.floor(R()*8);
    const t={x,z,b:[],state:'stand',lean:0,lp:R()*TAU,timer:0,dist:r};
    for(let k=0;k<n;k++){ const bw=.7+R()*.3, bh=.42; const b={hx:x,hy:.21+k*bh,hz:z,ry:R()*.4+(k%2)*Math.PI/2,w:bw,h:bh,d:bw*.45,c:choice(R,BC),x:0,y:0,z:0,vx:0,vy:0,vz:0,rx:0,rz:0,vrx:0,vrz:0,tw:t,k};
      b.x=b.hx; b.y=b.hy; b.z=b.hz; t.b.push(b); blocks.push(b); }
    towers.push(t); }
  const bim=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),VC({vertexColors:false,shininess:16}),blocks.length);
  { const col=new THREE.Color(); blocks.forEach((b,i)=>bim.setColorAt(i,col.set(b.c))); bim.instanceColor.needsUpdate=true; }
  bim.frustumCulled=false; g.add(bim);
  const o3=new THREE.Object3D();
  function drawBlocks(){
    blocks.forEach((b,i)=>{ const t=b.tw;
      if(t.state==='stand'||t.state==='rewind'){ /* 서 있을 땐 탑 전체가 바닥을 축으로 기우뚱 */
        const L=t.lean*Math.sin(t.lp), L2=t.lean*Math.cos(t.lp*1.3)*.6, h=b.y;
        o3.position.set(b.x+Math.sin(L)*h,b.y*Math.cos(L)*Math.cos(L2),b.z+Math.sin(L2)*h); o3.rotation.set(L2,b.ry,-L);
      }else{ o3.position.set(b.x,b.y,b.z); o3.rotation.set(b.rx,b.ry,b.rz); }
      o3.scale.set(b.w,b.h,b.d); o3.updateMatrix(); bim.setMatrixAt(i,o3.matrix); });
    bim.instanceMatrix.needsUpdate=true;
  }
  function topple(t,dirx,dirz,power){
    if(t.state!=='stand') return; t.state='fall'; t.timer=0;
    t.b.forEach(b=>{ const up=b.k*.35; b.vx=dirx*(1+up)*power*(1+Math.random()*.6)+(Math.random()-.5)*1.5; b.vz=dirz*(1+up)*power*(1+Math.random()*.6)+(Math.random()-.5)*1.5; b.vy=1+Math.random()*2.5*power;
      b.vrx=(Math.random()-.5)*8; b.vrz=(Math.random()-.5)*8; b.sx=b.x; b.sy=b.y; b.sz=b.z; });
    if(typeof Sound!=='undefined'&&Sound.blocks) Sound.blocks(t.b.length);
  }
  /* 발밑 갈라짐, 퍼져 나가는 충격파, 흙먼지, 튀는 자갈 */
  const ctex=crackTex(), cracks=[];
  function crack(x,z,size){ const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:ctex,transparent:true,depthWrite:false,opacity:.9}));
    m.rotation.x=-Math.PI/2; m.rotation.z=Math.random()*TAU; m.position.set(x,quakeH(x,z)+.03+cracks.length*.0005,z); m.scale.setScalar(size); m.renderOrder=2; g.add(m); cracks.push({m,age:0});
    if(cracks.length>14){ const c0=cracks.shift(); g.remove(c0.m); c0.m.material.dispose(); c0.m.geometry.dispose(); } }
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
  drawBlocks();
  return {group:g,fog:{c:0xf0dcc0,n:50,f:260},bg:0xf0dcc0,bounds:{circle:[0,0,QK_R-1]},spawn:{x:0,z:4},spawnJ:[2,2],
    avoid:towers.map(t=>({x:t.x,z:t.z,r:.7})),groundH:quakeH,waterY:-1000,pitch:.3,pitchSit:.14,
    onAct(){ if(typeof Stomp!=='undefined') Stomp.open(); },
    setLevel(v){ level=v; },
    /* 한 번 쿵: 발밑이 갈라지고 충격파가 퍼진다. 세기에 따라 가까운 탑부터 무너진다 */
    stomp(x,z,power){
      crack(x,z,1.2+power*2.6); ring(x,z,4+power*10,.7+power*.4,.55);
      for(let k=0;k<6+power*10;k++){ const a=Math.random()*TAU; puff(x+Math.cos(a)*.4,.2,z+Math.sin(a)*.4,Math.cos(a)*(1+power*2),.4+Math.random()*.8,Math.sin(a)*(1+power*2),.9+power,1+Math.random()*.6); }
      for(let k=0;k<12+power*24;k++){ const p=pv[pi]; const a=Math.random()*TAU, r=Math.random()*(2+power*5); Object.assign(p,{x:x+Math.cos(a)*r,y:.05,z:z+Math.sin(a)*r,vx:0,vy:1.5+Math.random()*3*power,vz:0,life:1.2}); pi=(pi+1)%PN; }
      towers.forEach(t=>{ if(t.state!=='stand') return; const d=Math.hypot(t.x-x,t.z-z); if(d<3+power*14&&Math.random()<power*.55){ topple(t,(t.x-x)/d,(t.z-z)/d,1+power*2.5); } });
    },
    /* 대지진: 큰 충격파가 끝까지 퍼지며 남은 탑을 모두 쓰러뜨린다 */
    bigQuake(x,z){
      crack(x,z,9); ring(x,z,26,2.2,.9); ring(x,z,18,2.6,.6);
      for(let k=0;k<70;k++){ const a=Math.random()*TAU, s=3+Math.random()*7; puff(x+Math.cos(a)*1.5,.4,z+Math.sin(a)*1.5,Math.cos(a)*s,.6+Math.random()*2,Math.sin(a)*s,2.5+Math.random()*2,2+Math.random()*1.5); }
      towers.forEach(t=>{ const d=Math.hypot(t.x-x,t.z-z)||1; setTimeout(()=>topple(t,(t.x-x)/d,(t.z-z)/d,4),d/26*1000); });
    },
    update(t,dt,me){
      towers.forEach(tw=>{
        if(tw.state==='stand'){ tw.lp+=dt*(6+level*10); tw.lean+=((level*.09+(level>.5?.03:0))-tw.lean)*Math.min(1,dt*4); }
        else if(tw.state==='fall'){ tw.timer+=dt; let rest=true;
          tw.b.forEach(b=>{ b.vy-=14*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt; b.rx+=b.vrx*dt; b.rz+=b.vrz*dt;
            const gy=quakeH(b.x,b.z)+b.h*.5; if(b.y<gy){ b.y=gy; b.vy*=-.25; b.vx*=.55; b.vz*=.55; b.vrx*=.5; b.vrz*=.5; if(Math.abs(b.vy)<.6) b.vy=0; }
            if(Math.hypot(b.vx,b.vz)>.1||Math.abs(b.vy)>.1) rest=false; });
          if(tw.timer>7&&rest&&level<.2){ tw.state='rewind'; tw.timer=0; tw.b.forEach(b=>{ b.fx=b.x; b.fy=b.y; b.fz=b.z; b.frx=b.rx; b.frz=b.rz; }); } }
        else if(tw.state==='rewind'){ /* 되감기: 블록들이 휘리릭 제자리로 날아가 다시 쌓인다 */
          tw.timer+=dt; const u=Math.min(1,tw.timer/1.2);
          tw.b.forEach((b,k)=>{ const v=Math.min(1,Math.max(0,u*1.6-k*.04)), e=v*v*(3-2*v);
            b.x=lerp(b.fx,b.hx,e); b.y=lerp(b.fy,b.hy,e)+Math.sin(e*Math.PI)*1.5; b.z=lerp(b.fz,b.hz,e); b.rx=lerp(b.frx,0,e); b.rz=lerp(b.frz,0,e); });
          if(u>=1&&tw.timer>1.9){ tw.state='stand'; tw.lean=0; tw.b.forEach(b=>{ b.x=b.hx; b.y=b.hy; b.z=b.hz; b.rx=b.rz=0; }); } }
      });
      drawBlocks();
      for(let i=cracks.length-1;i>=0;i--){ const c0=cracks[i]; c0.age+=dt; if(c0.age>10){ c0.m.material.opacity=Math.max(0,.9-(c0.age-10)/3); if(c0.age>13){ g.remove(c0.m); c0.m.material.dispose(); c0.m.geometry.dispose(); cracks.splice(i,1); } } }
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
