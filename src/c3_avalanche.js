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
  const avoid=[{x:0,z:0,r:1.1}];
  return {group:g,fog:{c:0xdfe9f5,n:60,f:520},bg:0xdfe9f5,bounds:{circle:[0,0,AV_DECK-1.1]},avoid,
    spawn:{x:0,z:6},spawnJ:[2,2],groundH:avalancheH,waterY:-1000,pitch:.26,pitchSit:.14,
    /* 아래 [종이 찢기] 버튼: 걸어갈 필요 없이 그 자리에서 */
    onAct(){ if(typeof Tear!=='undefined') Tear.open(); },
    /* 조각이 떨어져 나갈 때: 머리 위 하늘에서 그만큼 눈이 쏟아진다. size는 조각 크기(0~1) */
    tearBits(n,me){ n=Math.min(120,n); for(let k=0;k<n;k++){ const a=Math.random()*TAU, r=Math.sqrt(Math.random())*14;
      spawn((me?me.x:0)+Math.cos(a)*r,8+Math.random()*10,(me?me.z:0)+Math.sin(a)*r,(Math.random()-.5)*.6,-.8-Math.random()*.6,(Math.random()-.5)*.6,14); }
      snowAmt+=n/300; rate=Math.min(1,rate+n/200); },
    update(t,dt,me){
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
