/* ---- 비 오는 원두막: 연꽃 연못 위에 같은 원두막 세 채가 지붕 있는 다리로 이어져 있다 ---- */
const RH={W:6.6,D:5.4,H:1.5,EY:4.9,RISE:2.6,L:8,BEY:4.2,BRISE:.9};
const RXD=RH.W+RH.L;                 // 이웃한 원두막 중심 사이 거리
const HUTS=[-RXD,0,RXD];
const BRIDGES=[-RXD/2,RXD/2];
/* (x,z) 위로 지붕이 있으면 그 높이, 없으면 0 */
function coverY(x,z){
  for(let i=0;i<3;i++){
    const ax=Math.abs(x-HUTS[i])/(RH.W/2+.7), az=Math.abs(z)/(RH.D/2+.7), m=Math.max(ax,az);
    if(m<1) return RH.EY+RH.RISE*(1-m);
  }
  for(let i=0;i<2;i++){
    if(Math.abs(x-BRIDGES[i])<RH.L/2&&Math.abs(z)<1.5) return RH.BEY+RH.BRISE*(1-Math.abs(z)/1.5);
  }
  return 0;
}
/* 마루와 다리가 차지하는 자리(+여유). 연잎과 연꽃은 이 밖에만 심는다 */
function blocked(x,z,m){
  if(Math.abs(z)<LAND_END-.4+m) return true;
  for(let i=0;i<3;i++) if(Math.abs(x-HUTS[i])<RH.W/2+1+m&&Math.abs(z)<RH.D/2+1+m) return true;
  return false;
}
/* 원두막이 서 있는 흙둑: 가로로 길게 놓여 연못을 앞뒤 두 밭으로 가른다 */
const LAND_Y=.35, LAND_TOP=3.8, LAND_END=6;
function landH(z){ const a=Math.abs(z); return a<LAND_TOP?LAND_Y:(a<LAND_END?LAND_Y-(a-LAND_TOP)/(LAND_END-LAND_TOP)*(LAND_Y+.45):-.45); }
function bankH(r,x,z){ return -.7+smooth(37,54,r)*3.2+smooth(54,110,r)*15+.5*nz(x*.06,0,z*.06)*smooth(40,70,r); }

function lotusGeo(){
  const parts=[];
  const ringOf=(n,tilt,len,wid,color,rot0)=>{
    for(let i=0;i<n;i++){
      const g=new THREE.SphereGeometry(1,10,8);
      g.scale(wid,len,wid*.34); g.translate(0,len*.92,0); g.rotateX(tilt); g.rotateY(rot0+i/n*TAU);
      parts.push({geo:g,color,shade:y=>.8+.35*clamp(y/.8,0,1)});
    }
  };
  ringOf(9,1.15,.34,.15,'#f0a5c1',0);
  ringOf(7,.75,.31,.14,'#f6bdd2',.22);
  ringOf(5,.38,.26,.12,'#fbd8e4',.5);
  const c=new THREE.CylinderGeometry(.09,.06,.1,10); c.translate(0,.12,0); parts.push({geo:c,color:'#e5d36a'});
  return merge(parts);
}
function leafGeo(){
  const g=new THREE.CircleGeometry(1,26); g.rotateX(-Math.PI/2);
  return displace(g,(x,y,z)=>{ const r=Math.hypot(x,z); return [x,.16*r*r*r+.02*nz(x*3,0,z*3),z]; });
}

