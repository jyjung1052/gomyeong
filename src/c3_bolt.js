/* ---- 벼락: 먹구름 낀 밤의 바위 고원. 작업대 위 물건을 망치로 내리치면 하늘에서 벼락이 함께 내리꽂힌다 ---- */
const BO_R=46, BO_BENCH_R=11, BO_N=6;
const BO_BENCHES=[...Array(BO_N)].map((_,i)=>{ const a=-Math.PI/2+(i+.5)/BO_N*TAU; return {x:Math.cos(a)*BO_BENCH_R,z:Math.sin(a)*BO_BENCH_R,a}; });
/* 작업대 앞, 사람이 서는 자리(가운데 쪽) */
BO_BENCHES.forEach(b=>{ const k=(BO_BENCH_R-1.35)/BO_BENCH_R; b.sx=b.x*k; b.sz=b.z*k; b.ry=Math.atan2(b.x,b.z); });
function boltH(x,z){
  const r=Math.hypot(x,z);
  const rough=.35*nz(x*.09,1,z*.09)+.12*nz(x*.4,3,z*.4);
  const rim=smooth(BO_R+10,BO_R+40,r)*(6+5*nz(x*.03,5,z*.03));   // 둘레는 바위 언덕으로 솟는다
  return rough*smooth(4,16,r)+rim;
}
/* 부술 물건들: 모양·색·깨지는 소리 종류 */
const SMASH_KINDS=[
  {id:'plate',name:'접시',snd:'ceramic',col:'#f2efe8'},
  {id:'bottle',name:'유리병',snd:'glass',col:'#4f8f5a'},
  {id:'vase',name:'꽃병',snd:'ceramic',col:'#3f6fa8'},
  {id:'tv',name:'낡은 TV',snd:'tv',col:'#6b5a48'},
  {id:'monitor',name:'모니터',snd:'tv',col:'#2b2d31'},
  {id:'keyboard',name:'키보드',snd:'plastic',col:'#d9d6cf'}
];
function smashItem(kind){
  const g=new THREE.Group(), K=SMASH_KINDS.find(k=>k.id===kind)||SMASH_KINDS[0];
  const lat=(pts,mat)=>{ const m=new THREE.Mesh(new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),24),mat); g.add(m); return m; };
  if(kind==='plate'){
    lat([[0,0],[.12,0],[.14,.012],[.2,.02],[.26,.05],[.27,.058],[.25,.052],[.19,.03],[0,.026]],M(K.col,{shininess:60,side:THREE.DoubleSide}));
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.262,.006,6,40),M('#3f6fa8',{shininess:40})); rim.rotation.x=Math.PI/2; rim.position.y=.056; g.add(rim);
  }else if(kind==='bottle'){
    lat([[0,0],[.075,0],[.08,.02],[.08,.2],[.07,.25],[.035,.3],[.028,.38],[.032,.4],[0,.4]],M(K.col,{shininess:90,specular:0xccffcc,transparent:true,opacity:.72}));
  }else if(kind==='vase'){
    lat([[0,0],[.08,0],[.1,.04],[.14,.14],[.13,.24],[.07,.33],[.06,.38],[.085,.42],[0,.42]],M(K.col,{shininess:70}));
    const band=new THREE.Mesh(new THREE.TorusGeometry(.142,.008,6,32),M('#f0e3c0',{shininess:40})); band.rotation.x=Math.PI/2; band.position.y=.15; g.add(band);
  }else if(kind==='tv'){
    g.add(mesh(new THREE.BoxGeometry(.62,.5,.5),M(K.col,{shininess:10}),0,.27,0));
    const scr=mesh(new THREE.SphereGeometry(.3,20,12,0,TAU,0,.5),M('#1f2a2a',{shininess:90,specular:0x88aaaa}),0,.27,.13); scr.rotation.x=Math.PI/2; scr.scale.set(.82,.7,.35); g.add(scr);
    g.add(mesh(new THREE.BoxGeometry(.5,.38,.02),M('#151918',{shininess:80}),-.02,.28,.252));
    [-.15,.15].forEach(x=>{ const a=mesh(new THREE.CylinderGeometry(.006,.006,.35,5),M('#999'),x,.62,-.05); a.rotation.z=x*3; g.add(a); });
    g.add(mesh(new THREE.CylinderGeometry(.025,.025,.02,10),M('#c8b48a'),.25,.18,.26)).rotation.x=Math.PI/2;
  }else if(kind==='monitor'){
    g.add(mesh(new THREE.BoxGeometry(.72,.44,.04),M(K.col,{shininess:30}),0,.4,0));
    g.add(mesh(new THREE.BoxGeometry(.66,.38,.005),M('#0d1a24',{shininess:120,specular:0x6688aa}),0,.4,.022));
    g.add(mesh(new THREE.BoxGeometry(.06,.2,.04),M(K.col),0,.12,-.03));
    g.add(mesh(new THREE.BoxGeometry(.3,.02,.2),M(K.col),0,.01,-.02));
  }else{
    g.add(mesh(new THREE.BoxGeometry(.7,.035,.24),M(K.col,{shininess:12}),0,.018,0));
    const keys=[]; for(let r=0;r<4;r++) for(let c=0;c<14;c++) keys.push({x:-.31+c*.048,y:.045,z:-.08+r*.052,c:'#f7f5f0'});
    g.add(instances(new THREE.BoxGeometry(.04,.02,.042),M('#ffffff'),keys));
  }
  g.userData={kind,K};
  return g;
}
/* 이름표(포스트잇): 미운 사람·일의 이름을 붙여 부순다 */
function noteSprite(text){
  const tex=canvasTex(256,160,(g,w,h)=>{
    g.fillStyle='#ffe26a'; g.fillRect(8,8,w-16,h-16); g.fillStyle='rgba(0,0,0,.08)'; g.fillRect(8,h-26,w-16,18);
    g.fillStyle='#2b2418'; g.textAlign='center'; g.textBaseline='middle';
    let fs=54; g.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`;
    while(g.measureText(text).width>w-36&&fs>20){ fs-=4; g.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`; }
    g.fillText(text,w/2,h/2);
  });
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  s.scale.set(.42,.26,1); return s;
}
/* 하늘에서 내리꽂히는 번개 줄기: 지그재그 띠 + 잔가지 */
function boltMesh(x0,y0,z0,x1,y1,z1,R,width){
  const pts=[]; const N=14;
  for(let i=0;i<=N;i++){ const t=i/N, j=(i===0||i===N)?0:(R()-.5)*2.2*(1-t*.4); pts.push(new THREE.Vector3(lerp(x0,x1,t)+j,lerp(y0,y1,t)+(R()-.5)*.4,lerp(z0,z1,t)+(R()-.5)*2.2*(1-t*.4)*(i===N?0:1))); }
  const g=new THREE.Group();
  const strip=(P,w,op)=>{
    const pos=[], idx=[];
    P.forEach((p,i)=>{ pos.push(p.x-w,p.y,p.z, p.x+w,p.y,p.z, p.x,p.y,p.z-w, p.x,p.y,p.z+w); if(i){ const a=(i-1)*4,b=i*4; idx.push(a,b,a+1,a+1,b,b+1, a+2,b+2,a+3,a+3,b+2,b+3); } });
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setIndex(idx);
    const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xf4f2ff,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
    m.material.userData.op=op; m.frustumCulled=false; g.add(m);
  };
  strip(pts,width,1); strip(pts,width*5,.25);
  for(let b=0;b<4;b++){ const i=2+Math.floor(R()*(N-5)), p=pts[i], br=[p.clone()]; let q=p.clone(); for(let k=0;k<4;k++){ q=q.clone().add(new THREE.Vector3((R()-.5)*2.4,-1.2-R()*1.2,(R()-.5)*2.4)); br.push(q); } strip(br,width*.5,.7); }
  return g;
}
function buildBolt(){
  const g=new THREE.Group(), R=rng(77);
  g.add(skyDome('#4a5878','#8592ad','#e6c9a4'));   // 비구름 걷히는 해 질 녘: 무섭지 않게, 노을빛이 남아 있다
  const hemi=new THREE.HemisphereLight(0xdfe4f2,0x6b5e50,1.05); g.add(hemi);
  const moon=new THREE.DirectionalLight(0xffd9b0,.6); moon.position.set(-30,18,-40); g.add(moon);
  const flash=new THREE.PointLight(0xdfe6ff,0,90,1.6); flash.position.set(0,30,0); g.add(flash);
  const flashAmb=new THREE.AmbientLight(0xc8d2ff,0); g.add(flashAmb);

  /* 바닥: 검푸른 현무암 고원, 군데군데 갈라진 틈 */
  const T=new THREE.PlaneGeometry(240,240,140,140); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color();
  const A=new THREE.Color('#77706a'), Bc=new THREE.Color('#9a9184'), Mo=new THREE.Color('#71805a');
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i), z=tp.getZ(i); tp.setY(i,boltH(x,z));
    const n1=nz(x*.15,2,z*.15)*.5+.5, n2=nz(x*.7,6,z*.7)*.5+.5;
    c.copy(A).lerp(Bc,n1).lerp(Mo,smooth(.65,.95,n2)*.5); const k=.85+.25*n2;
    tc[i*3]=c.r*k; tc[i*3+1]=c.g*k; tc[i*3+2]=c.b*k;
  }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  g.add(new THREE.Mesh(T,VC({shininess:6})));
  /* 바위와 둘레의 주상절리 기둥 */
  const rocks=[]; for(let i=0;i<160;i++){ const a=R()*TAU, r=6+Math.pow(R(),.6)*75, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(BO_BENCHES.some(b=>Math.hypot(b.x-x,b.z-z)<3.2)||(Math.abs(x)<2.5&&z>8)) continue;
    const s=r<BO_R+12?.2+R()*.5:.8+R()*2.4; rocks.push({x,y:boltH(x,z)-s*.2,z,sx:s*1.2,sy:s*.8,sz:s,ry:R()*6,c:choice(R,['#8a8680','#97928a','#7d7973','#a39e95'])}); }
  g.add(instances(rockGeo(),VC({vertexColors:false}),rocks));
  /* 둘레의 둥근 바위 언덕: 부드럽게 감싼다 */
  const big=[]; for(let i=0;i<90;i++){ const a=R()*TAU, r=BO_R+14+R()*26, x=Math.cos(a)*r, z=Math.sin(a)*r, sz=2+R()*5; big.push({x,y:boltH(x,z)-sz*.35,z,sx:sz*1.4,sy:sz*.7,sz:sz,ry:R()*6,c:choice(R,['#8f8a80','#9c968b','#857f76'])}); }
  g.add(instances(rockGeo(),VC({vertexColors:false}),big));
  /* 먼 산 그림자 */
  for(let i=0;i<22;i++){ const a=i/22*TAU+R()*.15, r=160+R()*60, h=14+R()*26; const cg=new THREE.ConeGeometry(1,1,9,3); const cp=cg.attributes.position; for(let k=0;k<cp.count;k++){ const y=cp.getY(k); if(y<.49){ const f=1+.35*nz(cp.getX(k)*3,i,cp.getZ(k)*3); cp.setX(k,cp.getX(k)*f); cp.setZ(k,cp.getZ(k)*f); cp.setY(k,y+.12*nz(cp.getX(k)*4,i+2,cp.getZ(k)*4)); } } cg.computeVertexNormals();
    const m=mesh(cg,M('#5d6680',{flatShading:true}),Math.cos(a)*r,h/2-4,Math.sin(a)*r); m.scale.set(45+R()*40,h,30+R()*30); m.rotation.y=R()*6; g.add(m); }

  /* 먹구름: 낮게 깔린 구름층이 천천히 흐르고, 번개가 치면 속에서부터 환해진다 */
  const cloudTex=canvasTex(512,512,(gg,w,h)=>{
    gg.fillStyle='#000'; gg.fillRect(0,0,w,h); const Rr=rng(3);
    for(let i=0;i<260;i++){ const x=Rr()*w, y=Rr()*h, r=30+Rr()*90, gr=gg.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(255,255,255,.22)'); gr.addColorStop(1,'rgba(255,255,255,0)'); gg.fillStyle=gr; gg.fillRect(x-r,y-r,r*2,r*2); }
  });
  cloudTex.wrapS=cloudTex.wrapT=THREE.RepeatWrapping; cloudTex.repeat.set(3,3);
  const clouds=[]; [[44,'#8a90a6',.55],[52,'#6f7690',.5]].forEach(([y,col,op],i)=>{
    const m=mesh(new THREE.PlaneGeometry(700,700),new THREE.MeshBasicMaterial({color:col,alphaMap:cloudTex,transparent:true,opacity:op,depthWrite:false,side:THREE.DoubleSide,fog:false}),0,y,0);
    m.rotation.x=Math.PI/2; m.material.map=null; m.renderOrder=-5; g.add(m); clouds.push(m);
  });

  /* 작업대: 두꺼운 나무 상판, 쇠 모서리, 흩어진 파편 자국 */
  const wood=M('#6a4a30',{shininess:6}), woodDk=M('#4a3220',{shininess:4}), iron=M('#2a2a2c',{shininess:40});
  const benches=BO_BENCHES.map((b,i)=>{
    const bg=new THREE.Group(); bg.position.set(b.x,boltH(b.x,b.z),b.z); bg.rotation.y=b.ry+Math.PI; g.add(bg);
    bg.add(mesh(new THREE.BoxGeometry(1.7,.14,.9),wood,0,.84,0));
    [-.75,.75].forEach(x=>[-.36,.36].forEach(z=>bg.add(mesh(new THREE.BoxGeometry(.12,.8,.12),woodDk,x,.4,z))));
    bg.add(mesh(new THREE.BoxGeometry(1.5,.06,.06),woodDk,0,.25,.36)); bg.add(mesh(new THREE.BoxGeometry(1.5,.06,.06),woodDk,0,.25,-.36));
    [-.85,.85].forEach(x=>bg.add(mesh(new THREE.BoxGeometry(.03,.16,.92),iron,x,.84,0)));
    /* 작업대 위를 비추는 작은 등: 어둠 속에서 작업대가 보이도록 */
    bg.add(glowSprite('#ffcf8a',.55,0,2.2,.2,.75)); bg.add(glowSprite('#ffcf8a',2.6,0,.95,0,.18));
    bg.add(mesh(new THREE.SphereGeometry(.06,10,8),B('#ffe6b0'),0,2.2,.2));
    bg.add(mesh(new THREE.CylinderGeometry(.02,.02,1.4,5),iron,0,2.9,.2));
    const st={g:bg,item:null,kind:null,note:null,top:.91,respawn:0,next:null};
    setItem(st,choice(R,SMASH_KINDS).id); return st;
  });
  function setItem(st,kind,label){
    if(st.item){ st.g.remove(st.item); }
    const it=smashItem(kind); it.position.set(0,st.top,0); it.rotation.y=(R()-.5)*.5; st.g.add(it); st.item=it; st.kind=kind; st.pop=0;
    if(st.note){ st.g.remove(st.note); st.note.material.map.dispose(); st.note=null; }
    if(label){ const n=noteSprite(label); n.position.set(0,st.top+(kind==='keyboard'||kind==='plate'?.32:.62),.18); st.g.add(n); st.note=n; }
  }
  /* 파편 */
  const shards=[], shardGeo=[new THREE.TetrahedronGeometry(.06,0),new THREE.BoxGeometry(.08,.012,.05),new THREE.TetrahedronGeometry(.035,0)];
  const sparks=points(220,0,'#fff2c0',.12,null,()=>[0,-99,0]); g.add(sparks); const sp=sparks.geometry.attributes.position, spv=[...Array(220)].map(()=>({x:0,y:0,z:0,life:0}));
  let spi=0;
  function burst(st,K){
    const wp=new THREE.Vector3(0,st.top+.15,0); st.g.localToWorld(wp);
    const n=K.id==='keyboard'?50:K.id==='plate'?45:60;
    const mats=[M(K.col,{shininess:60,transparent:true,opacity:1})];
    if(K.id==='tv'||K.id==='monitor') mats.push(M('#1a2226',{shininess:100,transparent:true,opacity:1}),M('#9fd2e8',{shininess:120,transparent:true,opacity:1}));
    if(K.id==='keyboard') mats.push(M('#f7f5f0',{transparent:true,opacity:1}));
    if(K.id==='vase') mats.push(M('#f0e3c0',{transparent:true,opacity:1}));
    for(let i=0;i<n;i++){
      const m=new THREE.Mesh(shardGeo[i%3],mats[i%mats.length]); const s=.6+R()*1.6; m.scale.set(s,s*(.5+R()),s);
      m.position.copy(wp).add(new THREE.Vector3((R()-.5)*.3,R()*.2,(R()-.5)*.3));
      const a=R()*TAU, v=1.5+R()*4.5;
      m.userData={vx:Math.cos(a)*v,vy:2+R()*5,vz:Math.sin(a)*v,rx:(R()-.5)*20,ry:(R()-.5)*20,life:0,rest:false};
      g.add(m); shards.push(m);
    }
    for(let i=0;i<40;i++){ const o=spv[spi]; spi=(spi+1)%spv.length; const a=R()*TAU, v=2+R()*7; o.x=wp.x; o.y=wp.y; o.z=wp.z; o.vx=Math.cos(a)*v; o.vy=1+R()*6; o.vz=Math.sin(a)*v; o.life=.5+R()*.6; }
  }
  /* 번개: 멀리서 치는 마른번개(배경)와, 망치를 내리칠 때 작업대로 꽂히는 벼락 */
  const bolts=[];
  function strike(x,z,close){
    const y0=46, y1=close?boltH(x,z)+1:boltH(x,z)-2;
    const m=boltMesh(x+(R()-.5)*10,y0,z+(R()-.5)*10,x,y1,z,R,close?.09:.22); g.add(m); bolts.push({m,age:0,life:close?.45:.6});
    flash.position.set(x,close?8:30,z); flash.intensity=close?6:3; flash.distance=close?40:160; flashAmb.intensity=close?.9:.5;
    cloudFlash=1;
    if(!close&&typeof Sound!=='undefined'&&Sound.event) Sound.event('bolt_far');
  }
  let cloudFlash=0, nextFar=4+R()*5;
  let count=0;
  return {group:g,fog:{c:0xc2b9b4,n:40,f:230},bg:0xc2b9b4,bounds:{circle:[0,0,BO_R]},
    avoid:BO_BENCHES.map(b=>({x:b.x,z:b.z,r:1.05})),
    spawn:{x:0,z:BO_R-16},spawnJ:[2,2],groundH:boltH,waterY:-1000,pitch:.2,pitchSit:.12,
    /* 작업대 앞에 서 있으면 그 작업대 번호 */
    /* '깨부수기' 버튼: 가장 가까운 작업대 앞자리 */
    nearSpot(x,z){ let b=BO_BENCHES[0], d=1e9; BO_BENCHES.forEach(q=>{ const e=Math.hypot(x-q.sx,z-q.sz); if(e<d){ d=e; b=q; } }); return {x:b.sx,z:b.sz}; },
    /* 작업대 가까이(4m 안)를 누르면 그 작업대 앞자리 */
    snapSpot(x,z){ let b=null, d=4; BO_BENCHES.forEach(q=>{ const e=Math.min(Math.hypot(x-q.x,z-q.z),Math.hypot(x-q.sx,z-q.sz)); if(e<d){ d=e; b=q; } }); return b?{x:b.sx,z:b.sz}:null; },
    smashSpot(x,z){ for(let i=0;i<benches.length;i++){ const b=BO_BENCHES[i]; if(Math.hypot(x-b.sx,z-b.sz)<1.15) return i; } return -1; },
    benchFace(i){ const b=BO_BENCHES[i]; return {x:b.sx,z:b.sz,heading:Math.atan2(b.x-b.sx,b.z-b.sz)}; },
    benchKind(i){ return benches[i]&&benches[i].kind; },
    setBench(i,kind,label){ const st=benches[i]; if(st) setItem(st,kind,label); },
    /* 망치가 닿는 순간: 물건이 산산조각 나고 벼락이 내리꽂힌다 */
    smash(i){
      const st=benches[i]; if(!st||!st.item) return;
      const K=st.item.userData.K; st.g.remove(st.item); st.item=null;
      if(st.note){ st.g.remove(st.note); st.note=null; }
      burst(st,K); const b=BO_BENCHES[i]; strike(b.x,b.z,true);
      st.respawn=1.6; st.next=K.id; count++;
      return K.snd;
    },
    update(t,dt,me){
      clouds.forEach((cl,i)=>{ cl.material.alphaMap.offset.x+=dt*.004*(i?1:-.7); });
      /* 멀리서 치는 마른번개 */
      nextFar-=dt; if(nextFar<0){ nextFar=7+R()*10; const a=R()*TAU, r=55+R()*70; strike(Math.cos(a)*r,Math.sin(a)*r,false); }
      cloudFlash=Math.max(0,cloudFlash-dt*3); const fl=cloudFlash*(.6+.4*Math.sin(t*90));
      clouds.forEach((cl,i)=>cl.material.color.set(i?'#6f7690':'#8a90a6').lerp(new THREE.Color('#b8c0e8'),fl*.8));
      flash.intensity=Math.max(0,flash.intensity-dt*18); flashAmb.intensity=Math.max(0,flashAmb.intensity-dt*3);
      if(Math.random()<.04&&flash.intensity>1) flash.intensity*=1.6;
      for(let i=bolts.length-1;i>=0;i--){ const b=bolts[i]; b.age+=dt; const k=b.age/b.life;
        b.m.children.forEach(ch=>{ ch.material.opacity=(k<.15||(k>.3&&k<.45)?1:.25)*(1-k)*ch.material.userData.op; });
        if(k>=1){ g.remove(b.m); b.m.children.forEach(ch=>{ ch.geometry.dispose(); ch.material.dispose(); }); bolts.splice(i,1); } }
      /* 파편: 튀어 올랐다 떨어져 구르고, 잠시 뒤 스르르 사라진다 */
      for(let i=shards.length-1;i>=0;i--){ const s=shards[i], u=s.userData; u.life+=dt;
        if(!u.rest){ u.vy-=14*dt; s.position.x+=u.vx*dt; s.position.y+=u.vy*dt; s.position.z+=u.vz*dt; s.rotation.x+=u.rx*dt; s.rotation.y+=u.ry*dt;
          const gy=boltH(s.position.x,s.position.z)+.02;
          if(s.position.y<gy){ s.position.y=gy; if(Math.abs(u.vy)<1.2){ u.rest=true; } else { u.vy*=-.3; u.vx*=.5; u.vz*=.5; u.rx*=.5; u.ry*=.5; } } }
        if(u.life>4){ const o=1-(u.life-4)/1.5; s.material.opacity=Math.max(0,o); if(o<=0){ g.remove(s); shards.splice(i,1); } } }
      for(let i=0;i<spv.length;i++){ const o=spv[i]; if(o.life>0){ o.life-=dt; o.vy-=9*dt; o.x+=o.vx*dt; o.y+=o.vy*dt; o.z+=o.vz*dt; sp.setXYZ(i,o.x,o.y,o.z); } else sp.setXYZ(i,0,-99,0); }
      sp.needsUpdate=true;
      /* 새 물건이 '퐁' 하고 다시 놓인다 */
      benches.forEach(st=>{ if(st.respawn>0){ st.respawn-=dt; if(st.respawn<=0) setItem(st,st.next||choice(R,SMASH_KINDS).id); }
        if(st.item&&st.pop<1){ st.pop=Math.min(1,st.pop+dt*4); const p=st.pop, k=p<.7?p/.7*1.1:1.1-(p-.7)/.3*.1; st.item.scale.setScalar(Math.max(.01,k)); } });
    }
  };
}
BUILD.bolt=buildBolt;
