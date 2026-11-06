/* ---- 우박: 베개가 산더미처럼 쌓인 커다란 방. 매달린 큰 베개를 연타하면 깃털이 우박처럼 쏟아진다 ---- */
const HA_W=30, HA_R=25, HA_N=8, HA_H=11;
const HA_BAGS=[...Array(HA_N)].map((_,i)=>{ const a=-Math.PI/2+(i+.5)/HA_N*TAU, r=9; const x=Math.cos(a)*r, z=Math.sin(a)*r;
  return {x,z,a,sx:x-Math.cos(a)*1.35,sz:z-Math.sin(a)*1.35}; });
function hailH(){ return 0; }
/* 폭신한 베개 모양: 상자를 부풀리고 가장자리는 얇게 */
function pillowGeo(w,h,d){
  /* 둥근 상자(초타원체)를 납작하게: 가운데는 빵빵, 네 모서리는 뾰족하게 접힌 베개 */
  const g=new THREE.SphereGeometry(1,18,12), p=g.attributes.position, sg=v=>Math.sign(v)*Math.pow(Math.abs(v),.45);
  for(let i=0;i<p.count;i++){ let x=sg(p.getX(i)), y=p.getY(i), z=sg(p.getZ(i));
    const e=Math.max(Math.abs(x),Math.abs(z)); y*=1-.55*Math.pow(e,3);
    p.setXYZ(i,x*w/2,y*h/2,z*d/2); }
  g.computeVertexNormals(); return g;
}
function featherTex(){
  return canvasTex(64,64,(g,w,h)=>{ g.clearRect(0,0,w,h); g.translate(w/2,h/2); g.rotate(.6);
    g.fillStyle='rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(0,0,7,24,0,0,TAU); g.fill();
    g.strokeStyle='rgba(235,230,225,.9)'; g.lineWidth=1; g.beginPath(); g.moveTo(0,-24); g.lineTo(0,26); g.stroke(); });
}
function buildHail(){
  const g=new THREE.Group(), R=rng(55);
  g.add(new THREE.HemisphereLight(0xfff4e6,0xd8c3a8,1.05));
  const sun=new THREE.DirectionalLight(0xfff0d6,.55); sun.position.set(-20,18,-12); g.add(sun);
  /* 방: 안쪽에서만 보이는 벽(밖에서 보면 투명해 카메라를 가리지 않는다), 커다란 아치 창, 따뜻한 등 */
  const room=mesh(new THREE.BoxGeometry(HA_W*2,HA_H,HA_W*2),M('#f4e9dc',{side:THREE.BackSide,shininess:2}),0,HA_H/2-.01,0); g.add(room);
  const floor=mesh(new THREE.PlaneGeometry(HA_W*2,HA_W*2),M('#e8d2b6',{shininess:2}),0,0,0); floor.rotation.x=-Math.PI/2; g.add(floor);
  const rug=mesh(new THREE.CircleGeometry(15,64),M('#efc9b4',{shininess:2}),0,.012,0); rug.rotation.x=-Math.PI/2; g.add(rug);
  const rug2=mesh(new THREE.RingGeometry(13.6,14.2,64),M('#f8e7d2'),0,.015,0); rug2.rotation.x=-Math.PI/2; g.add(rug2);
  const winTex=canvasTex(128,256,(c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#cfe6ff'); gr.addColorStop(1,'#fff5dc'); c.fillStyle=gr; c.fillRect(0,0,w,h);
    c.strokeStyle='#fff'; c.lineWidth=6; c.strokeRect(3,3,w-6,h-6); c.beginPath(); c.moveTo(w/2,0); c.lineTo(w/2,h); c.moveTo(0,h*.45); c.lineTo(w,h*.45); c.stroke(); });
  for(let s=0;s<4;s++) for(let k=-2;k<=2;k++){ const a=s*Math.PI/2, m=mesh(new THREE.PlaneGeometry(4,7),new THREE.MeshBasicMaterial({map:winTex,fog:false}),0,0,0);
    const off=k*11; m.position.set(Math.sin(a)*(HA_W-.05)+Math.cos(a)*off,4.4,Math.cos(a)*(HA_W-.05)-Math.sin(a)*off); m.rotation.y=a+Math.PI; g.add(m); }
  for(let i=0;i<9;i++){ const x=(i%3-1)*16, z=(Math.floor(i/3)-1)*16; g.add(glowSprite('#ffe2b0',3.2,x,HA_H-.6,z,.8)); g.add(mesh(new THREE.SphereGeometry(.35,14,10),B('#fff4dc'),x,HA_H-.6,z)); }

  /* 베개 산: 벽을 따라, 방 곳곳에 무더기로. 파스텔 색 베개 수천 개 */
  const PCOL=['#ffffff','#fbe3e8','#e3eefb','#fdf3d6','#e6f5e9','#efe4fb','#ffd9c7','#d9ecf2'];
  const pg=pillowGeo(1,.42,.7), piles=[[],[],[]], avoid=[];
  const pile=(cx,cz,rad,n,hgt)=>{
    for(let i=0;i<n;i++){ const a=R()*TAU, r=Math.sqrt(R())*rad, x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r;
      const y=Math.max(.12,(1-r/rad)*hgt*(.6+R()*.5))+R()*.2, s=.8+R()*.6;
      piles[i%3].push({x,y,z,sx:s,sy:s,sz:s,rx:(R()-.5)*.9,ry:R()*TAU,rz:(R()-.5)*.9,c:choice(R,PCOL)}); }
    avoid.push({x:cx,z:cz,r:rad*.75});
  };
  /* 벽을 따라 높이 쌓인 베개 언덕 */
  for(let i=0;i<28;i++){ const a=i/28*TAU, r=HA_W-4+R()*2; pile(Math.cos(a)*r,Math.sin(a)*r,4.5+R()*2,70,3+R()*2.5); }   // 폰에서 버벅이지 않게 개수는 적당히
  /* 방 안 군데군데 작은 베개 무더기 */
  for(let i=0;i<10;i++){ const a=i/10*TAU+.3, r=17+R()*4; pile(Math.cos(a)*r,Math.sin(a)*r,2+R()*1.2,30,1.4+R()); }
  /* 바닥에 흩어진 베개 */
  for(let i=0;i<70;i++){ const a=R()*TAU, r=13+R()*9, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(HA_BAGS.some(b=>Math.hypot(b.x-x,b.z-z)<2.6||Math.hypot(b.sx-x,b.sz-z)<1.6)) continue;
    const s=.7+R()*.5; piles[i%3].push({x,y:.1,z,sx:s,sy:s,sz:s,rx:(R()-.5)*.2,ry:R()*TAU,rz:(R()-.5)*.2,c:choice(R,PCOL)}); }
  const pm=VC({vertexColors:false,shininess:4});
  piles.forEach(list=>{ const im=new THREE.InstancedMesh(pg,pm,list.length), o=new THREE.Object3D(), col=new THREE.Color();
    list.forEach((it,i)=>{ o.position.set(it.x,it.y,it.z); o.rotation.set(it.rx,it.ry,it.rz); o.scale.set(it.sx,it.sy,it.sz); o.updateMatrix(); im.setMatrixAt(i,o.matrix); im.setColorAt(i,col.set(it.c)); });
    im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; g.add(im); });

  /* 펀칭 베개: 나무 틀에 밧줄로 매달린 길쭉한 큰 베개 */
  const wood=M('#b98b5e',{shininess:10}), rope=M('#d8c6a4');
  const bagG=pillowGeo(1.0,.75,1.9); bagG.rotateX(Math.PI/2);
  const bags=HA_BAGS.map((b,i)=>{
    const st=new THREE.Group(); st.position.set(b.x,0,b.z); st.rotation.y=Math.atan2(b.sx-b.x,b.sz-b.z); g.add(st); st.userData.spot={x:b.sx,z:b.sz};
    [-1.1,1.1].forEach(x=>{ const l=mesh(new THREE.BoxGeometry(.14,3.4,.14),wood,x,1.7,0); st.add(l); st.add(mesh(new THREE.BoxGeometry(.6,.1,.5),wood,x,.05,0)); });
    st.add(mesh(new THREE.BoxGeometry(2.5,.16,.18),wood,0,3.4,0));
    const piv=new THREE.Group(); piv.position.set(0,3.3,0); st.add(piv);
    piv.add(mesh(new THREE.CylinderGeometry(.025,.025,.9,6),rope,0,-.45,0));
    const bag=mesh(bagG,M(choice(R,['#ffffff','#fbe3e8','#e3eefb','#fdf3d6','#efe4fb']),{shininess:6}),0,-1.95,0); piv.add(bag);
    const band=mesh(new THREE.TorusGeometry(.42,.03,6,24),M('#d9b98a'),0,-1.05,0); band.rotation.x=Math.PI/2; piv.add(band);
    return {st,piv,bag,vx:0,vz:0,ax:0,az:0,squash:0,note:null};
  });
  /* 깃털: 맞을 때마다 터지고, 콤보가 쌓이면 천장에서 우박처럼 쏟아진다. 천천히 흔들리며 내려앉는다 */
  const FN=700, fpos=new Float32Array(FN*3), fv=[...Array(FN)].map(()=>({x:0,y:-99,z:0,vx:0,vy:0,vz:0,life:0,ph:0}));
  const fg=new THREE.BufferGeometry(); fg.setAttribute('position',new THREE.BufferAttribute(fpos,3));
  const feathers=new THREE.Points(fg,new THREE.PointsMaterial({map:featherTex(),size:.2,transparent:true,depthWrite:false,alphaTest:.05,color:0xffffff}));
  feathers.frustumCulled=false; g.add(feathers);
  let fi=0;
  const spawnF=(x,y,z,vx,vy,vz)=>{ const f=fv[fi]; fi=(fi+1)%FN; Object.assign(f,{x,y,z,vx,vy,vz,life:4+Math.random()*3,ph:Math.random()*TAU}); };
  let rain=0;
  /* 공중의 먼지 반짝임 */
  const dust=points(120,0,'#fff2c8',.08,null,()=>[(R()-.5)*50,1+R()*8,(R()-.5)*50]); g.add(dust); const dp=dust.geometry.attributes.position;
  return {group:g,fog:{c:0xf3e6d6,n:40,f:120},bg:0xf3e6d6,bounds:{circle:[0,0,HA_R]},tapTargets:bags.map(b=>b.st),avoid:avoid.concat(HA_BAGS.map(b=>({x:b.x,z:b.z,r:1.25}))),
    spawn:{x:0,z:HA_R-7},spawnJ:[2,2],groundH:hailH,waterY:-1000,pitch:.24,pitchSit:.14,noCut:false,
    punchSpot(x,z){ for(let i=0;i<HA_BAGS.length;i++){ const b=HA_BAGS[i]; if(Math.hypot(x-b.sx,z-b.sz)<1.0) return i; } return -1; },
    nearSpot(x,z){ let b=HA_BAGS[0], d=1e9; HA_BAGS.forEach(q=>{ const e=Math.hypot(x-q.sx,z-q.sz); if(e<d){ d=e; b=q; } }); return {x:b.sx,z:b.sz}; },
    snapSpot(x,z){ let b=null, d=3.2; HA_BAGS.forEach(q=>{ const e=Math.min(Math.hypot(x-q.x,z-q.z),Math.hypot(x-q.sx,z-q.sz)); if(e<d){ d=e; b=q; } }); return b?{x:b.sx,z:b.sz}:null; },
    bagFace(i){ const b=HA_BAGS[i]; return {heading:Math.atan2(b.x-b.sx,b.z-b.sz)}; },
    setNote(i,label){ const bd=bags[i]; if(!bd) return; if(bd.note){ bd.bag.remove(bd.note); bd.note.material.map.dispose(); bd.note=null; }
      if(label){ const n=noteSprite(label); n.scale.set(.6,.37,1); n.position.set(0,.1,.62); bd.bag.add(n); bd.note=n; } },
    /* 한 대 맞음: 베개가 출렁 밀려나고, 깃털이 터진다. combo가 클수록 깃털 우박이 세진다 */
    punch(i,side,power,combo){
      const b=HA_BAGS[i], bd=bags[i]; if(!bd) return;
      const dx=b.x-b.sx, dz=b.z-b.sz, L=Math.hypot(dx,dz)||1;
      bd.vx+=dx/L*1.6*power+(side*.4)*(-dz/L); bd.vz+=dz/L*1.6*power+(side*.4)*(dx/L); bd.squash=Math.min(1,.5+power*.4);
      const hx=b.sx+dx/L*.95, hz=b.sz+dz/L*.95, hy=1.35+(Math.random()-.5)*.3;
      const n=Math.round(4+4*power);
      for(let k=0;k<n;k++){ const a=Math.random()*TAU, s=1+Math.random()*2.5*power; spawnF(hx,hy,hz,Math.cos(a)*s,1+Math.random()*2.5*power,Math.sin(a)*s); }
      rain=Math.min(1,rain+.04*Math.min(combo,20));
    },
    /* 마지막 어퍼컷: 베개가 크게 휘청, 깃털이 방 가득 */
    finale(i){
      const b=HA_BAGS[i], bd=bags[i]; if(!bd) return; const dx=b.x-b.sx, dz=b.z-b.sz, L=Math.hypot(dx,dz)||1;
      bd.vx+=dx/L*5; bd.vz+=dz/L*5; bd.squash=1;
      for(let k=0;k<160;k++){ const a=Math.random()*TAU, s=1+Math.random()*5; spawnF(b.x,1.5,b.z,Math.cos(a)*s,3+Math.random()*6,Math.sin(a)*s); }
      rain=1;
    },
    update(t,dt,me){
      bags.forEach(bd=>{
        /* 진자처럼 흔들리다 멈춘다 */
        bd.vx+=(-bd.ax*9-bd.vx*1.6)*dt; bd.vz+=(-bd.az*9-bd.vz*1.6)*dt; bd.ax+=bd.vx*dt; bd.az+=bd.vz*dt;
        const ry=bd.st.rotation.y, c=Math.cos(-ry), s=Math.sin(-ry), lx=bd.ax*c-bd.az*s, lz=bd.ax*s+bd.az*c;
        bd.piv.rotation.set(lz*.35,0,-lx*.35);
        bd.squash=Math.max(0,bd.squash-dt*4); const q=bd.squash; bd.bag.scale.set(1+q*.18,1-q*.1,1-q*.22);
      });
      /* 깃털 우박: 콤보가 높을수록 천장 쪽에서 우수수 */
      if(rain>0&&me){ const n=Math.floor(rain*40*dt+Math.random()); for(let k=0;k<n;k++){ const a=Math.random()*TAU, r=Math.random()*7; spawnF(me.x+Math.cos(a)*r,HA_H-1.5,me.z+Math.sin(a)*r,0,-.5,0); } rain=Math.max(0,rain-dt*.18); }
      for(let k=0;k<FN;k++){ const f=fv[k];
        if(f.life>0){ f.life-=dt; f.vx*=1-2.2*dt; f.vz*=1-2.2*dt; f.vy+=(-.55-f.vy)*2.5*dt; f.ph+=dt*2.2;
          f.x+=(f.vx+Math.sin(f.ph)*.45)*dt; f.y+=f.vy*dt; f.z+=(f.vz+Math.cos(f.ph*.8)*.35)*dt;
          if(f.y<.05){ f.y=.05; f.vy=0; f.vx=f.vz=0; if(f.life>1.2) f.life=1.2; }
          fpos[k*3]=f.x; fpos[k*3+1]=f.life<.4&&f.y<=.06?-99:f.y; fpos[k*3+2]=f.z; }
        else fpos[k*3+1]=-99; }
      fg.attributes.position.needsUpdate=true;
      for(let i=0;i<dp.count;i++) dp.setY(i,dp.getY(i)+Math.sin(t*.5+i)*dt*.05); dp.needsUpdate=true;
    }
  };
}
BUILD.hail=buildHail;
