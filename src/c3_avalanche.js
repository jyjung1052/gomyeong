/* ---- 눈사태: 맑게 갠 설산 꼭대기 전망대. 걱정을 쓴 종이를 구겨 비탈 아래로 던지면, 굴러가며 커진 눈덩이가 눈사태를 일으킨다 ---- */
const AV_DECK=16, AV_N=8, AV_SLOPE=.55;
const AV_DESKS=[...Array(AV_N)].map((_,i)=>{ const a=-Math.PI/2+(i+.5)/AV_N*TAU, r=13.4, x=Math.cos(a)*r, z=Math.sin(a)*r;
  return {a,x,z,sx:Math.cos(a)*12.2,sz:Math.sin(a)*12.2}; });
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
  /* 책상: 종이 한 장이 놓여 있다 */
  const desks=AV_DESKS.map((d,i)=>{
    const dg=new THREE.Group(); dg.position.set(d.x,0,d.z); dg.rotation.y=Math.atan2(d.sx-d.x,d.sz-d.z); g.add(dg); dg.userData.spot={x:d.sx,z:d.sz};
    dg.add(mesh(new THREE.BoxGeometry(1.3,.08,.75),wood,0,.86,0));
    [-.58,.58].forEach(x=>[-.3,.3].forEach(z=>dg.add(mesh(new THREE.BoxGeometry(.07,.84,.07),woodD,x,.42,z))));
    const pg=new THREE.PlaneGeometry(.42,.54,10,12); pg.rotateX(-Math.PI/2);
    const base=Float32Array.from(pg.attributes.position.array);
    const paper=mesh(pg,new THREE.MeshPhongMaterial({map:paperTex(''),side:THREE.DoubleSide,shininess:4}),0,.91,.05); paper.rotation.y=Math.PI; dg.add(paper);
    const noise=Float32Array.from({length:pg.attributes.position.count*3},()=>R()-.5);
    return {g:dg,paper,pg,base,noise,c:0};
  });
  /* 구김: c(0~1)만큼 종이가 가운데로 오그라들며 울퉁불퉁한 뭉치가 된다 */
  function crumple(dk,c){
    const p=dk.pg.attributes.position, b=dk.base, nn=dk.noise; dk.c=c;
    for(let k=0;k<p.count;k++){ const x=b[k*3], z=b[k*3+2], r=Math.hypot(x,z)||1e-3, ball=.07+.03*nn[k*3];
      const tx=x/r*Math.min(r,ball)+nn[k*3]*.05*c, tz=z/r*Math.min(r,ball)+nn[k*3+2]*.05*c, ty=.05+nn[k*3+1]*.09*c+(1-Math.min(1,r/.3))*.06*c;
      p.setXYZ(k,lerp(x,tx,c),lerp(0,ty,c)+Math.sin(x*40+z*30)*.012*c*(1-c)*4,lerp(z,tz,c)); }
    p.needsUpdate=true; dk.pg.computeVertexNormals();
  }
  /* 굴러가는 눈덩이와 눈사태 눈구름 */
  const ballG=new THREE.IcosahedronGeometry(1,2), bp=ballG.attributes.position; for(let k=0;k<bp.count;k++){ const f=1+.12*(R()-.5); bp.setXYZ(k,bp.getX(k)*f,bp.getY(k)*f,bp.getZ(k)*f); } ballG.computeVertexNormals();
  const balls=[];
  const PN=220, ptex=puffTex(), puffs=[...Array(PN)].map(()=>{ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:ptex,transparent:true,depthWrite:false,opacity:0,color:0xffffff})); s.visible=false; g.add(s); return {s,life:0}; });
  let pi=0;
  function puff(x,y,z,vx,vy,vz,size,life){ const p=puffs[pi]; pi=(pi+1)%PN; p.s.position.set(x,y,z); p.s.visible=true; Object.assign(p,{vx,vy,vz,size,life,age:0}); p.s.scale.set(size,size,1); }
  /* 바람에 날리는 눈가루 */
  const snow=points(220,0,'#ffffff',.035,null,()=>[(R()-.5)*80,R()*14,(R()-.5)*80]);   /* 작게: 카메라 바로 앞 눈가루가 화면을 하얗게 덮지 않게 */ snow.material.opacity=.7; g.add(snow); const sp=snow.geometry.attributes.position;
  let onAval=null;
  const avoid=AV_DESKS.map(d=>({x:d.x,z:d.z,r:.95})).concat([{x:0,z:0,r:1.1}]);
  return {group:g,fog:{c:0xdfe9f5,n:60,f:520},bg:0xdfe9f5,bounds:{circle:[0,0,AV_DECK-1.1]},tapTargets:desks.map(d=>d.g),avoid,
    spawn:{x:0,z:6},spawnJ:[2,2],groundH:avalancheH,waterY:-1000,pitch:.26,pitchSit:.14,
    crumpleSpot(x,z){ for(let i=0;i<AV_DESKS.length;i++){ const d=AV_DESKS[i]; if(Math.hypot(x-d.sx,z-d.sz)<1.0) return i; } return -1; },
    nearSpot(x,z){ let b=AV_DESKS[0], d=1e9; AV_DESKS.forEach(q=>{ const e=Math.hypot(x-q.sx,z-q.sz); if(e<d){ d=e; b=q; } }); return {x:b.sx,z:b.sz}; },
    snapSpot(x,z){ let b=null, d=3.2; AV_DESKS.forEach(q=>{ const e=Math.min(Math.hypot(x-q.x,z-q.z),Math.hypot(x-q.sx,z-q.sz)); if(e<d){ d=e; b=q; } }); return b?{x:b.sx,z:b.sz}:null; },
    deskFace(i){ const d=AV_DESKS[i]; return {heading:Math.atan2(d.x-d.sx,d.z-d.sz)}; },
    ballPos(){ const b=balls[balls.length-1]; return b?(b.done?b.boomAt:b.m.position):null; },
    paperSet(i,text){ const dk=desks[i]; if(!dk) return; dk.paper.visible=true; dk.paper.material.map.dispose(); dk.paper.material.map=paperTex(text); dk.paper.material.needsUpdate=true; crumple(dk,0); },
    paperCrumple(i,c){ const dk=desks[i]; if(dk) crumple(dk,c); },
    /* 던지기: 손에서 비탈 쪽으로 포물선을 그리며 날아가, 떨어진 뒤엔 비탈을 따라 구르며 눈을 묻혀 커진다 */
    launch(i,from,cb){
      const d=AV_DESKS[i], dk=desks[i]; dk.paper.visible=false; onAval=cb||null;
      const dir=new THREE.Vector3(Math.cos(d.a),0,Math.sin(d.a));
      const m=new THREE.Mesh(ballG,new THREE.MeshPhongMaterial({color:0xfffdf6,shininess:10,flatShading:true})); m.scale.setScalar(.09); m.position.copy(from); g.add(m);
      balls.push({m,dir,vx:dir.x*9,vy:6.5,vz:dir.z*9,r:.09,rolling:false,age:0,dist:0,done:false,i});
    },
    update(t,dt,me){
      for(let k=balls.length-1;k>=0;k--){ const b=balls[k]; b.age+=dt; const p=b.m.position;
        if(!b.rolling){ b.vy-=9.8*dt; p.x+=b.vx*dt; p.y+=b.vy*dt; p.z+=b.vz*dt; b.m.rotation.x+=dt*8; b.m.rotation.z+=dt*5;
          const gy=avalancheH(p.x,p.z)+b.r; if(p.y<gy&&Math.hypot(p.x,p.z)>AV_DECK){ p.y=gy; b.rolling=true; b.speed=6; b.m.material.color.set('#ffffff'); b.m.material.flatShading=false; b.m.material.needsUpdate=true;
            for(let q=0;q<10;q++) puff(p.x,p.y,p.z,(Math.random()-.5)*3,1+Math.random()*2,(Math.random()-.5)*3,1.5,1.2); } }
        else if(!b.done){
          b.speed=Math.min(42,b.speed+6.5*dt); const step=b.speed*dt; b.dist+=step;
          p.x+=b.dir.x*step; p.z+=b.dir.z*step;
          b.r=Math.min(7,.09+b.dist*.05); b.m.scale.setScalar(b.r); p.y=avalancheH(p.x,p.z)+b.r*.92;
          const ax=new THREE.Vector3(b.dir.z,0,-b.dir.x); b.m.rotateOnWorldAxis(ax,step/b.r);
          if(Math.random()<dt*14) puff(p.x-b.dir.x*b.r,p.y-b.r*.6,p.z-b.dir.z*b.r,(Math.random()-.5)*2,.6,(Math.random()-.5)*2,b.r*1.2,1.5);
          if(b.dist>130){ b.done=true; b.m.visible=false; b.boomAt=p.clone(); boom(p.clone(),b.dir,b.r); }
        }
        if(b.done&&b.age>20){ g.remove(b.m); b.m.material.dispose(); balls.splice(k,1); }
      }
      for(const q of puffs){ if(q.life<=0) continue; q.age+=dt; const k=q.age/q.life;
        if(k>=1){ q.life=0; q.s.visible=false; continue; }
        q.vy*=1-.6*dt; q.s.position.x+=q.vx*dt; q.s.position.y+=q.vy*dt; q.s.position.z+=q.vz*dt;
        const s=q.size*(1+k*1.6); q.s.scale.set(s,s,1); q.s.material.opacity=.9*(k<.15?k/.15:1-(k-.15)/.85); }
      for(let k=0;k<sp.count;k++){ let x=sp.getX(k)+dt*(1.6+Math.sin(t+k)*.5), y=sp.getY(k)-dt*.35; if(x>40) x-=80; if(y<0) y+=14; sp.setXY(k,x,y); }
      sp.needsUpdate=true;
    }
  };
  /* 눈사태: 부딪힌 자리에서 거대한 눈구름이 피어오르며 비탈 아래로 쏟아진다 */
  function boom(p,dir,r){
    for(let k=0;k<160;k++){ const a=Math.random()*TAU, s=4+Math.random()*14;
      puff(p.x+(Math.random()-.5)*r*2,p.y+Math.random()*r,p.z+(Math.random()-.5)*r*2,dir.x*s*.9+Math.cos(a)*s*.5,2+Math.random()*7,dir.z*s*.9+Math.sin(a)*s*.5,6+Math.random()*10,4+Math.random()*2.5); }
    if(onAval){ const f=onAval; onAval=null; f(); }
  }
}
BUILD.avalanche=buildAvalanche;
