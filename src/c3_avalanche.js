/* ---- 눈사태: 눈이 소복이 쌓인 시골집 뒷마당. 걱정을 쓴 종이를 가루가루 찢으면, 그 조각이 눈이 되어 펑펑 내리고 쌓인다 ---- */
const AV_DECK=16, AV_N=8, AV_SLOPE=.55;
const AV_WORRY=['카드값','내일 회의','그 사람 말','다이어트','야근','시험','잔소리'];
function avalancheH(x,z){
  const r=Math.hypot(x,z);
  return .04*nz(x*.25,1,z*.25)+smooth(AV_DECK+4,AV_DECK+70,r)*(4+3*nz(x*.03,2,z*.03))+smooth(AV_DECK+2,AV_DECK+8,r)*.3*nz(x*.1,5,z*.1);
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
/* 위를 향한 면(잎·지붕 위)에 눈을 얹는다: 법선이 위를 볼수록 하얗게 */
function snowify(geo,t,amt){
  const n=geo.attributes.normal, c=geo.attributes.color, p=geo.attributes.position;
  for(let i=0;i<n.count;i++){ const k=smooth(t,t+.3,n.getY(i)+.12*nz(p.getX(i)*2,p.getY(i)*2,p.getZ(i)*2))*(amt||.95);
    c.setXYZ(i,c.getX(i)+(.96-c.getX(i))*k,c.getY(i)+(.97-c.getY(i))*k,c.getZ(i)+(1-c.getZ(i))*k); }
  return geo;
}
function buildAvalanche(){
  const g=new THREE.Group(), R=rng(31);
  /* ---- 눈이 소복이 쌓인 시골집 뒷마당: 하얀 마당, 눈 얹은 나무와 울타리, 따뜻한 창 ---- */
  g.add(skyDome('#7fb0dc','#d6e6f3','#fbefe0'));
  g.add(new THREE.HemisphereLight(0xf6f8ff,0xb9c6d4,.85));
  const sunL=new THREE.DirectionalLight(0xffe2bc,.8); sunL.position.set(-40,35,25); g.add(sunL);
  g.add(glowSprite('#fff1c8',110,-260,120,170,.75));
  /* 잔디 마당과 울타리 너머 완만한 언덕·밭 */
  const T=new THREE.PlaneGeometry(420,420,170,170); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color(), G1=new THREE.Color('#eef3f9'), G2=new THREE.Color('#ffffff'), G3=new THREE.Color('#dde6f0'), DIRT=new THREE.Color('#c9d2dc');
  for(let i=0;i<tp.count;i++){ const x=tp.getX(i), z=tp.getZ(i), y=avalancheH(x,z); tp.setY(i,y);
    const n=nz(x*.12,4,z*.12)*.5+.5, n2=nz(x*.5,9,z*.5)*.5+.5, r=Math.hypot(x,z);
    c.copy(G1).lerp(G2,n).lerp(G3,smooth(.6,.95,n2)*.6);
    if(r>AV_DECK+6&&Math.abs(Math.sin(x*.18))<.12&&z>0) c.lerp(DIRT,.5);   /* 울타리 너머 눈 덮인 밭고랑 */
    tc[i*3]=c.r; tc[i*3+1]=c.g; tc[i*3+2]=c.b; }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  g.add(new THREE.Mesh(T,VC({shininess:14})));
  /* 잔디 포기: 바람에 살랑 */
  const GU={value:0};
  const grassMat=swayMat(new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:0}),GU,.08); grassMat.userData.noCut=true;
  const tufts=[[],[],[]]; for(let i=0;i<260;i++){ const a=R()*TAU, r=Math.sqrt(R())*(AV_DECK+30), x=Math.cos(a)*r, z=Math.sin(a)*r; if(z<-AV_DECK+1&&Math.abs(x)<9) continue;
    const s=.1+R()*.08; tufts[i%3].push({x,y:avalancheH(x,z),z,sx:s,sy:s*(.8+R()*.5),sz:s,ry:R()*6}); }
  [tuftGeo(11,14,.8,1.2,.4,.1),tuftGeo(12,12,.7,1.1,.45,.15),tuftGeo(13,16,.9,1.3,.38,.05)].forEach((tg,i)=>g.add(instances(tg,grassMat,tufts[i])));
  /* 시골집: 하얀 벽, 나무 기둥, 기와 지붕, 따뜻한 창, 툇마루 */
  const wood=M('#9a6b43',{shininess:8}), woodD=M('#6e4a2d',{shininess:6});
  const hz=-AV_DECK-4.2;
  g.add(mesh(new THREE.BoxGeometry(15,4.2,7),M('#f3ead8',{shininess:4}),0,2.1,hz-1.5));
  [-7.2,-3.6,0,3.6,7.2].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.32,4.3,.32),woodD,x,2.15,hz+2.05)));
  g.add(mesh(new THREE.BoxGeometry(15.2,.28,.36),woodD,0,4.1,hz+2.05));
  const roof=mesh(new THREE.CylinderGeometry(4.6,4.6,17,3,1),M('#5d4a3e',{shininess:10,flatShading:true}),0,5.6,hz-1.5); roof.rotation.z=Math.PI/2; roof.rotation.x=Math.PI/2; roof.scale.set(1,1,.62); g.add(roof);
  { const sr=mesh(new THREE.CylinderGeometry(4.6,4.6,17.3,3,1),M('#f7faff',{shininess:20,flatShading:true}),0,5.78,hz-1.5); sr.rotation.z=Math.PI/2; sr.rotation.x=Math.PI/2; sr.scale.set(.97,1,.62); g.add(sr); }   /* 지붕에 소복한 눈 */
  g.add(mesh(new THREE.BoxGeometry(.9,2.2,.9),M('#a88e78'),4.5,6.6,hz-2.2)); g.add(mesh(new THREE.BoxGeometry(1,.16,1),M('#f7faff'),4.5,7.76,hz-2.2));
  [-5.4,-1.8,1.8,5.4].forEach(x=>{ g.add(mesh(new THREE.BoxGeometry(2.2,1.6,.08),M('#ffe2a8',{emissive:0x7a5520}),x,2.4,hz+2.03)); g.add(mesh(new THREE.BoxGeometry(.06,1.6,.1),woodD,x,2.4,hz+2.06)); g.add(mesh(new THREE.BoxGeometry(2.2,.06,.1),woodD,x,2.4,hz+2.06)); });
  g.add(mesh(new THREE.BoxGeometry(15,.36,2.4),wood,0,.55,hz+3.2));                       /* 툇마루 */
  [-7,-3.5,0,3.5,7].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.22,.55,.22),woodD,x,.27,hz+4.2)));
  g.add(mesh(new THREE.BoxGeometry(1.4,.12,.7),M('#d8c3a0'),-2.2,.78,hz+3.0));              /* 툇마루 위 방석 */
  g.add(mesh(new THREE.CylinderGeometry(.18,.14,.28,12),M('#7a9bb5'),2.6,.86,hz+3.1));      /* 물 주전자 */
  /* 나무 울타리: 집 쪽만 트이고 마당을 빙 두른다 */
  const pickets=[], fr=AV_DECK-.4;
  for(let i=0;i<150;i++){ const a=i/150*TAU, x=Math.cos(a)*fr, z=Math.sin(a)*fr; if(z<-fr*.62) continue; pickets.push({x,y:.55,z,sx:1,sy:1+((i%3)?0:.12),sz:1,ry:-a,c:choice(R,['#c9a477','#bf9a6c','#d2ae80'])}); }
  g.add(instances(new THREE.BoxGeometry(.12,1.1,.05),VC({vertexColors:false,shininess:6}),pickets));
  g.add(instances(new THREE.SphereGeometry(1,8,5,0,TAU,0,Math.PI/2),VC({vertexColors:false,shininess:12}),pickets.map(p=>({x:p.x,y:p.y+.55*p.sy,z:p.z,sx:.085,sy:.07,sz:.06,ry:p.ry,c:'#f8fbff'}))));   /* 말뚝 위 눈 모자 */
  /* 가로대: 짧은 토막으로 이어 붙여 카메라 앞을 가리면 지워지게 */
  const rails=[]; [.35,.85].forEach(y=>{ for(let i=0;i<150;i++){ const a=(i+.5)/150*TAU, x=Math.cos(a)*fr, z=Math.sin(a)*fr; if(z<-fr*.62) continue; rails.push({x,y,z,sx:1,sy:1,sz:1,ry:-a,c:'#b8915f'}); } });
  g.add(instances(new THREE.BoxGeometry(.06,.07,TAU*fr/150+.02),VC({vertexColors:false,shininess:6}),rails));
  g.add(instances(new THREE.BoxGeometry(.075,.05,TAU*fr/150+.02),VC({vertexColors:false,shininess:12}),rails.map(r=>({x:r.x,y:r.y+.055,z:r.z,sx:1,sy:1,sz:1,ry:r.ry,c:'#f8fbff'}))));   /* 가로대 위 눈 */
  /* 큰 나무들(울타리 안 귀퉁이에 둘, 바깥에 여럿)과 덤불, 꽃 */
  const trees=[{x:-11,z:5,s:1.25},{x:10.5,z:-6,s:1.1}]; for(let i=0;i<34;i++){ const a=R()*TAU, r=AV_DECK+5+R()*45; const x=Math.cos(a)*r, z=Math.sin(a)*r; if(z<-AV_DECK-8&&Math.abs(x)<14) continue; trees.push({x,z,s:.9+R()*.8}); }
  g.add(instances(snowify(broadGeo(),.15),VC(),trees.slice(0,2).map(t=>({x:t.x,y:avalancheH(t.x,t.z)-.1,z:t.z,sx:t.s,sy:t.s*(.9+R()*.3),sz:t.s,ry:R()*6}))));
  g.add(instances(snowify(pineGeo(),.05),VC(),trees.slice(2).map(t=>({x:t.x,y:avalancheH(t.x,t.z)-.1,z:t.z,sx:t.s,sy:t.s*(.9+R()*.3),sz:t.s,ry:R()*6}))));   /* 울타리 너머: 눈 얹은 소나무 */
  const bushes=[]; for(let i=0;i<40;i++){ const a=R()*TAU, x=Math.cos(a)*(fr-.9), z=Math.sin(a)*(fr-.9); if(z<-fr*.55) continue; const s=.45+R()*.4; bushes.push({x,y:0,z,sx:s*1.2,sy:s,sz:s*1.2,ry:R()*6}); }
  g.add(instances(snowify(bushGeo(),-.1,.97),VC(),bushes));
  /* 꽃 대신: 마당 한쪽 눈사람 */
  { const sx=-6.5, sz=-2.5, sm=M('#fbfdff',{shininess:18});
    g.add(mesh(new THREE.SphereGeometry(.75,20,14),sm,sx,.62,sz)); g.add(mesh(new THREE.SphereGeometry(.52,20,14),sm,sx,1.6,sz)); g.add(mesh(new THREE.SphereGeometry(.36,20,14),sm,sx,2.3,sz));
    const nose=mesh(new THREE.ConeGeometry(.07,.32,10),M('#ff8a3a'),sx,2.32,sz+.45); nose.rotation.x=Math.PI/2; g.add(nose);
    [-.12,.12].forEach(dx=>g.add(mesh(new THREE.SphereGeometry(.045,8,6),M('#2a2a2a'),sx+dx,2.42,sz+.31)));
    [1.45,1.7,1.95].forEach((y,i)=>g.add(mesh(new THREE.SphereGeometry(.05,8,6),M('#2a2a2a'),sx,y,sz+.5-(i===1?.02:.04))));
    const sc=mesh(new THREE.TorusGeometry(.4,.09,8,20),M('#d8483a'),sx,2.02,sz); sc.rotation.x=Math.PI/2; g.add(sc);
    const hat=mesh(new THREE.CylinderGeometry(.24,.26,.32,16),M('#3a3a46'),sx,2.72,sz); g.add(hat); g.add(mesh(new THREE.CylinderGeometry(.38,.38,.04,16),M('#3a3a46'),sx,2.57,sz));
    [-1,1].forEach(d=>{ const arm=mesh(new THREE.CylinderGeometry(.025,.035,1,6),M('#6b4a2e'),sx+d*.75,1.85,sz); arm.rotation.z=d*-1.0; g.add(arm); }); }
  /* 빨랫줄과 하얀 이불 홑청 */
  [[-9,-4],[-4,-9.5]].forEach(([x,z])=>g.add(mesh(new THREE.CylinderGeometry(.06,.07,2.4,8),woodD,x,1.2,z)));
  { const p1=new THREE.Vector3(-9,2.2,-4), p2=new THREE.Vector3(-4,2.2,-9.5), L=p1.distanceTo(p2), mid=p1.clone().add(p2).multiplyScalar(.5);
    const line=mesh(new THREE.CylinderGeometry(.01,.01,L,4),M('#eeeeee'),mid.x,2.18,mid.z); line.rotation.z=Math.PI/2; line.rotation.y=Math.atan2(p1.z-p2.z,p2.x-p1.x); g.add(line);
    [.3,.62].forEach(k=>{ const q=p1.clone().lerp(p2,k); const sh=mesh(new THREE.PlaneGeometry(1.6,1.2,6,4),M(k<.5?'#ffffff':'#f7e9c8',{side:THREE.DoubleSide}),q.x,1.55,q.z); sh.rotation.y=Math.atan2(p1.z-p2.z,p2.x-p1.x); g.add(sh); }); }
  /* 텃밭 */
  g.add(mesh(new THREE.BoxGeometry(4.3,.22,2.7),M('#7a5a3a'),8,.06,6));
  { const mound=mesh(new THREE.SphereGeometry(1,24,10,0,TAU,0,Math.PI/2),M('#f8fbff',{shininess:14}),8,.15,6); mound.scale.set(2.2,.28,1.4); g.add(mound); }   /* 눈 덮인 텃밭 */
  /* 살랑이는 나비 */
  const motes=points(60,0,'#ffffff',.07,null,()=>[(R()-.5)*30,.4+R()*6,(R()-.5)*30]); g.add(motes);   /* 공기 중에 반짝이는 잔눈 */
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
  { const o=new THREE.Object3D(); drifts.forEach((d,i)=>{ o.position.set(d.x,d.y,d.z); o.rotation.set(0,d.ry,0); o.scale.set(d.sx,.12*(d.sx/2),d.sz); o.updateMatrix(); driftM.setMatrixAt(i,o.matrix); }); }
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
  shardMat.userData.noCut=true;   /* 시야 가림 지우기에서 빼기: 손에 쥔 조각과 눈앞 종이 눈이 사라지지 않게 */
  const shardIM=shardGeos.map(gg=>{ const im=new THREE.InstancedMesh(gg,shardMat,SN); im.frustumCulled=false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); g.add(im); return im; });
  const SCOL=['#fffdf5','#ffffff','#f6f1e4','#eef3fb','#fff7e6','#f9fbff'];
  const shards=[]; shardIM.forEach((im,k)=>{ const col=new THREE.Color(); for(let i=0;i<SN;i++){ im.setColorAt(i,col.set(SCOL[(i+k)%SCOL.length]).offsetHSL(0,0,(Math.random()-.5)*.04)); shards.push({im,i,life:0}); } im.instanceColor.needsUpdate=true; });
  let si=0; const so=new THREE.Object3D(), sq=new THREE.Quaternion(), sAx=new THREE.Vector3();
  function shard(p,v,size,life){ const s=shards[si]; si=(si+1)%shards.length;
    Object.assign(s,{x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z,size,life:life||9,age:0,ph:Math.random()*TAU,fr:1.5+Math.random()*2.5,
      q:new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random()*6,Math.random()*6,Math.random()*6)),ax:new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize(),spin:4+Math.random()*10,landed:false,held:false,gone:false}); return s; }
  let wind=0, held=[];
  function stepShards(t,dt){
    wind=Math.sin(t*.35)*.6+Math.sin(t*1.1)*.25;
    const dirty=[false,false,false];
    for(const s of shards){
      if(s.life<=0){ if(!s.gone&&s.im){ s.gone=true; so.scale.setScalar(0); so.position.set(0,-99,0); so.updateMatrix(); s.im.setMatrixAt(s.i,so.matrix); dirty[shardIM.indexOf(s.im)]=true; } continue; }   /* 다 된 조각은 한 번 확실히 지운다(공중에 멈춰 남지 않게) */
      dirty[shardIM.indexOf(s.im)]=true;
      if(s.held){ so.position.set(s.x,s.y,s.z); so.quaternion.copy(s.q); so.scale.setScalar(s.size); so.updateMatrix(); s.im.setMatrixAt(s.i,so.matrix); continue; }   /* 손에 쥔 조각은 손이 움직인다 */
      s.age+=dt; s.life-=dt;
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
  const avoid=[{x:-6.5,z:-2.5,r:.9},{x:-11,z:5,r:.9},{x:10.5,z:-6,r:.8},{x:8,z:6,r:2.2},{x:-9,z:-4,r:.3},{x:-4,z:-9.5,r:.3}];
  return {group:g,fog:{c:0xe9eff6,n:45,f:240},bg:0xe9eff6,bounds:{circle:[0,0,AV_DECK-2]},avoid,
    spawn:{x:0,z:6},spawnJ:[2,2],groundH:avalancheH,waterY:-1000,pitch:.26,pitchSit:.14,
    /* 아래 [종이 찢기] 버튼: 걸어갈 필요 없이 그 자리에서 */
    onAct(){ if(typeof Tear!=='undefined') Tear.open(); },
    /* ---- 종이 찢기 연출용 ---- */
    paperShow(text){ sheet.material.map.dispose(); sheet.material.map=ptex(text); sheet.material.needsUpdate=true; sheet.visible=true; },
    paperHide(){ sheet.visible=false; },
    /* ---- 손에 쥔 조각 뭉치: 찢을 때마다 수는 두 배, 크기는 작아진다 ---- */
    heldSet(n,size){
      held.forEach(s=>{ s.held=false; s.life=0; });
      held=[]; for(let k=0;k<n;k++){ const s=shard({x:0,y:-50,z:0},{x:0,y:0,z:0},size*(.75+Math.random()*.5),30); s.held=true;
        s.side=k%2?1:-1; s.ou=(Math.random()-.5)*size*2.2; s.ov=(Math.random()-.5)*size*2.6; s.of=(Math.random()-.5)*.05; s.tw=(Math.random()-.5)*.8; held.push(s); }
    },
    /* 손 위치에 맞춰 뭉치를 붙인다: 왼쪽 반은 왼손, 오른쪽 반은 오른손. 손이 모이면 한 덩이 */
    heldPose(hl,hr,up,shake){
      const side=_a.copy(hr).sub(hl), L=side.length()||1e-3; side.divideScalar(L); const fwd=_f.copy(side).cross(up).normalize();
      const look=new THREE.Matrix4().makeBasis(side,up,fwd), q0=new THREE.Quaternion().setFromRotationMatrix(look);
      held.forEach(s=>{ const h=s.side<0?hl:hr, inward=s.side<0?1:-1;
        const a1=inward*.03+s.ou*.35, a2=.05+s.ov*.6, a3=.05+s.of;   /* 손 바로 위로 삐죽: 손에 쥔 종이 뭉치처럼 */
        s.x=h.x+side.x*a1+up.x*a2+fwd.x*a3; s.y=h.y+side.y*a1+up.y*a2+fwd.y*a3; s.z=h.z+side.z*a1+up.z*a2+fwd.z*a3;
        if(shake){ s.x+=(Math.random()-.5)*.012; s.y+=(Math.random()-.5)*.012; }
        s.q.copy(q0).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(s.tw*.6,s.tw*.5,s.tw))); });
    },
    /* 찢길 때 떨어져 나가는 부스러기 */
    heldCrumbs(mid,side,up,n,size){ for(let k=0;k<n;k++){ const sg=Math.random()<.5?-1:1, sp=1+Math.random()*2.5;
      shard(mid.clone().addScaledVector(side,(Math.random()-.5)*.4),side.clone().multiplyScalar(sg*sp).addScaledVector(up,.3+Math.random()*1.5).add(new THREE.Vector3((Math.random()-.5),(Math.random()-.5)*.5,(Math.random()-.5))),size*(.5+Math.random()*.7),8+Math.random()*3); } },
    /* 촤!!!!!: 쥐고 있던 조각을 전부 하늘로 */
    heldInfo(){ return held.map(s=>[+s.x.toFixed(2),+s.y.toFixed(2),+s.z.toFixed(2),+s.size.toFixed(3),s.life>0,s.held]); },
    heldRelease(up){ held.forEach(s=>{ s.held=false; s.age=0; s.life=12+Math.random()*4; s.vx=(Math.random()-.5)*3.5; s.vy=5+Math.random()*6; s.vz=(Math.random()-.5)*3.5; }); held=[]; },
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
      stepShards(t,dt); GU.value=t;
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
      const h=coverM.opacity; if(Math.abs(h-(driftM.userData.h||0))>.01){ driftM.userData.h=h; const o=new THREE.Object3D(); drifts.forEach((d,i)=>{ o.position.set(d.x,d.y,d.z); o.rotation.set(0,d.ry,0); o.scale.set(d.sx,(.12+h*.35)*(d.sx/2),d.sz); o.updateMatrix(); driftM.setMatrixAt(i,o.matrix); }); driftM.instanceMatrix.needsUpdate=true; }
    }
  };
}
BUILD.avalanche=buildAvalanche;
