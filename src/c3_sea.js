/* ---- 바다: 먼 섬과 등대, 발자국이 남는 모래, 밀려와 발자국을 씻어 가는 파도, 조개껍질 ---- */
const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
/* 바닷속 바닥: 무릎 깊이(-.9)까지는 완만하게, 그 너머는 더 가파르게 깊어져 헤엄칠 수 있다 */
const SEA_WATER=-.15;
function sandH(x,z){ const d=-1-z; return (z<-1?-(d<6.43?d*.14:.9+(d-6.43)*.2):0)+.05*Math.sin(x*.2)*Math.sin(z*.15); }

/* 해변 뒤쪽: 모래가 풀 덮인 둔덕으로 올라가고, 양 끝은 숲 우거진 곶이 된다 */
function seaBackH(x,z){
  return sandH(x,z)+.5*smooth(26,40,z)*(.5+.5*nz(x*.08,0,z*.08))+14*smooth(42,100,z)*(.7+.3*nz(x*.03,1,z*.03))+9*smooth(78,130,Math.abs(x))*smooth(-10,30,z);
}
/* 야자나무: 휜 줄기와 아래로 처진 잎 */
function palmGeo(){
  const parts=[], trunk=new THREE.CylinderGeometry(.13,.26,8,8,12); trunk.translate(0,4,0);
  const bend=y=>1.7*Math.pow(y/8,2);
  displace(trunk,(x,y,z)=>{ const k=1+.07*Math.sin(y*9); return [x*k+bend(y),y,z*k]; });
  parts.push({geo:trunk,color:'#8c7255',shade:y=>.75+.3*clamp(y/8,0,1)});
  const cx=bend(8);
  for(let i=0;i<10;i++){
    const f=new THREE.PlaneGeometry(3.5,.9,10,1); f.rotateX(-Math.PI/2); f.translate(1.75,0,0);
    displace(f,(x,y,z)=>{ const t=x/3.5; const edge=1+.25*Math.sin(x*14)*Math.sign(z||1); return [x,.62*x-.19*x*x,z*(1-.7*t*t)*edge]; });
    f.rotateY(i/10*TAU+.3*(i%2)); f.translate(cx,8,0);
    parts.push({geo:f,color:'#4c8a3d',shade:y=>.65+.45*clamp((y-6.3)/2,0,1)});
  }
  for(let i=0;i<3;i++){ const c=new THREE.SphereGeometry(.17,8,6); c.translate(cx+(i-1)*.22,7.75,(i%2)*.2-.1); parts.push({geo:c,color:'#5a4630'}); }
  return merge(parts);
}
function buildSea(){
  const g=new THREE.Group(), R=rng(4);
  g.add(skyDome('#6fa6d8','#cfe3ee','#f7d9b8'));
  g.add(new THREE.HemisphereLight(0xcfe6ff,0xe8d3b0,.95));
  const sd=new THREE.Vector3(.5,.2,-1).normalize();
  const dl=new THREE.DirectionalLight(0xffe2b8,.85); dl.position.copy(sd).multiplyScalar(50); g.add(dl);
  g.add(glowSprite('#ffe2b0',130,sd.x*420,sd.y*420,sd.z*420,.9));
  const disc=mesh(new THREE.CircleGeometry(13,32),B('#fff3da',{fog:false}),sd.x*430,sd.y*430,sd.z*430); disc.lookAt(0,0,0); g.add(disc);

  /* 모래: 알갱이 무늬 */
  const sg=new THREE.PlaneGeometry(900,200,300,100); sg.rotateX(-Math.PI/2);
  const sp0=sg.attributes.position, sc0=new Float32Array(sp0.count*3), cw=new THREE.Color(), DUNE=new THREE.Color('#b9b878'), JUN=new THREE.Color('#4f8b45'), DEEP=new THREE.Color('#3c6b3b');
  for(let i=0;i<sp0.count;i++){
    const x=sp0.getX(i), z=sp0.getZ(i)+40, nn=.6+.4*nz(x*.1,0,z*.1);
    sp0.setY(i,seaBackH(x,z));
    cw.setRGB(1,1,1).lerp(DUNE,smooth(27,37,z)*nn).lerp(JUN,smooth(37,52,z)).lerp(DEEP,smooth(70,115,z)).lerp(JUN,smooth(72,100,Math.abs(x))*.8);
    sc0[i*3]=cw.r; sc0[i*3+1]=cw.g; sc0[i*3+2]=cw.b;
  }
  sg.setAttribute('color',new THREE.BufferAttribute(sc0,3)); sg.computeVertexNormals();
  const sand=new THREE.Mesh(sg); sand.position.z=40;
  const st=canvasTex(256,256,(c,w,h)=>{
    c.fillStyle='#f3e8cc'; c.fillRect(0,0,w,h);
    const Rr=rng(3);
    for(let i=0;i<2600;i++){ c.fillStyle=Rr()<.55?'rgba(170,145,100,.18)':'rgba(255,250,236,.32)'; c.fillRect(Rr()*w,Rr()*h,1.7,1.7); }
  });
  st.wrapS=st.wrapT=THREE.RepeatWrapping; st.repeat.set(300,47);
  sand.material=M('#ffffff',{map:st,vertexColors:true,shininess:3}); g.add(sand);

  /* 바닷물: 가까운 곳은 맑은 에메랄드빛, 멀수록 깊은 푸른빛 */
  const wg=new THREE.PlaneGeometry(900,400,100,44); wg.rotateX(-Math.PI/2);
  const wcol=new Float32Array(wg.attributes.position.count*3), wc=new THREE.Color(), AQ=new THREE.Color('#86e6d8'), TQ=new THREE.Color('#3fbccb'), BL=new THREE.Color('#1f7fb0');
  for(let i=0;i<wg.attributes.position.count;i++){
    const d=-1.7-(wg.attributes.position.getZ(i)-106);
    wc.copy(AQ).lerp(TQ,smooth(4,28,d)).lerp(BL,smooth(40,140,d));
    wcol[i*3]=wc.r; wcol[i*3+1]=wc.g; wcol[i*3+2]=wc.b;
  }
  wg.setAttribute('color',new THREE.BufferAttribute(wcol,3));
  const water=new THREE.Mesh(wg,M('#ffffff',{vertexColors:true,shininess:90,specular:0xbbddee}));
  water.position.set(0,-.15,-106); g.add(water);
  const wp=wg.attributes.position, base=[]; for(let i=0;i<wp.count;i++) base.push([wp.getX(i),wp.getZ(i)]);
  const foam=mesh(new THREE.PlaneGeometry(900,.8),B('#ffffff',{transparent:true,opacity:.5,depthWrite:false}),0,-.1,-2.1); foam.rotation.x=-Math.PI/2; g.add(foam);
  const foam2=foam.clone(); foam2.material=foam.material.clone(); g.add(foam2);

  /* 발자국 판: 모래 위에 얹은 투명한 그림판. 발을 디딜 때마다 찍고, 지우거나 파도가 씻으면 사라진다 */
  const PW=1280, PH=768, PSX=50, PSZ=30, U=PW/PSX, Z0=-4;
  let X0=-25;
  const pcv=document.createElement('canvas'); pcv.width=PW; pcv.height=PH; const pc=pcv.getContext('2d');
  const ptex=new THREE.CanvasTexture(pcv);
  const dg=new THREE.PlaneGeometry(PSX,PSZ,100,60); dg.rotateX(-Math.PI/2);
  const dp=dg.attributes.position;
  const decal=new THREE.Mesh(dg,new THREE.MeshBasicMaterial({map:ptex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  decal.position.z=Z0+PSZ/2; decal.renderOrder=1; decal.frustumCulled=false; g.add(decal);
  const fitDecal=()=>{ for(let i=0;i<dp.count;i++) dp.setY(i,sandH(X0+PSX/2+dp.getX(i),Z0+PSZ/2+dp.getZ(i))+.014); dp.needsUpdate=true; decal.position.x=X0+PSX/2; };
  fitDecal();
  let dirty=false, lastUp=0;
  let splT=0;
  function stamp(x,z,h,side){
    const cxp=(x-Math.cos(h)*.11*side-X0)*U, cyp=(z+Math.sin(h)*.11*side-Z0)*U;
    if(cxp<0||cxp>PW||cyp<0||cyp>PH) return;
    pc.save(); pc.translate(cxp,cyp); pc.rotate(-h);
    const part=(ey,rx,ry)=>{ pc.beginPath(); pc.ellipse(0,ey*U,rx*U,ry*U,0,0,TAU); pc.fill(); };
    pc.fillStyle='rgba(255,247,228,.4)'; pc.translate(.8,.8); part(.1,.085,.115); part(-.1,.06,.07); pc.translate(-.8,-.8);
    pc.fillStyle='rgba(98,76,50,.52)'; part(.1,.085,.115); part(-.1,.06,.07);
    pc.restore(); dirty=true;
  }

  /* 밀려오는 파도: 얇은 물막이 모래 위로 올라왔다가 물러난다 */
  const NC=64, SW=64, P=11.76; let bcx=0;
  const band=(rows,color,op,po,ro)=>{
    const gg=new THREE.PlaneGeometry(SW,1,NC,rows); gg.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(gg,new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,depthWrite:false,polygonOffset:true,polygonOffsetFactor:po,polygonOffsetUnits:po}));
    m.frustumCulled=false; m.renderOrder=ro; m.visible=false; g.add(m); return m;
  };
  const wet=band(6,0x6b5a40,.2,-1,2), film=band(6,0xbfe6ee,.3,-3,3), front=band(1,0xffffff,.75,-4,4);
  function setBand(m,rows,far,near,off){
    const p=m.geometry.attributes.position;
    for(let r=0;r<=rows;r++) for(let i=0;i<=NC;i++){
      const x=bcx-SW/2+i, z=lerp(far[i],near[i],r/rows); p.setXYZ(r*(NC+1)+i,x,sandH(x,z)+off,z);
    }
    p.needsUpdate=true;
  }
  const SH=-1.7;
  const zf=new Float32Array(NC+1).fill(SH), wetZ=new Float32Array(NC+1).fill(SH), shore=new Float32Array(NC+1).fill(SH), fa=new Float32Array(NC+1), fb=new Float32Array(NC+1);
  let lastWash=0;

  /* 조개껍질, 소라, 불가사리, 조약돌 */
  const shellMat=VC({vertexColors:false,shininess:30});
  const conch=[], scal=[], stars=[], pebbles=[];
  const spot=()=>{ const x=(R()-.5)*30, z=-.9+Math.pow(R(),1.5)*14; return [x,z]; };
  for(let i=0;i<4;i++){ const [x,z]=spot(), s=.55+R()*.5; conch.push({x,y:sandH(x,z)+.17*s,z,sx:s,sy:s,sz:s,rz:Math.PI/2+(R()-.5)*.3,ry:R()*6,c:choice(R,['#f0dcc4','#e6c2a0','#d9a98a','#f6e8d8'])}); }
  for(let i=0;i<6;i++){ const [x,z]=spot(), s=.13+R()*.12; scal.push({x,y:sandH(x,z)+.005,z,sx:s,sy:s*1.6,sz:s,rx:(R()-.5)*.3,ry:R()*6,c:choice(R,['#f3e3d3','#e6c9b8','#d8b5a0','#f6efe6','#cdb3cc'])}); }
  for(let i=0;i<1;i++){ const [x,z]=spot(), s=.6+R()*.4; stars.push({x,y:sandH(x,z)+.03,z,sx:s,sy:s,sz:s,ry:R()*6,c:choice(R,['#f09060','#e87a50','#f2b08a'])}); }
  for(let i=0;i<8;i++){ const x=(R()-.5)*32, z=-1.2+Math.pow(R(),1.3)*9, s=.05+R()*.1; pebbles.push({x,y:sandH(x,z)+s*.2,z,sx:s*1.3,sy:s,sz:s,ry:R()*6,c:choice(R,['#8d8478','#a39a8c','#6f6a60','#b3a89a'])}); }
  for(let i=0;i<2;i++){ const x=(R()-.5)*28, z=-1.2+R()*2.2; pebbles.push({x,y:sandH(x,z)+.02,z,sx:.5+R()*.4,sy:.07,sz:.3+R()*.2,ry:R()*6,c:'#4d5a38'}); }
  g.add(instances(conchGeo(),shellMat,conch)); g.add(instances(scallopGeo(),shellMat,scal)); g.add(instances(starGeo(),shellMat,stars)); g.add(instances(rockGeo(),VC({vertexColors:false}),pebbles));
  const rocks=[]; for(let i=0;i<3;i++){ const s=.6+R()*1.0, x=(i<5?-1:1)*(15+R()*8); rocks.push({x,y:s*.2,z:5+R()*8,sx:s*1.3,sy:s,sz:s,ry:R()*3,c:choice(R,['#9a8f80','#8a8074','#a89c8a'])}); }
  g.add(instances(rockGeo(),VC({vertexColors:false}),rocks));
  /* 프라이빗 비치: 야자숲, 우거진 언덕, 양쪽의 곶 */
  const palms=[], jungle=[], avoidL=[];
  for(let i=0;i<120;i++){
    const x=(R()-.5)*200, z=29+Math.pow(R(),1.4)*38, s2=.85+R()*.65;
    palms.push({x,y:seaBackH(x,z)-.1,z,sx:s2,sy:s2*(.9+R()*.3),sz:s2,ry:Math.PI/2+(R()-.5)*1.3,c:'#ffffff'});
  }
  for(let i=0;i<10;i++){
    const x=-56+i*12.4+(R()-.5)*5, z=21+R()*6, s2=.75+R()*.4;
    palms.push({x,y:seaBackH(x,z)-.1,z,sx:s2,sy:s2,sz:s2,ry:Math.PI/2+(R()-.5)*.8,c:'#ffffff'});
    avoidL.push({x:x+.4,z,r:.45});
  }
  for(let i=0;i<170;i++){
    const x=(R()-.5)*260, z=46+R()*70, s2=1.4+R()*1.3;
    jungle.push({x,y:seaBackH(x,z)-.1,z,sx:s2,sy:s2,sz:s2,ry:R()*6,c:choice(R,['#ffffff','#f4ffe9','#e9f7dc'])});
  }
  g.add(instances(palmGeo(),VC({side:THREE.DoubleSide,shininess:8}),palms));
  g.add(instances(broadGeo(),VC(),jungle));
  [[-112,-10,50,18,70,.4],[112,-10,50,18,70,2.2],[-150,30,60,24,60,1],[150,30,60,24,60,3]].forEach(([x,z,sx,sy,sz,r])=>{ const m=mesh(islandGeo(),VC(),x,-.5,z); m.scale.set(sx,sy,sz); m.rotation.y=r; g.add(m); });
  /* 파라솔과 선베드 */
  const wood2=M('#a98558',{shininess:6}), cush=M('#fbfaf5',{shininess:4});
  const lounger=(x,z)=>{
    const gr=new THREE.Group(); gr.position.set(x,0,z);
    [[-.35,-.9],[.35,-.9],[-.35,.8],[.35,.8]].forEach(([a,b])=>gr.add(mesh(new THREE.BoxGeometry(.06,.3,.06),wood2,a,.15,b)));
    gr.add(mesh(new THREE.BoxGeometry(.8,.06,1.9),wood2,0,.3,0));
    gr.add(mesh(new THREE.BoxGeometry(.72,.1,1.1),cush,0,.38,-.25));
    const bk=mesh(new THREE.BoxGeometry(.72,.1,.8),cush,0,.55,.78); bk.rotation.x=-.75; gr.add(bk);
    g.add(gr); avoidL.push({x,z,r:.85});
  };
  const stripe=canvasTex(64,8,(c,w,h)=>{ for(let i=0;i<8;i++){ c.fillStyle=i%2?'#fbfaf5':'#45a9b8'; c.fillRect(i*8,0,8,h); } });
  stripe.wrapS=THREE.RepeatWrapping; stripe.repeat.set(2,1);
  const parasol=(x,z)=>{
    g.add(mesh(new THREE.CylinderGeometry(.035,.04,2.5,8),wood2,x,1.25,z));
    const cp=mesh(new THREE.ConeGeometry(2.1,.6,16,1,true),new THREE.MeshPhongMaterial({map:stripe,side:THREE.DoubleSide,shininess:4}),x,2.55,z); g.add(cp);
    avoidL.push({x,z,r:.2});
  };
  [[-8.5,10.2],[24,14.5]].forEach(([cx,cz])=>{ lounger(cx-1.2,cz); lounger(cx+1.2,cz); parasol(cx,cz); });
  const log=mesh(new THREE.CylinderGeometry(.16,.2,4.5,14,6),M('#8b6f52'),-11,.2,6); log.rotation.z=Math.PI/2; log.rotation.y=.5; g.add(log);

  /* 먼 바다: 섬, 등대, 돛단배 */
  const isl=[[-70,-150,38,14,20,0],[-20,-235,64,22,28,1],[92,-195,32,9,16,2]];
  isl.forEach(([x,z,sx,sy,sz,r])=>{ const m=mesh(islandGeo(),VC(),x,-.5,z); m.scale.set(sx,sy,sz); m.rotation.y=r; g.add(m); });
  const lh=new THREE.Group(); lh.position.set(-70,13.3,-150); lh.scale.setScalar(2.2);
  lh.add(mesh(new THREE.CylinderGeometry(.55,.85,6,24),M('#f4f1ea'),0,3,0));
  lh.add(mesh(new THREE.CylinderGeometry(.62,.7,1,24),M('#c8483c'),0,2,0)); lh.add(mesh(new THREE.CylinderGeometry(.58,.64,1,24),M('#c8483c'),0,4.2,0));
  lh.add(mesh(new THREE.CylinderGeometry(.6,.6,.8,16),B('#fff0b0'),0,6.4,0));
  lh.add(mesh(new THREE.ConeGeometry(.75,.9,24),M('#3d4a58'),0,7.3,0));
  g.add(lh);
  const lamp=glowSprite('#fff2c0',16,-70,13.3+6.4*2.2,-150,.7); g.add(lamp);
  const boat=new THREE.Group(); boat.scale.setScalar(2.4);
  const hull=mesh(new THREE.SphereGeometry(1,20,12),M('#7a5a40'),0,.05,0); hull.scale.set(2.2,.55,.8); boat.add(hull);
  boat.add(mesh(new THREE.CylinderGeometry(.05,.05,3.6,8),M('#5d4630'),0,1.9,0));
  const sh1=new THREE.Shape(); sh1.moveTo(.1,.35); sh1.lineTo(.1,3.5); sh1.lineTo(1.7,.45); sh1.closePath();
  const sh2=new THREE.Shape(); sh2.moveTo(-.1,.4); sh2.lineTo(-.1,2.9); sh2.lineTo(-1.3,.45); sh2.closePath();
  const sailM=M('#fbfbf6',{side:THREE.DoubleSide});
  boat.add(new THREE.Mesh(new THREE.ShapeGeometry(sh1,8),sailM),new THREE.Mesh(new THREE.ShapeGeometry(sh2,8),sailM));
  boat.position.set(30,0,-120); g.add(boat);
  const gulls=[]; for(let i=0;i<5;i++){
    const b=new THREE.Group(), wm=B('#f5f5f2'), l=new THREE.Group(), r=new THREE.Group();
    l.add(mesh(new THREE.BoxGeometry(.7,.03,.2),wm,-.35,0,0)); r.add(mesh(new THREE.BoxGeometry(.7,.03,.2),wm,.35,0,0));
    b.add(l,r); b.userData={l,r,p:i*1.3}; g.add(b); gulls.push(b);
  }
  const clouds=[]; for(let i=0;i<9;i++){ const c=cloudCluster(0,35+R()*28,-250+R()*120,6+R()*8,.85); c.userData={x0:(R()-.5)*700,v:2+R()*3}; g.add(c); clouds.push(c); }

  let lx=0, lz=4, dist=0, side=1;
  return {group:g,fog:{c:0xf1e0cf,n:60,f:420},bg:0xf1e0cf,bounds:{rect:[-75,75,-30,26]},avoid:avoidL,spawn:{x:0,z:6},spawnJ:[60,6],groundH:seaBackH,waterY:SEA_WATER,
    update(t,dt,me){
      if(me&&me.walking){ const dep=SEA_WATER-seaBackH(me.x,me.z); if(dep>.05){ splT-=dt; if(splT<0){ splT=dep>.75?.55:.4; Sound.event('splash',Math.min(1,dep)); } } }
      const s=spd();
      /* 잔잔한 물결 */
      for(let i=0;i<wp.count;i++){
        const x=base[i][0], z=base[i][1];
        wp.setY(i,Math.sin(x*.12+t*.8*s)*.07+Math.cos(z*.1+t*.6*s)*.06+Math.sin((x+z)*.05+t*.45*s)*.05);
      }
      wp.needsUpdate=true; wg.computeVertexNormals();
      const tide=Math.sin(t*.4*s)*.05;
      water.position.y=-.15+tide;
      const fz=(-.15+tide)/.14-1.05;
      foam.position.z=fz+Math.sin(t*.9*s)*.1; foam2.position.z=fz+.4+Math.sin(t*.9*s+1.5)*.1;
      foam.material.opacity=.45+.15*Math.sin(t*.9*s); foam2.material.opacity=.22;
      clouds.forEach(c=>{ c.position.x=(((c.userData.x0+t*c.userData.v*s)+350)%700+700)%700-350; });
      boat.position.x=30+Math.sin(t*.025*s)*60; boat.position.y=Math.sin(t*.8)*.12; boat.rotation.z=Math.sin(t*.7)*.04; boat.rotation.y=.2;
      lamp.material.opacity=.45+.35*Math.sin(t*1.1);
      gulls.forEach((b,i)=>{
        const a=t*(.1+i*.012)*s+b.userData.p, rad=22+i*6;
        b.position.set(Math.cos(a)*rad,10+i*1.6+Math.sin(t*.4+i)*1.2,-34+Math.sin(a)*rad*.8); b.rotation.y=-a;
        const f=Math.sin(t*2.6+i*2)*.4; b.userData.l.rotation.z=f; b.userData.r.rotation.z=-f;
      });

      /* 밀려오는 파도 */
      bcx=me?Math.round(me.x):0;
      if(me&&Math.abs(me.x-(X0+PSX/2))>16){ X0=Math.round(me.x-PSX/2); pc.clearRect(0,0,PW,PH); fitDecal(); dirty=true; }
      const cyc=Math.floor(t/P), u=(t-cyc*P)/P, zMax=lerp(-.2,5.6,rng(cyc*977+13)());
      let sw=0; if(u<.3) sw=easeIO(u/.3); else if(u<.38) sw=1; else if(u<.9) sw=1-easeIO((u-.38)/.52);
      sw*=s>.5?1:.7;
      let any=false, anyWet=false;
      for(let i=0;i<=NC;i++){
        const x=bcx-SW/2+i, wob=.3*Math.sin(x*.4+cyc*1.7+t*.3*s);
        zf[i]=Math.max(SH,SH+(zMax-SH)*sw+wob*sw);
        wetZ[i]=Math.max(zf[i],wetZ[i]-dt*.14);
        if(zf[i]>SH+.06) any=true; if(wetZ[i]>SH+.06) anyWet=true;
      }
      film.visible=any; front.visible=any; wet.visible=anyWet;
      if(any){
        setBand(film,6,shore,zf,.016);
        for(let i=0;i<=NC;i++){ fa[i]=zf[i]-.4; fb[i]=zf[i]+.06; }
        setBand(front,1,fa,fb,.022);
        front.material.opacity=.75*clamp(sw*3,0,1);
        if(t-lastWash>.08){ lastWash=t;
          pc.save(); pc.globalCompositeOperation='destination-out'; pc.fillStyle='rgba(0,0,0,.14)';
          for(let i=0;i<NC;i++){ const z1=zf[i]; if(z1>SH+.05) pc.fillRect((bcx-SW/2+i-X0)*U-.5,(SH-Z0)*U,U+1,(z1-SH)*U); }
          pc.restore(); dirty=true;
        }
      }
      if(anyWet) setBand(wet,6,shore,wetZ,.01);

      /* 발자국 */
      if(me){
        if(me.walking&&!me.sitting){
          dist+=Math.hypot(me.x-lx,me.z-lz);
          if(dist>.52){ dist=0; stamp(me.x,me.z,me.heading,side); side=-side; }
        }
        lx=me.x; lz=me.z;
      }
      if(dirty&&t-lastUp>.08){ ptex.needsUpdate=true; dirty=false; lastUp=t; }
    }};
}