function buildRain(){
  const g=new THREE.Group(), R=rng(31);
  g.add(skyDome('#6f7a83','#9aa5aa','#c2c9c8'));
  g.add(new THREE.HemisphereLight(0xc7d2da,0x4f5f4c,.95));
  const dl=new THREE.DirectionalLight(0xe6edf5,.4); dl.position.set(-10,25,10); g.add(dl);
  const H=RH.H, W=RH.W, D=RH.D, EY=RH.EY, L=RH.L;

  /* 연못과 둑 */
  const pond=mesh(new THREE.CircleGeometry(38,72),new THREE.MeshPhongMaterial({color:0x2f4d47,shininess:90,specular:0x7f9a94}),0,0,0);
  pond.rotation.x=-Math.PI/2; g.add(pond);
  const lg=new THREE.PlaneGeometry(92,LAND_END*2+1,184,Math.round((LAND_END*2+1)*2)); lg.rotateX(-Math.PI/2);
  const lp=lg.attributes.position, lcol=new Float32Array(lp.count*3), lc=new THREE.Color();
  const TOPC=new THREE.Color('#8a7556'), DRYC=new THREE.Color('#9a8563'), WETC=new THREE.Color('#4d4333');
  for(let i=0;i<lp.count;i++){
    const x=lp.getX(i), z=lp.getZ(i), a=Math.abs(z);
    lp.setY(i,landH(z)+(a<LAND_TOP?.03*nz(x*.4,0,z*.4):0)+(a>=LAND_TOP?.04*nz(x*.6,0,z*.6):0));
    lc.copy(TOPC).lerp(DRYC,clamp(nz(x*.3,0,z*.3)*.5+.5,0,1)*.6).lerp(WETC,smooth(LAND_TOP-.2,LAND_TOP+1.2,a)); const k=.95+.08*nz(x*.25,0,z*.25);
    lcol[i*3]=lc.r*k; lcol[i*3+1]=lc.g*k; lcol[i*3+2]=lc.b*k;
  }
  lg.setAttribute('color',new THREE.BufferAttribute(lcol,3)); lg.computeVertexNormals();
  g.add(new THREE.Mesh(lg,VC({shininess:4})));
  const bank=new THREE.RingGeometry(36,150,72,28); bank.rotateX(-Math.PI/2);
  const bp=bank.attributes.position, bcol=new Float32Array(bp.count*3), cc=new THREE.Color();
  const MUD=new THREE.Color('#6a6048'), GR=new THREE.Color('#587f4c'), DK=new THREE.Color('#3f6540');
  for(let i=0;i<bp.count;i++){
    const x=bp.getX(i), z=bp.getZ(i), r=Math.hypot(x,z);
    bp.setY(i,bankH(r,x,z));
    cc.copy(MUD).lerp(GR,smooth(37,42,r)).lerp(DK,smooth(60,100,r));
    const k=.94+.1*nz(x*.2,0,z*.2); bcol[i*3]=cc.r*k; bcol[i*3+1]=cc.g*k; bcol[i*3+2]=cc.b*k;
  }
  bank.setAttribute('color',new THREE.BufferAttribute(bcol,3)); bank.computeVertexNormals();
  g.add(new THREE.Mesh(bank,VC({shininess:4})));

  const pines=[], broads=[];
  for(let n=0;n<150;n++){
    const a=R()*TAU, r=45+R()*65, x=Math.cos(a)*r, z=Math.sin(a)*r, s=1+R()*1.3;
    const it={x,y:bankH(r,x,z)-.1,z,sx:s,sy:s,sz:s,ry:R()*6,c:choice(R,TINT)};
    (R()<.5?pines:broads).push(it);
  }
  g.add(instances(pineGeo(),VC(),pines)); g.add(instances(broadGeo(),VC(),broads));
  const hills=[[-60,-92,55,20,30],[10,-112,70,26,32],[70,-86,50,18,28],[-90,20,40,16,26],[88,30,44,18,28]].map(([x,z,sx,sy,sz],i)=>({x,y:-1,z,sx,sy,sz,ry:i,c:'#9fb5a6'}));
  g.add(instances(islandGeo(),VC(),hills));

  /* 연잎 밭 */
  const LC=['#4a8a4a','#58984f','#3f7d46','#63a055','#356f40'], leaves=[];
  let guard=0;
  while(leaves.length<1350&&guard++<9000){
    const a=R()*TAU, r=Math.sqrt(R())*35.5, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(blocked(x,z,.3)) continue;
    const s=.42+R()*.85;
    leaves.push({x,y:.03+R()*.09,z,sx:s,sy:1,sz:s,ry:R()*6,rx:(R()-.5)*.1,rz:(R()-.5)*.1,c:choice(R,LC)});
  }
  g.add(instances(leafGeo(),VC({vertexColors:false,side:THREE.DoubleSide,shininess:55,specular:0x66806a}),leaves));

  /* 연꽃 */
  const flowers=[], stems=[];
  guard=0;
  while(flowers.length<15&&guard++<3000){
    const side=flowers.length%2?1:-1, x=(R()-.5)*54, z=side*(6.8+R()*12);
    if(blocked(x,z,.9)||Math.hypot(x,z)>34) continue;
    if(flowers.some(f=>Math.hypot(f.x-x,f.z-z)<2.2)) continue;
    const top=.75+R()*.75, s=.95+R()*.5;
    flowers.push({x,y:top,z,sx:s,sy:s,sz:s,ry:R()*6,rx:(R()-.5)*.25,rz:(R()-.5)*.25,c:choice(R,['#ffffff','#ffffff','#fff1f6'])});
    stems.push({x,y:-.35,z,sx:1,sy:top+.35,sz:1,c:'#4d7a45'});
  }
  const sg=new THREE.CylinderGeometry(.03,.04,1,6); sg.translate(0,.5,0);
  g.add(instances(lotusGeo(),VC({side:THREE.DoubleSide,shininess:25}),flowers));
  g.add(instances(sg,VC({vertexColors:false,shininess:6}),stems));

  /* 원두막 세 채와 다리 */
  const wood=M('#5a4632',{shininess:6}), rail=M('#6b5238',{shininess:6});
  const box=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const matTex=canvasTex(256,192,(c,w,h)=>{
    c.fillStyle='#d8c8a0'; c.fillRect(0,0,w,h);
    const Rr=rng(6); for(let i=0;i<500;i++){ c.fillStyle=Rr()<.5?'rgba(120,96,60,.14)':'rgba(255,244,214,.18)'; c.fillRect(Rr()*w,Rr()*h,3,2); }
    c.strokeStyle='rgba(120,96,60,.28)'; c.lineWidth=1;
    for(let x=0;x<w;x+=8){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
    for(let y=0;y<h;y+=8){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
    c.strokeStyle='#8a6a4a'; c.lineWidth=8; c.strokeRect(4,4,w-8,h-8);
  });
  const strawTex=canvasTex(256,256,(c,w,h)=>{
    c.fillStyle='#7a6842'; c.fillRect(0,0,w,h);
    const Rr=rng(8), cols=['#8a7648','#6f5d3a','#9a8656','#5e4e30'];
    for(let i=0;i<320;i++){ c.fillStyle=cols[Math.floor(Rr()*4)]; c.fillRect(Rr()*w,0,1+Rr()*2.5,h); }
    for(let k=1;k<4;k++){ c.fillStyle='rgba(50,38,22,.5)'; c.fillRect(0,k*h/4-2,w,4); }
  });
  strawTex.wrapS=strawTex.wrapT=THREE.RepeatWrapping; strawTex.repeat.set(18,3);
  const strawB=strawTex.clone(); strawB.needsUpdate=true; strawB.repeat.set(10,2);

  const roofs=[], lamps=[], eaves=[], avoid=[], rects=[];
  const board=[]; // 마루와 다리 널
  const hutRail=(cx,z,sideOpen)=>{
    const px=W/2-.25;
    [H+1.05,H+.6].forEach(y=>g.add(box(W-.5,.07,.08,rail,cx,y,z)));
    for(let x=-px;x<=px+.01;x+=(2*px)/5) g.add(mesh(new THREE.CylinderGeometry(.045,.05,1.05,8),rail,cx+x,H+.52,z));
  };
  const sideRail=(cx,sx,open)=>{
    const pz=D/2-.25, x=cx+sx*(W/2-.25);
    const segs=open?[[-pz,-1.3],[1.3,pz]]:[[-pz,pz]];
    segs.forEach(([a,b])=>{
      [H+1.05,H+.6].forEach(y=>g.add(box(.08,.07,b-a,rail,x,y,(a+b)/2)));
      const n=Math.max(1,Math.round((b-a)/1.3));
      for(let k=0;k<=n;k++) g.add(mesh(new THREE.CylinderGeometry(.045,.05,1.05,8),rail,x,H+.52,a+(b-a)*k/n));
    });
  };

  HUTS.forEach((cx,hi)=>{
    const px=W/2-.25, pz=D/2-.25;
    [[-px,-pz],[px,-pz],[-px,pz],[px,pz]].forEach(([x,z])=>{
      const pg=new THREE.CylinderGeometry(.15,.18,EY+1.7,12,6); displace(pg,(a,b,c)=>[a+.02*nz(0,b,c),b,c+.02*nz(a,b,0)]);
      g.add(mesh(pg,wood,cx+x,(EY-1.7)/2,z));
    });
    [-1.6,1.6].forEach(x=>[-pz,pz].forEach(z=>g.add(mesh(new THREE.CylinderGeometry(.1,.12,H+1.6,10),wood,cx+x,(H-1.7)/2,z))));
    [-pz,pz].forEach(z=>g.add(box(W,.16,.18,wood,cx,H-.12,z)));
    [-px,px].forEach(x=>g.add(box(.18,.16,D-.2,wood,cx+x,H-.12,0)));
    [-pz,pz].forEach(z=>g.add(box(W-.3,.16,.16,wood,cx,EY-.1,z)));
    [-px,px].forEach(x=>g.add(box(.16,.16,D-.4,wood,cx+x,EY-.1,0)));
    g.add(box(W-.4,.16,.16,wood,cx,EY-.1,0));
    for(let i=0;i<13;i++) board.push({x:cx,y:H+.04,z:-D/2+.28+i*.4,sx:1,sy:1,sz:1,c:choice(R,['#8a6d4c','#7f6444','#917454','#76593c']),w:W-.1});
    hutRail(cx,-pz); hutRail(cx,pz);
    sideRail(cx,-1,hi>0); sideRail(cx,1,hi<2);
    const mat=mesh(new THREE.PlaneGeometry(3.2,2.2),M('#ffffff',{map:matTex,shininess:2}),cx+.3,H+.09,-.9); mat.rotation.x=-Math.PI/2; g.add(mat);
    /* 소반과 찻주전자 */
    const tb=new THREE.Group(); tb.position.set(cx-1.9,H+.08,-1.6);
    tb.add(mesh(new THREE.CylinderGeometry(.36,.36,.05,28),M('#6b4a32',{shininess:20}),0,.34,0));
    [0,2.1,4.2].forEach(a=>tb.add(mesh(new THREE.CylinderGeometry(.025,.03,.32,8),wood,Math.cos(a)*.24,.16,Math.sin(a)*.24)));
    const pot=mesh(new THREE.SphereGeometry(.11,20,14),M('#4f5a55',{shininess:40}),0,.5,0); pot.scale.set(1,.8,1); tb.add(pot);
    const sp=mesh(new THREE.CylinderGeometry(.015,.03,.12,8),M('#4f5a55'),.14,.52,0); sp.rotation.z=-1; tb.add(sp);
    [[.2,.42,.2],[.12,.42,.28]].forEach(([x,y,z])=>tb.add(mesh(new THREE.CylinderGeometry(.05,.04,.05,14),M('#e9e4d8',{shininess:30}),x,y,z)));
    g.add(tb); avoid.push({x:cx-1.9,z:-1.6,r:.55});
    /* 지붕 */
    const rg=new THREE.CylinderGeometry(.35,(W/2+.7)/Math.cos(Math.PI/4),RH.RISE,4,10,false); rg.rotateY(Math.PI/4);
    displace(rg,(x,y,z)=>[x,y+.06*nz(x*2.4,y*2,z*2.4),z]);
    const rm=new THREE.MeshPhongMaterial({color:0xffffff,map:strawTex,shininess:12,transparent:true});
    const roof=new THREE.Mesh(rg,rm); roof.scale.set(1,1,(D/2+.7)/(W/2+.7)); roof.position.set(cx,EY+RH.RISE/2,0); g.add(roof);
    roofs.push({obj:roof,mat:rm});
    /* 등불 */
    g.add(mesh(new THREE.CylinderGeometry(.012,.012,.5,6),wood,cx+1.2,EY+.1,-.2));
    g.add(mesh(new THREE.CylinderGeometry(.15,.15,.32,18),B('#ffe3a8'),cx+1.2,EY-.3,-.2));
    const lamp=new THREE.PointLight(0xffc98a,1.2,12,2); lamp.position.set(cx+1.2,EY-.4,-.2); g.add(lamp); lamps.push(lamp);
    g.add(glowSprite('#ffd79a',2.8,cx+1.2,EY-.3,-.2,.8));
    /* 처마 물방울 자리 */
    for(let k=0;k<26;k++){
      const e=k%4; let x,z;
      if(e===0){ x=cx+(R()-.5)*(W+1.2); z=D/2+.7; }
      else if(e===1){ x=cx+(R()-.5)*(W+1.2); z=-D/2-.7; }
      else if(e===2&&hi===2){ x=cx+W/2+.7; z=(R()-.5)*(D+1); }
      else if(e===3&&hi===0){ x=cx-W/2-.7; z=(R()-.5)*(D+1); }
      else { x=cx+(R()-.5)*(W+1.2); z=(R()<.5?1:-1)*(D/2+.7); }
      eaves.push({x,z,top:EY,y:EY,vy:0,wait:R()*1.6});
    }
    rects.push([cx-W/2+.75,cx+W/2-.75,-D/2+.75,D/2-.75]);
  });

  /* 지붕 있는 다리 */
  const strawM=new THREE.MeshPhongMaterial({color:0xffffff,map:strawB,shininess:12,transparent:true});
  BRIDGES.forEach((bx,bi)=>{
    const xa=bx-L/2, xb=bx+L/2;
    for(let x=xa+.2;x<xb;x+=.4) board.push({x,y:H+.04,z:0,sx:1,sy:1,sz:1,c:choice(R,['#8a6d4c','#7f6444','#917454','#76593c']),bridge:true});
    [-1.05,1.05].forEach(z=>g.add(box(L,.16,.18,wood,bx,H-.12,z)));
    for(let x=xa+1;x<xb;x+=2) g.add(box(.14,.14,2.3,wood,x,H-.12,0));
    for(let x=xa+2;x<xb-1;x+=3) [-.9,.9].forEach(z=>g.add(mesh(new THREE.CylinderGeometry(.1,.12,H+1.6,10),wood,x,(H-1.7)/2,z)));
    const nP=5;
    for(let k=0;k<nP;k++){
      const x=xa+.4+(L-.8)*k/(nP-1);
      [-1.15,1.15].forEach(z=>g.add(mesh(new THREE.CylinderGeometry(.08,.1,RH.BEY-H,10),wood,x,H+(RH.BEY-H)/2,z)));
      g.add(box(.14,.14,2.5,wood,x,RH.BEY-.08,0));
    }
    [-1.15,1.15].forEach(z=>{
      [H+1.05,H+.6].forEach(y=>g.add(box(L,.07,.08,rail,bx,y,z)));
      g.add(box(L,.14,.14,wood,bx,RH.BEY-.08,z));
    });
    const half=Math.hypot(1.55,RH.BRISE), ang=Math.atan2(RH.BRISE,1.55);
    const roofG=new THREE.Group();
    [-1,1].forEach(sg2=>{
      const sl=mesh(new THREE.BoxGeometry(L+1.1,.12,half+.1),strawM,bx,RH.BEY+RH.BRISE/2,sg2*.78); sl.rotation.x=sg2*ang; roofG.add(sl);
    });
    roofG.add(box(L+1.1,.14,.2,wood,bx,RH.BEY+RH.BRISE+.04,0));
    g.add(roofG); roofs.push({obj:roofG,mat:strawM});
    rects.push([xa-.95,xb+.95,-.75,.75]);
    for(let k=0;k<14;k++){ const x=xa+(L)*(k+R())/14, z=(k%2?1:-1)*1.5; eaves.push({x,z,top:RH.BEY,y:RH.BEY,vy:0,wait:R()*1.6}); }
  });
  /* 널빤지는 모양이 달라서 두 묶음으로 */
  const hb=board.filter(b=>!b.bridge).map(b=>({x:b.x,y:b.y,z:b.z,sx:1,sy:1,sz:1,c:b.c}));
  const bb=board.filter(b=>b.bridge).map(b=>({x:b.x,y:b.y,z:b.z,sx:1,sy:1,sz:1,c:b.c}));
  g.add(instances(new THREE.BoxGeometry(W-.1,.08,.36),VC({vertexColors:false,shininess:8}),hb));
  g.add(instances(new THREE.BoxGeometry(.36,.08,2.3),VC({vertexColors:false,shininess:8}),bb));

  const steam=points(8,0,'#e8eef2',.22,null,i=>[0,H+.6+i*.08,0]); g.add(steam);
  const sp2=steam.geometry.attributes.position;
  const tx0=HUTS[1]-1.9+.14, tz0=-1.6;

  /* 낮게 깔리는 안개 */
  const mistA=softTex(22,'205,212,216',.26), mistB=softTex(18,'190,200,206',.22);
  [mistA,mistB].forEach((tx,i)=>{ tx.repeat.set(2.4,1.6); const m=mesh(new THREE.PlaneGeometry(190,190),new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:.34-i*.08,depthWrite:false}),0,.5+i*.7,0); m.rotation.x=-Math.PI/2; g.add(m); });

  /* 물결 고리 */
  const ringG=new THREE.RingGeometry(.9,1,24), rings=[];
  for(let i=0;i<40;i++){
    const m=mesh(ringG,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,.14,0);
    m.rotation.x=-Math.PI/2; m.visible=false; m.userData={age:9,life:1,max:.5}; g.add(m); rings.push(m);
  }
  let rcount=0, spawnAcc=0, lastEave=0;
  const spawnRing=(x,z,max,life,y)=>{ const r=rings[rcount++%rings.length]; r.position.set(x,y==null?.14:y,z); r.userData.age=0; r.userData.life=life; r.userData.max=max; r.visible=true; };

  /* 빗줄기와 처마 물방울 */
  const N=reduce?900:2400, RW=44, TOP=16, WIND=1.4;
  const rd=new Float32Array(N*3), rv=new Float32Array(N), rpos=new Float32Array(N*6);
  for(let i=0;i<N;i++){ rd[i*3]=(R()-.5)*RW; rd[i*3+1]=R()*TOP; rd[i*3+2]=(R()-.5)*RW; rv[i]=15+R()*5; }
  const rgeo=new THREE.BufferGeometry(); rgeo.setAttribute('position',new THREE.BufferAttribute(rpos,3));
  const rain=new THREE.LineSegments(rgeo,new THREE.LineBasicMaterial({color:0xd5dde4,transparent:true,opacity:.42})); rain.frustumCulled=false; g.add(rain);
  const EN=eaves.length, epos=new Float32Array(EN*6);
  const egeo=new THREE.BufferGeometry(); egeo.setAttribute('position',new THREE.BufferAttribute(epos,3));
  const eave=new THREE.LineSegments(egeo,new THREE.LineBasicMaterial({color:0xe8f0f6,transparent:true,opacity:.75})); eave.frustumCulled=false; g.add(eave);

  const rc=new THREE.Raycaster(), dir=new THREE.Vector3(), head=new THREE.Vector3();
  const bounds={union:rects};
  return {group:g,fog:{c:0x9aa59f,n:10,f:125},bg:0x9aa59f,bounds,avoid,
    spawn:{x:0,z:.3},floorY:H,pitch:.16,pitchSit:.1,
    update(t,dt,me){
      const s=spd();
      const cx=me?me.x:0, cz=me?me.z:0;
      for(let i=0;i<N;i++){
        const i3=i*3;
        let x=rd[i3]+WIND*dt, y=rd[i3+1]-rv[i]*dt*s, z=rd[i3+2];
        if(x-cx>RW/2) x-=RW; else if(x-cx<-RW/2) x+=RW;
        if(z-cz>RW/2) z-=RW; else if(z-cz<-RW/2) z+=RW;
        const cv=coverY(x,z);
        if(y<Math.max(0,landH(z))||(cv>0&&y<cv)){ y=TOP+Math.random()*3; x=cx+(Math.random()-.5)*RW; z=cz+(Math.random()-.5)*RW; }
        rd[i3]=x; rd[i3+1]=y; rd[i3+2]=z;
        const j=i*6; rpos[j]=x; rpos[j+1]=y; rpos[j+2]=z; rpos[j+3]=x-WIND*.03; rpos[j+4]=y+.6; rpos[j+5]=z;
      }
      rgeo.attributes.position.needsUpdate=true;
      for(let i=0;i<EN;i++){
        const d=eaves[i], j=i*6;
        if(d.wait>0){ d.wait-=dt; epos[j]=d.x; epos[j+1]=d.top; epos[j+2]=d.z; epos[j+3]=d.x; epos[j+4]=d.top; epos[j+5]=d.z; continue; }
        d.vy+=18*dt*s; d.y-=d.vy*dt;
        if(d.y<=Math.max(0,landH(d.z))+.03){
          spawnRing(d.x,d.z,.3,.7,landH(d.z)+.03); d.wait=.2+Math.random()*1.1; d.y=d.top; d.vy=0;
          if(Math.random()<.07&&t-lastEave>.18){ lastEave=t; Sound.event('eave'); }
        }
        epos[j]=d.x; epos[j+1]=d.y; epos[j+2]=d.z; epos[j+3]=d.x; epos[j+4]=d.y+.3+d.vy*.012; epos[j+5]=d.z;
      }
      egeo.attributes.position.needsUpdate=true;
      spawnAcc+=dt*(reduce?8:20);
      while(spawnAcc>=1){
        spawnAcc-=1;
        const x=cx+(Math.random()-.5)*24, z=cz+(Math.random()-.5)*24;
        if(Math.hypot(x,z)>36||Math.abs(z)<LAND_END-.8||coverY(x,z)>0) continue;
        spawnRing(x,z,.3+Math.random()*.3,.9);
      }
      rings.forEach(r=>{
        if(!r.visible) return;
        const u=r.userData; u.age+=dt; const k=u.age/u.life;
        if(k>=1){ r.visible=false; return; }
        const sc=u.max*(.2+k); r.scale.set(sc,sc,1); r.material.opacity=.5*(1-k);
      });
      lamps.forEach((l,i)=>{ l.intensity=1.15+.12*Math.sin(t*7+i)*Math.sin(t*3.1+i); });
      for(let i=0;i<sp2.count;i++){ let y=sp2.getY(i)+dt*.25*s; if(y>H+1.95) y-=.55; sp2.setY(i,y); sp2.setX(i,tx0+Math.sin(t+i)*.04*(y-H-.4)); sp2.setZ(i,tz0); }
      sp2.needsUpdate=true;
      [mistA,mistB].forEach((tx,i)=>{ tx.offset.x+=dt*(.003+i*.002)*s; tx.offset.y+=dt*.0015*s; });
      if(me){
        head.set(me.x,H+(me.sitting?1.1:1.6),me.z);
        dir.copy(head).sub(camera.position); const dist=dir.length(); dir.normalize();
        rc.set(camera.position,dir); rc.far=dist;
        roofs.forEach(r=>{
          const hit=rc.intersectObject(r.obj,true).length>0;
          r.mat.opacity=damp(r.mat.opacity,hit?.15:1,6,dt);
        });
      }
    }};
}
BUILD.rain=buildRain;
