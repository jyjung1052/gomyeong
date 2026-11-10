/* ---- 눈사태: 맑게 갠 설산 꼭대기 전망대. 걱정을 쓴 종이를 가루가루 찢으면, 그 조각이 눈이 되어 펑펑 내리고 쌓인다 ---- */
const AV_DECK=16, AV_N=8, AV_SLOPE=.55;
const AV_WORRY=['카드값','내일 회의','그 사람 말','다이어트','야근','시험','잔소리'];
function avalancheH(x,z){
  const r=Math.hypot(x,z);
  if(r<AV_DECK) return .02*nz(x*.3,1,z*.3);
  const d=r-AV_DECK;
  return -d*AV_SLOPE*(1+.12*nz(x*.01,2,z*.01))+1.6*nz(x*.04,3,z*.04)*smooth(0,30,d)-Math.min(d,4)*.15;
}
/* 쓴 글씨가 보이는 종이 한 장(구길수록 오그라들어 뭉치가 된다) */
function paperTex(text){
  return canvasTex(256,320,(g,w,h)=>{ g.fillStyle='#fffdf6'; g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(120,150,200,.35)'; g.lineWidth=2; for(let y=60;y<h;y+=34){ g.beginPath(); g.moveTo(16,y); g.lineTo(w-16,y); g.stroke(); }
    g.fillStyle='#2b2a35'; g.textAlign='center'; g.textBaseline='middle'; let fs=58; g.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`;
    const t=text||''; while(g.measureText(t).width>w-30&&fs>22){ fs-=4; g.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`; }
    g.fillText(t,w/2,h/2); });
}
function puffTex(){
  return canvasTex(128,128,(g,w,h)=>{ const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2); gr.addColorStop(0,'rgba(255,255,255,.95)'); gr.addColorStop(.5,'rgba(250,252,255,.6)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h); });
}
function buildAvalanche(){
  const g=new THREE.Group(), R=rng(31);
  g.add(skyDome('#3f7fd0','#86b6ea','#e8f2fb'));
  g.add(new THREE.HemisphereLight(0xeaf3ff,0x8d9db3,.72));
  const sunL=new THREE.DirectionalLight(0xfff3e0,.6); sunL.position.set(40,60,30); g.add(sunL);
  g.add(glowSprite('#fff6dc',80,220,160,-300,.8));
  /* 설산: 꼭대기 전망대에서 사방으로 길게 내려가는 눈 비탈 */
  const T=new THREE.PlaneGeometry(560,560,200,200); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color(), S1=new THREE.Color('#eef2f8'), S2=new THREE.Color('#bfcde0'), RK=new THREE.Color('#6d7784');
  for(let i=0;i<tp.count;i++){ const x=tp.getX(i), z=tp.getZ(i), y=avalancheH(x,z); tp.setY(i,y);
    const n=nz(x*.08,4,z*.08)*.5+.5, rock=Math.hypot(x,z)>AV_DECK+8?smooth(.78,.9,nz(x*.03,7,z*.03)*.5+.5):0;
    c.copy(S2).lerp(S1,n).lerp(RK,rock*.7); tc[i*3]=c.r; tc[i*3+1]=c.g; tc[i*3+2]=c.b; }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  g.add(new THREE.Mesh(T,VC({shininess:14,specular:0x8899aa})));
  /* 저 아래 구름 바다, 멀리 눈 덮인 봉우리들 */
  const sea=mesh(new THREE.PlaneGeometry(2400,2400),M('#f4f7fc',{transparent:true,opacity:.92,fog:false}),0,-112,0); sea.rotation.x=-Math.PI/2; g.add(sea);
  for(let i=0;i<16;i++){ const a=i/16*TAU+R()*.2, r=420+R()*160, h=90+R()*120;
    const cg=new THREE.ConeGeometry(1,1,8,3), cp=cg.attributes.position; for(let k=0;k<cp.count;k++){ const y=cp.getY(k); if(y<.49){ const f=1+.3*nz(cp.getX(k)*3,i,cp.getZ(k)*3); cp.setX(k,cp.getX(k)*f); cp.setZ(k,cp.getZ(k)*f); } }
    cg.computeVertexNormals(); const m=mesh(cg,M('#e9eef6',{flatShading:true}),Math.cos(a)*r,-110+h/2,Math.sin(a)*r); m.scale.set(70+R()*60,h,60+R()*50); g.add(m); }
  /* 전망대: 나무 데크 바닥, 둘레 난간, 책상 */
  const wood=M('#a77a52',{shininess:10}), woodD=M('#7d5a3b',{shininess:8});
  const deck=mesh(new THREE.CylinderGeometry(AV_DECK,AV_DECK,.25,64),M('#c49a6c',{shininess:6}),0,-.1,0); g.add(deck);
  const boards=[]; for(let i=0;i<40;i++){ const x=-AV_DECK+.8*i+.4; boards.push({x,y:.03,z:0,sx:1,sy:1,sz:2*Math.sqrt(Math.max(0,AV_DECK*AV_DECK-x*x))-.2,c:i%2?'#9c7350':'#ab815c'}); }
  g.add(instances(new THREE.BoxGeometry(.76,.02,1),VC({vertexColors:false,shininess:6}),boards));
  const posts=[]; for(let i=0;i<64;i++){ const a=i/64*TAU; posts.push({x:Math.cos(a)*(AV_DECK-.3),y:.55,z:Math.sin(a)*(AV_DECK-.3)}); }
  g.add(instances(new THREE.BoxGeometry(.1,1.1,.1),woodD,posts));
  const rail=new THREE.Mesh(new THREE.TorusGeometry(AV_DECK-.3,.06,6,128),wood); rail.rotation.x=Math.PI/2; rail.position.y=1.1; g.add(rail);
  const rail2=new THREE.Mesh(new THREE.TorusGeometry(AV_DECK-.3,.04,6,128),wood); rail2.rotation.x=Math.PI/2; rail2.position.y=.6; g.add(rail2);
  /* 가운데 작은 눈사람과 깃발 */
  g.add(mesh(new THREE.SphereGeometry(.7,20,14),M('#ffffff',{shininess:20}),0,.6,0)); g.add(mesh(new THREE.SphereGeometry(.48,20,14),M('#ffffff',{shininess:20}),0,1.6,0));
  { const nose=mesh(new THREE.ConeGeometry(.07,.35,10),M('#f08a3c'),0,1.62,.5); nose.rotation.x=Math.PI/2; g.add(nose); }
  const scarf=mesh(new THREE.TorusGeometry(.42,.09,8,20),M('#e0565b'),0,1.22,0); scarf.rotation.x=Math.PI/2; g.add(scarf);
  /* 눈: 찢은 종이 조각이 눈송이가 되어 펑펑. 많이 찢을수록 굵고 많이 내린다 */
  const flakeTex=canvasTex(64,64,(c2,w,h)=>{ const gr=c2.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.55,'rgba(255,255,255,.85)'); gr.addColorStop(1,'rgba(255,255,255,0)'); c2.fillStyle=gr; c2.fillRect(0,0,w,h); });
  const FN=1600, fpos=new Float32Array(FN*3), fv=[...Array(FN)].map(()=>({life:0,x:0,y:-99,z:0,vx:0,vy:0,vz:0,ph:0}));
  const fg=new THREE.BufferGeometry(); fg.setAttribute('position',new THREE.BufferAttribute(fpos,3));
  const flakes=new THREE.Points(fg,new THREE.PointsMaterial({map:flakeTex,size:.16,transparent:true,depthWrite:false,color:0xffffff}));
  flakes.frustumCulled=false; g.add(flakes);
  let fi=0, rate=0;
  const spawn=(x,y,z,vx,vy,vz,life)=>{ const f=fv[fi]; fi=(fi+1)%FN; Object.assign(f,{x,y,z,vx,vy,vz,life:life||9,ph:Math.random()*TAU}); };
  /* 바닥에 쌓이는 눈: 데크 위로 하얀 눈이 점점 두껍게 */
  const coverM=new THREE.MeshPhongMaterial({color:0xffffff,shininess:8,transparent:true,opacity:0,depthWrite:false});
  const cover=new THREE.Mesh(new THREE.CircleGeometry(AV_DECK-.35,64),coverM); cover.rotation.x=-Math.PI/2; cover.position.y=.06; g.add(cover);
  const drifts=[]; for(let i=0;i<70;i++){ const a=R()*TAU, r=2+Math.sqrt(R())*(AV_DECK-3); drifts.push({x:Math.cos(a)*r,y:.04,z:Math.sin(a)*r,sx:.6+R()*1.4,sy:.01,sz:.5+R()*1.2,ry:R()*6,c:'#ffffff'}); }
  const driftM=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,6,0,TAU,0,Math.PI/2),M('#ffffff',{shininess:10}),drifts.length);
  { const o=new THREE.Object3D(); drifts.forEach((d,i)=>{ o.position.set(d.x,d.y,d.z); o.rotation.set(0,d.ry,0); o.scale.set(d.sx,.001,d.sz); o.updateMatrix(); driftM.setMatrixAt(i,o.matrix); }); }
  driftM.userData.noCut=true; g.add(driftM);
  let snowAmt=0;                                  // 지금까지 찢은 양(0~)
  /* ---- 손에 든 종이: 양손 사이에 걸린 한 장. 손이 모이면 와그작 구겨지고, 벌리면 수많은 조각으로 찢겨 흩날린다 ---- */
  const PW=.8, PH=.56, PX=18, PY=12;
  const ptex=(text)=>canvasTex(320,224,(c2,w,h)=>{ c2.fillStyle='#fffdf5'; c2.fillRect(0,0,w,h);
    c2.strokeStyle='rgba(110,150,210,.4)'; c2.lineWidth=2; for(let y=40;y<h-8;y+=26){ c2.beginPath(); c2.moveTo(10,y); c2.lineTo(w-10,y); c2.stroke(); }
    c2.strokeStyle='rgba(230,120,120,.45)'; c2.beginPath(); c2.moveTo(30,0); c2.lineTo(30,h); c2.stroke();
    if(text){ c2.fillStyle='#2b2a35'; c2.textAlign='center'; c2.textBaseline='middle'; let fs=74; c2.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`;
      while(c2.measureText(text).width>w-40&&fs>24){ fs-=4; c2.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`; } c2.fillText(text,w/2,h/2+4); } });
  const sheetG=new THREE.PlaneGeometry(1,1,PX,PY), sheetUV=Float32Array.from(sheetG.attributes.position.array), sheetN=Float32Array.from({length:sheetG.attributes.position.count*3},()=>Math.random()-.5);
  const sheet=new THREE.Mesh(sheetG,new THREE.MeshLambertMaterial({map:ptex(''),side:THREE.DoubleSide})); sheet.visible=false; sheet.frustumCulled=false; g.add(sheet);
  const _a=new THREE.Vector3(), _b=new THREE.Vector3(), _c=new THREE.Vector3(), _u=new THREE.Vector3(), _f=new THREE.Vector3();
  /* hl·hr: 두 손 위치, up: 위쪽, c: 구김(0 판판 ~ 1 뭉치), shake: 꽉 쥐고 떨림 */
  function sheetPose(hl,hr,up,c,shake){
    const P=sheetG.attributes.position, mid=_c.copy(hl).add(hr).multiplyScalar(.5), span=_a.copy(hr).sub(hl), L=span.length()||1e-3;
    const side=span.clone().divideScalar(L), fwd=_f.copy(side).cross(up).normalize();
    const slack=Math.max(0,PW-L);                                          /* 손이 가까워진 만큼 종이가 앞으로 불룩 */
    for(let i=0;i<P.count;i++){
      const u=sheetUV[i*3]+.5, v=sheetUV[i*3+1]+.5;   /* 원래 격자 자리(매번 덮어쓰는 위치가 아니라) */
      const flat=_b.copy(hl).addScaledVector(span,u).addScaledVector(up,(v-.5)*PH).addScaledVector(fwd,Math.sin(u*Math.PI)*slack*.55+Math.sin(u*Math.PI*3+v*2)*slack*.08);
      const n=i*3, r=.1*(1+.35*sheetN[n]);
      const wad=_u.copy(mid).addScaledVector(side,sheetN[n]*r*1.6).addScaledVector(up,sheetN[n+1]*r*1.6).addScaledVector(fwd,.05+sheetN[n+2]*r*1.4);
      flat.lerp(wad,c);
      if(shake) flat.addScaledVector(fwd,(Math.random()-.5)*shake*.02);
      P.setXYZ(i,flat.x,flat.y,flat.z);
    }
    P.needsUpdate=true; sheetG.computeVertexNormals(); sheetG.computeBoundingSphere();
  }
  /* 종이 조각: 크기·모양이 제각각인 조각 수백 개. 회전하며 팔랑팔랑 */
  const shardGeos=[0,1,2].map(k=>{ const gg=new THREE.BufferGeometry(), n=3+k, pts=[];
    const ang=[...Array(n)].map((_,i)=>i/n*TAU+(Math.random()-.5)*1.1).sort((a,b)=>a-b);
    const ring=ang.map(a=>[Math.cos(a)*(.6+Math.random()*.5),Math.sin(a)*(.5+Math.random()*.6)]);
    for(let i=0;i<n;i++){ const p1=ring[i], p2=ring[(i+1)%n]; pts.push(0,0,0,p1[0],p1[1],(Math.random()-.5)*.25,p2[0],p2[1],(Math.random()-.5)*.25); }
    gg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3)); gg.computeVertexNormals(); return gg; });
  const SN=420, shardMat=new THREE.MeshLambertMaterial({side:THREE.DoubleSide,emissive:0x8a8a8a});   /* 뒷면도 어둡지 않게(눈처럼 하얗게) */
  const shardIM=shardGeos.map(gg=>{ const im=new THREE.InstancedMesh(gg,shardMat,SN); im.frustumCulled=false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); g.add(im); return im; });
  const SCOL=['#fffdf5','#ffffff','#f6f1e4','#eef3fb','#fff7e6','#f9fbff'];
  const shards=[]; shardIM.forEach((im,k)=>{ const col=new THREE.Color(); for(let i=0;i<SN;i++){ im.setColorAt(i,col.set(SCOL[(i+k)%SCOL.length]).offsetHSL(0,0,(Math.random()-.5)*.04)); shards.push({im,i,life:0}); } im.instanceColor.needsUpdate=true; });
  let si=0; const so=new THREE.Object3D(), sq=new THREE.Quaternion(), sAx=new THREE.Vector3();
  function shard(p,v,size,life){ const s=shards[si]; si=(si+1)%shards.length;
    Object.assign(s,{x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z,size,life:life||9,age:0,ph:Math.random()*TAU,fr:1.5+Math.random()*2.5,
      q:new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6)),ax:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),spin:4+Math.random()*10,landed:false}); return s; }
  let wind=0;
  function stepShards(t,dt){
    wind=Math.sin(t*.35)*.6+Math.sin(t*1.1)*.25;
    const dirty=[false,false,false];
    for(const s of shards){
      if(s.life<=0) continue; dirty[shardIM.indexOf(s.im)]=true; s.age+=dt; s.life-=dt;
      if(!s.landed){
        /* 처음엔 휙 날아가다가, 공기 저항으로 금세 느려져 천천히 팔랑이며 내려온다 */
        const drag=s.age<.6?1.8:3.2; s.vx+=(wind-s.vx)*Math.min(1,dt*drag*.5); s.vz+=(-s.vz)*Math.min(1,dt*drag*.4);
        s.vy+=-9.8*dt*(s.age<.5?1:.25); s.vy+=(-.55-s.vy)*Math.min(1,dt*drag);
        s.ph+=dt*s.fr; const flut=Math.sin(s.ph)*.9;
        s.x+=(s.vx+flut*.6)*dt; s.y+=s.vy*dt+Math.cos(s.ph*2)*.15*dt; s.z+=(s.vz+Math.cos(s.ph)*.4)*dt;
        sAx.copy(s.ax); sq.setFromAxisAngle(sAx,s.spin*dt*(.4+Math.abs(flut))); s.q.multiply(sq);
        const gy=avalancheH(s.x,s.z)+.02; if(s.y<gy){ s.y=gy; s.landed=true; s.q.setFromEuler(new THREE.Euler(-Math.PI/2+(Math.random()-.5)*.4,0,Math.random()*6)); s.life=Math.min(s.life,4+Math.random()*3); snowAmt+=.0012; }
      }
      const fade=s.life<1?Math.max(.01,s.life):1;
      so.position.set(s.x,s.y,s.z); so.quaternion.copy(s.q); so.scale.setScalar(s.size*fade); so.updateMatrix(); s.im.setMatrixAt(s.i,so.matrix);
      if(s.life<=0){ so.scale.setScalar(0); so.updateMatrix(); s.im.setMatrixAt(s.i,so.matrix); }
    }
    shardIM.forEach((im,k)=>{ if(dirty[k]) im.instanceMatrix.needsUpdate=true; });
  }
  { const z=new THREE.Object3D(); z.scale.setScalar(0); z.updateMatrix(); shardIM.forEach(im=>{ for(let i=0;i<SN;i++) im.setMatrixAt(i,z.matrix); im.instanceMatrix.needsUpdate=true; }); }
  const avoid=[{x:0,z:0,r:1.1}];
  return {group:g,fog:{c:0xdfe9f5,n:60,f:520},bg:0xdfe9f5,bounds:{circle:[0,0,AV_DECK-1.1]},avoid,
    spawn:{x:0,z:6},spawnJ:[2,2],groundH:avalancheH,waterY:-1000,pitch:.26,pitchSit:.14,
    /* 아래 [종이 찢기] 버튼: 걸어갈 필요 없이 그 자리에서 */
    onAct(){ if(typeof Tear!=='undefined') Tear.open(); },
    /* ---- 종이 찢기 연출용 ---- */
    paperShow(text){ sheet.material.map.dispose(); sheet.material.map=ptex(text); sheet.material.needsUpdate=true; sheet.visible=true; },
    paperHide(){ sheet.visible=false; },
    paperPose(hl,hr,up,c,shake){ sheetPose(hl,hr,up,c,shake); },
    /* 촤촤촥: 뭉치가 양손 사이에서 터지듯 조각조각. 손이 벌어지는 방향으로 튄다 */
    paperShred(mid,side,up,n){ sheet.visible=false;
      for(let k=0;k<n;k++){ const sgn=Math.random()<.5?-1:1, sp=2+Math.random()*4.5;
        const v=side.clone().multiplyScalar(sgn*sp).addScaledVector(up,.5+Math.random()*2.2).add(new THREE.Vector3((Math.random()-.5)*2,(Math.random()-.5)*1,(Math.random()-.5)*2));
        shard(mid.clone().addScaledVector(side,(Math.random()-.5)*.25),v,.03+Math.pow(Math.random(),2)*.08,9+Math.random()*4); } },
    /* 만세: 손 근처 조각들을 하늘로 확 */
    paperToss(center,up){ for(const s of shards){ if(s.life>0&&!s.landed&&s.age<1.2){ const d=Math.hypot(s.x-center.x,s.z-center.z); if(d<2.5){ s.vy=3.5+Math.random()*4.5; s.vx+=(s.x-center.x)*1.4+(Math.random()-.5)*1.5; s.vz+=(s.z-center.z)*1.4+(Math.random()-.5)*1.5; s.age=0; } } }
      for(let k=0;k<60;k++){ shard(center.clone().add(new THREE.Vector3((Math.random()-.5)*.4,.2+Math.random()*.4,(Math.random()-.5)*.4)),new THREE.Vector3((Math.random()-.5)*3,4+Math.random()*5,(Math.random()-.5)*3),.02+Math.pow(Math.random(),2)*.06,10+Math.random()*4); } },
    /* 화면 가득 종이 눈: 카메라 앞 공간 위쪽에서 천천히 */
    paperSnow(cam,look,n){ for(let k=0;k<n;k++){ const d=1.2+Math.random()*9, x=cam.x+look.x*d+(Math.random()-.5)*d*1.3, z=cam.z+look.z*d+(Math.random()-.5)*d*1.3;
      shard({x,y:cam.y+1.5+Math.random()*4,z},{x:(Math.random()-.5)*.6,y:-.4,z:(Math.random()-.5)*.6},.035+Math.pow(Math.random(),1.6)*.1,11+Math.random()*4); } },
    /* 조각이 떨어져 나갈 때: 머리 위 하늘에서 그만큼 눈이 쏟아진다. size는 조각 크기(0~1) */
    tearBits(n,me){ n=Math.min(120,n); for(let k=0;k<n;k++){ const a=Math.random()*TAU, r=Math.sqrt(Math.random())*14;
      spawn((me?me.x:0)+Math.cos(a)*r,8+Math.random()*10,(me?me.z:0)+Math.sin(a)*r,(Math.random()-.5)*.6,-.8-Math.random()*.6,(Math.random()-.5)*.6,14); }
      snowAmt+=n/300; rate=Math.min(1,rate+n/200); },
    update(t,dt,me){
      stepShards(t,dt);
      /* 찢은 만큼 한동안 계속 펑펑 내리다가 서서히 그친다 */
      if(rate>0&&me){ const n=Math.floor(rate*90*dt+Math.random()); for(let k=0;k<n;k++){ const a=Math.random()*TAU, r=Math.sqrt(Math.random())*22; spawn(me.x+Math.cos(a)*r,10+Math.random()*8,me.z+Math.sin(a)*r,(Math.random()-.5)*.5,-.9-Math.random()*.5,(Math.random()-.5)*.5,16); }
        rate=Math.max(0,rate-dt*.03); }
      for(let k=0;k<FN;k++){ const f=fv[k];
        if(f.life>0){ f.life-=dt; f.ph+=dt*1.8; f.x+=(f.vx+Math.sin(f.ph)*.35+.25)*dt; f.y+=f.vy*dt; f.z+=(f.vz+Math.cos(f.ph*.7)*.3)*dt;
          const gy=avalancheH(f.x,f.z)+.05; if(f.y<gy){ f.y=gy; f.vx=f.vz=f.vy=0; if(f.life>1.5) f.life=1.5; }
          fpos[k*3]=f.x; fpos[k*3+1]=f.y; fpos[k*3+2]=f.z; }
        else fpos[k*3+1]=-99; }
      fg.attributes.position.needsUpdate=true;
      /* 쌓인 눈: 찢은 양에 따라 데크가 하얗게 덮이고 눈더미가 소복이 */
      const lv=Math.min(1,snowAmt); coverM.opacity+=(lv*.85-coverM.opacity)*Math.min(1,dt*.5);
      const h=coverM.opacity; if(Math.abs(h-(driftM.userData.h||0))>.01){ driftM.userData.h=h; const o=new THREE.Object3D(); drifts.forEach((d,i)=>{ o.position.set(d.x,d.y,d.z); o.rotation.set(0,d.ry,0); o.scale.set(d.sx,.001+h*.35*(d.sx/2),d.sz); o.updateMatrix(); driftM.setMatrixAt(i,o.matrix); }); driftM.instanceMatrix.needsUpdate=true; }
    }
  };
}
BUILD.avalanche=buildAvalanche;
