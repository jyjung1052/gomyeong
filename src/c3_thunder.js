/* ---- 우레: 끝이 보이지 않는 대나무숲. 안쪽 깊이 작은 연못과 그 둘레의 둥근 데크에서 마음껏 소리친다 ---- */
const TH_POND=2.2, TH_DECK=4.4, TH_DECKY=.32, TH_R=52, TH_PATHZ=TH_R-4;   // 1인용이라 연못과 데크를 작게
/* 연못 10개: 가운데 하나 + 바깥으로 흩어진 아홉 개. 길(스폰→가운데)과 겹치지 않게 방향을 골랐다 */
const TH_PONDS=[{x:0,z:0}];
for(let i=0;i<9;i++){ const a=(140+i*32.5)*Math.PI/180, r=i%2?32:20; TH_PONDS.push({x:Math.cos(a)*r,z:Math.sin(a)*r}); }
const TH_SPOKES=TH_PONDS.slice(1).map(p=>[0,0,p.x,p.z]);            // 가운데 연못에서 각 연못으로 가는 샛길
function pondDist(x,z){ let d=1e9; for(const p of TH_PONDS) d=Math.min(d,Math.hypot(x-p.x,z-p.z)); return d; }
function thunderH(x,z){
  const r=pondDist(x,z);
  if(r<TH_POND) return -.6;                                        // 연못 바닥
  if(r<TH_DECK+.05) return TH_DECKY;                               // 데크 위
  return .15*nz(x*.08,0,z*.08)+.06*nz(x*.3,2,z*.3);
}
/* 샛길 위인가(스폰 길과 가운데→연못 샛길을 1.9m 폭으로 비워 둔다) */
function onLane(x,z){
  if(z>0&&z<TH_PATHZ+6&&Math.abs(x-.5*Math.sin(z*.2))<1.9) return true;
  return TH_SPOKES.some(([x0,z0,x1,z1])=>{
    const dx=x1-x0, dz=z1-z0, t=clamp(((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz),0,1);
    return Math.hypot(x0+dx*t-x,z0+dz*t-z)<1.9;
  });
}
/* 대나무 한 그루: 마디가 있는 곧은 줄기, 위쪽에 가는 가지와 길쭉한 잎 다발 */
function bambooGeo(seed){
  const R=rng(seed), pos=[], col=[], nor=[], idx=[];
  const H=11+R()*5, r0=.075+R()*.035, N=7, segs=9;
  const C1=new THREE.Color('#5f8a3c'), C2=new THREE.Color('#7da14a'), NODE=new THREE.Color('#c8c79a'), LEAF=new THREE.Color('#4d7a2e'), LEAF2=new THREE.Color('#79a845'), c=new THREE.Color();
  const lean=(R()-.5)*.5, la=R()*TAU, bx=y=>Math.cos(la)*lean*(y/H)*(y/H), bz=y=>Math.sin(la)*lean*(y/H)*(y/H);
  /* 줄기: 마디마다 살짝 부풀고 연한 띠가 있다 */
  const rows=segs*3;
  for(let j=0;j<=rows;j++){
    const y=H*j/rows, inNode=(j%3===0), rr=r0*(1-.35*y/H)*(inNode?1.12:1);
    for(let i=0;i<=N;i++){
      const a=i/N*TAU, x=Math.cos(a)*rr+bx(y), z=Math.sin(a)*rr+bz(y);
      pos.push(x,y,z); nor.push(Math.cos(a),0,Math.sin(a));
      c.copy(C1).lerp(C2,.5+.5*Math.sin(a+seed)).lerp(NODE,inNode?.55:0); col.push(c.r,c.g,c.b);
    }
  }
  for(let j=0;j<rows;j++) for(let i=0;i<N;i++){ const a=j*(N+1)+i, b=a+N+1; idx.push(a,b,a+1,a+1,b,b+1); }
  /* 잎 다발: 줄기 위쪽 40%에서 가지가 뻗고 끝에 길쭉한 잎이 아래로 늘어진다 */
  const leaf=(x,y,z,dx,dz,L,W,droop)=>{
    const base=pos.length/3, px=-dz*W, pz=dx*W;
    const pts=[[x,y,z],[x+dx*L*.5+px,y-droop*.3,z+dz*L*.5+pz],[x+dx*L,y-droop,z+dz*L],[x+dx*L*.5-px,y-droop*.3,z+dz*L*.5-pz]];
    pts.forEach((p,k)=>{ pos.push(p[0],p[1],p[2]); nor.push(0,1,0); c.copy(LEAF).lerp(LEAF2,k===2?.6:R()*.5); col.push(c.r,c.g,c.b); });
    idx.push(base,base+1,base+2,base,base+2,base+3);
  };
  const sprays=7+Math.floor(R()*4);
  for(let s=0;s<sprays;s++){
    const y=H*(.55+.42*s/sprays)+R()*.4, a=R()*TAU, L=.6+R()*1.1, dx=Math.cos(a), dz=Math.sin(a);
    const ox=bx(y)+dx*L, oz=bz(y)+dz*L, oy=y+L*.25;
    const n=4+Math.floor(R()*3);
    for(let k=0;k<n;k++){ const b=a+(R()-.5)*1.6; leaf(ox,oy,oz,Math.cos(b),Math.sin(b),.35+R()*.3,.035+R()*.02,.12+R()*.2); }
    /* 가는 가지 */
    const base=pos.length/3;
    pos.push(bx(y),y,bz(y), ox,oy,oz, bx(y)+.02,y+.03,bz(y)); nor.push(0,1,0,0,1,0,0,1,0);
    for(let k=0;k<3;k++) col.push(.42,.5,.3);
    idx.push(base,base+1,base+2);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  g.setIndex(idx); return g;
}
function buildThunder(){
  const g=new THREE.Group(), R=rng(61);
  const U={value:0}, GUST={value:0};
  g.add(skyDome('#9fb59a','#b9c9ad','#c7d3bb'));
  g.add(new THREE.HemisphereLight(0xe6f2d8,0x3b4a2c,.9));
  const sun=new THREE.DirectionalLight(0xfff2cf,.55); sun.position.set(20,40,-10); g.add(sun);

  /* 바닥: 대나무 잎이 쌓인 흙 */
  const T=new THREE.PlaneGeometry(260,260,160,160); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color();
  const SOIL=new THREE.Color('#5a4a33'), LITTER=new THREE.Color('#8f7e52'), MOSS=new THREE.Color('#4f6a35');
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i), z=tp.getZ(i), r=Math.hypot(x,z);
    tp.setY(i,r<TH_DECK+.5?Math.min(thunderH(x,z),.1):thunderH(x,z));
    const n1=nz(x*.2,1,z*.2)*.5+.5, n2=nz(x*.9,4,z*.9)*.5+.5;
    c.copy(SOIL).lerp(LITTER,n1*.8).lerp(MOSS,smooth(.6,.9,n2)*.4);
    const k=.9+.15*n2; tc[i*3]=c.r*k; tc[i*3+1]=c.g*k; tc[i*3+2]=c.b*k;
  }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  g.add(new THREE.Mesh(T,VC({shininess:3})));

  /* 연못 열 개: 각각 물·돌·연잎·둥근 데크, 그리고 연못 쪽을 빙 두른 난간(막혀 있어 빠지지 않는다) */
  const RAIL=TH_POND+.14, keep=m=>{ m.userData.noCut=true; return m; };
  const rockG=rockGeo(), padG=new THREE.CircleGeometry(1,16); padG.rotateX(-Math.PI/2);
  const plankG=new THREE.BoxGeometry(TH_DECK-TH_POND,.08,(TH_DECK+TH_POND)/2*TAU/72*.93);
  const rockM=keep(VC({vertexColors:false})), padM=keep(M('#ffffff',{shininess:6})), deckM=keep(VC({vertexColors:false,shininess:8}));
  const railM=keep(M('#7a5a3c',{shininess:8})), underM=M('#5b4430',{side:THREE.DoubleSide});
  const waterM=M('#2c4a3c',{shininess:90,specular:0x99aa99,transparent:true,opacity:.92});
  const postG=new THREE.CylinderGeometry(.05,.06,.9,8), underG=new THREE.CylinderGeometry(TH_DECK,TH_DECK,TH_DECKY,64,1,true);
  TH_PONDS.forEach(P=>{
    const pg=new THREE.Group(); pg.position.set(P.x,0,P.z); g.add(pg);
    const water=mesh(new THREE.CircleGeometry(TH_POND+.1,48),waterM,0,-.02,0); water.rotation.x=-Math.PI/2; pg.add(water);
    const stones=[]; for(let i=0;i<26;i++){ const a=i/26*TAU+R()*.1, r=TH_POND-.05, s=.25+R()*.25; stones.push({x:Math.cos(a)*r,y:-.02,z:Math.sin(a)*r,sx:s*1.3,sy:s*.6,sz:s,ry:R()*6,c:choice(R,['#6d7360','#5d6452','#7a7d68'])}); }
    pg.add(instances(rockG,rockM,stones));
    const pads=[]; for(let i=0;i<7;i++){ const a=R()*TAU, r=.5+R()*(TH_POND-.8); pads.push({x:Math.cos(a)*r,y:0,z:Math.sin(a)*r,sx:.3+R()*.25,sy:1,sz:.3+R()*.25,ry:R()*3,c:choice(R,['#3f6a48','#4a7a50'])}); }
    pg.add(instances(padG,padM,pads));
    /* 데크: 연못을 빙 둘러싸고, 난간은 연못 쪽 가장자리를 끊김 없이 한 바퀴 */
    const planks=[]; for(let i=0;i<72;i++){ const a=i/72*TAU, rm=(TH_POND+TH_DECK)/2; planks.push({x:Math.cos(a)*rm,y:TH_DECKY-.04,z:Math.sin(a)*rm,sx:1,sy:1,sz:1,ry:-a,c:choice(R,['#a07a52','#946f49','#ab845a','#8d6844'])}); }
    pg.add(instances(plankG,deckM,planks));
    pg.add(mesh(underG,underM,0,TH_DECKY/2-.04,0));
    const posts=[]; for(let i=0;i<28;i++){ const a=i/28*TAU; posts.push({x:Math.cos(a)*RAIL,y:TH_DECKY+.45,z:Math.sin(a)*RAIL}); }
    pg.add(instances(postG,railM,posts));
    const rail=new THREE.Mesh(new THREE.TorusGeometry(RAIL,.035,6,96),railM); rail.rotation.x=-Math.PI/2; rail.position.y=TH_DECKY+.88; pg.add(rail);
  });
  /* 데크로 이어지는 징검돌 길 */
  const steps=[]; for(let z=TH_DECK+.8;z<TH_PATHZ;z+=1.15+R()*.3){ const x=.5*Math.sin(z*.2)+(R()-.5)*.4, s=.45+R()*.15; steps.push({x,y:thunderH(x,z)+.02,z,sx:s*1.2,sy:.12,sz:s,ry:R()*3,c:choice(R,['#8a8778','#9a9686','#7b796c'])}); }
  g.add(instances(rockGeo(),keep(VC({vertexColors:false})),steps));

  /* 대나무: 길과 샛길, 연못 둘레만 비우고 사방으로 빽빽하게. 멀리는 안개 속으로 끝없이 */
  const clear=(x,z)=>pondDist(x,z)<TH_DECK+1.6||onLane(x,z);
  const culms=[[],[],[],[]], avoid=TH_PONDS.map(p=>({x:p.x,z:p.z,r:TH_POND+.15}));
  for(let n=0,tries=0;n<1800&&tries<30000;tries++){
    const near=R()<.7, rr=near?Math.sqrt(R())*TH_R+2:TH_R+Math.pow(R(),.7)*55, a=R()*TAU, x=Math.cos(a)*rr, z=Math.sin(a)*rr;
    if(clear(x,z)) continue;
    n++; const s=.85+R()*.35;
    culms[n%4].push({x,y:thunderH(x,z)-.05,z,sx:s,sy:s*(.9+R()*.25),sz:s,ry:R()*TAU,c:choice(R,['#ffffff','#f2f8e8','#e8f2dc','#fbffef'])});
    if(rr<TH_R+2) avoid.push({x,z,r:.16*s});
  }
  /* 연못마다 둘레를 더 빽빽이: 데크 바로 바깥이 가장 촘촘하고, 멀어질수록 듬성해진다 */
  const ringCulms=(P,rMin,rSpan,count)=>{
    for(let n=0;n<count;n++){
      const a=R()*TAU, rr=rMin+Math.pow(R(),.8)*rSpan, x=P.x+Math.cos(a)*rr, z=P.z+Math.sin(a)*rr;
      if(onLane(x,z)) continue;
      const s=.85+R()*.35;
      culms[Math.floor(R()*4)].push({x,y:thunderH(x,z)-.05,z,sx:s,sy:s*(.9+R()*.25),sz:s,ry:R()*TAU,c:choice(R,['#ffffff','#f2f8e8','#e8f2dc','#fbffef'])});
      avoid.push({x,z,r:.16*s});
    }
  };
  TH_PONDS.forEach(P=>{ ringCulms(P,TH_DECK+.6,1.6,150); ringCulms(P,TH_DECK+2.2,1.8,90); });
  const bamMat=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:18,specular:0x223322});
  /* 바람에 대나무가 휘청인다: 높이의 제곱만큼 흔들리고, 소리칠 때(GUST)는 크게 출렁인다 */
  bamMat.onBeforeCompile=sh=>{
    sh.uniforms.uT=U; sh.uniforms.uG=GUST;
    sh.vertexShader='uniform float uT;\nuniform float uG;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip=vec3(instanceMatrix[3][0],instanceMatrix[3][1],instanceMatrix[3][2]);
      #else
        vec3 ip=vec3(0.0);
      #endif
      float hh=max(position.y,0.0)/14.0;
      float wv=sin(uT*.7+ip.x*.05+ip.z*.03)*.6+sin(uT*1.6+ip.x*.2-ip.z*.13)*.25;
      float big=uG*(sin(uT*3.2+length(ip.xz)*.25)*.8+.4);
      transformed.x+=(wv*.9+big*2.2)*hh*hh;
      transformed.z+=(wv*.5+big*1.1)*hh*hh;`);
  };
  bamMat.customProgramCacheKey=()=>'bamboo';
  [bambooGeo(5),bambooGeo(17),bambooGeo(29),bambooGeo(43)].forEach((bg,i)=>g.add(instances(bg,bamMat,culms[i])));
  /* 쓰러진 대나무 몇 그루와 죽순 */
  const fallen=[]; for(let i=0;i<14;i++){ const a=R()*TAU, r=10+R()*36, x=Math.cos(a)*r, z=Math.sin(a)*r; if(clear(x,z)) continue; fallen.push({x,y:thunderH(x,z)+.06,z,sx:1,sy:1,sz:1,rz:Math.PI/2,ry:R()*TAU}); }
  g.add(instances(new THREE.CylinderGeometry(.06,.08,6+R()*3,7),M('#a59a62',{shininess:6}),fallen));
  const shoots=[]; for(let i=0;i<40;i++){ const a=R()*TAU, r=8+R()*30, x=Math.cos(a)*r, z=Math.sin(a)*r; if(clear(x,z)) continue; const s=.6+R()*.8; shoots.push({x,y:thunderH(x,z),z,sx:s,sy:s,sz:s,ry:R()*3,c:choice(R,['#8a7a4a','#7a6a3e'])}); }
  const shootG=new THREE.ConeGeometry(.09,.5,7,3); shootG.translate(0,.25,0); g.add(instances(shootG,VC({vertexColors:false}),shoots));

  /* 대숲 사이로 비껴 드는 빛줄기 */
  const rayTex=canvasTex(64,256,(gg,w,h)=>{ const gr=gg.createLinearGradient(0,0,0,h); gr.addColorStop(0,'rgba(255,250,215,0)'); gr.addColorStop(.3,'rgba(255,250,215,.85)'); gr.addColorStop(1,'rgba(255,250,215,0)'); gg.fillStyle=gr; gg.fillRect(0,0,w,h); const gx=gg.createLinearGradient(0,0,w,0); gx.addColorStop(0,'rgba(0,0,0,1)'); gx.addColorStop(.5,'rgba(0,0,0,0)'); gx.addColorStop(1,'rgba(0,0,0,1)'); gg.globalCompositeOperation='destination-out'; gg.fillStyle=gx; gg.fillRect(0,0,w,h); });
  const rays=[];
  [[-3,0,.3],[2.5,-2,-.25],[0,3,.2],[-6,10,.35],[5,18,-.3],[-4,28,.25]].forEach(([x,z,r],i)=>{
    const m=mesh(new THREE.PlaneGeometry(2.6,18),new THREE.MeshBasicMaterial({map:rayTex,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),x,8,z);
    m.rotation.z=r; m.rotation.y=i*1.1; g.add(m); rays.push(m);
  });
  /* 떠다니는 꽃가루와, 소리치면 날아오르는 새 떼 */
  const motes=points(120,0,'#fff6d8',.08,null,()=>[(R()-.5)*30,.5+R()*6,(R()-.5)*30]); g.add(motes);
  const mp=motes.geometry.attributes.position;
  const birds=[]; for(let i=0;i<16;i++){
    const b=new THREE.Group(), wm=B('#2b2e2a'), l=new THREE.Group(), r=new THREE.Group();
    l.add(mesh(new THREE.BoxGeometry(.35,.02,.12),wm,-.17,0,0)); r.add(mesh(new THREE.BoxGeometry(.35,.02,.12),wm,.17,0,0));
    b.add(l,r); b.visible=false; b.userData={l,r,a:R()*TAU,sp:.6+R()*.6,ph:R()*6,age:99}; g.add(b); birds.push(b);
  }
  /* 연못 물결 */
  const rings=[]; for(let i=0;i<5;i++){
    const m=mesh(new THREE.RingGeometry(.9,1,40),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,.0,0);
    m.rotation.x=-Math.PI/2; m.userData={age:9}; g.add(m); rings.push(m);
  }
  let ri=0, nextRing=1, gustT=0;
  return {group:g,fog:{c:0xb3c2a6,n:6,f:58},bg:0xb3c2a6,bounds:{circle:[0,0,TH_R]},avoid,
    spawn:{x:0,z:TH_PATHZ},spawnJ:[2,3],groundH:thunderH,waterY:-1000,pitch:.24,pitchSit:.14,
    /* 데크 위(연못 둘레)에 서 있으면 소리칠 수 있다 */
    yellSpot(x,z){ return TH_PONDS.some(P=>{ const r=Math.hypot(x-P.x,z-P.z); return r>RAIL+.16&&r<TH_DECK-.1; }); },
    /* 소리치면 대숲이 크게 출렁이고 새들이 날아오른다 */
    shout(power,x,z){
      gustT=4.5*(power||1);
      const P=TH_PONDS.reduce((b,p)=>Math.hypot(p.x-(x||0),p.z-(z||0))<Math.hypot(b.x-(x||0),b.z-(z||0))?p:b);
      birds.forEach((b,i)=>{ const a=R()*TAU, r=6+R()*16; b.position.set(Math.cos(a)*r,6+R()*4,Math.sin(a)*r); b.userData.age=0; b.userData.a=a; b.visible=true; });
      for(let k=0;k<3;k++) setTimeout(()=>{ const r=rings[ri++%rings.length]; r.position.set(P.x+(R()-.5)*1.5,.0,P.z+(R()-.5)*1.5); r.userData.age=0; },k*350);
    },
    update(t,dt,me){
      const s=spd();
      U.value+=dt*s;
      gustT=Math.max(0,gustT-dt);
      GUST.value=damp(GUST.value,gustT>0?Math.min(1,gustT/1.5):0,gustT>0?3:.8,dt);
      rays.forEach((m,i)=>{ m.material.opacity=.12+.06*Math.sin(t*.3+i*1.7); });
      for(let i=0;i<mp.count;i++){ mp.setX(i,mp.getX(i)+Math.sin(t*.3+i)*dt*.12*s); mp.setY(i,mp.getY(i)+Math.cos(t*.4+i*2)*dt*.08*s); }
      mp.needsUpdate=true;
      if(me){ motes.position.set(me.x*.8,0,me.z*.8); }
      birds.forEach((b,i)=>{
        const u=b.userData; if(!b.visible) return;
        u.age+=dt; if(u.age>7){ b.visible=false; return; }
        u.a+=dt*.25; b.position.x+=Math.cos(u.a)*dt*6*u.sp; b.position.z+=Math.sin(u.a)*dt*6*u.sp; b.position.y+=dt*(3.2-u.age*.25);
        b.rotation.y=-u.a+Math.PI/2;
        const f=Math.sin(t*14+u.ph)*.7; u.l.rotation.z=f; u.r.rotation.z=-f;
      });
      nextRing-=dt; if(nextRing<0){ nextRing=2.5+Math.random()*3; const r=rings[ri++%rings.length]; r.position.set((Math.random()-.5)*5,0,(Math.random()-.5)*5); r.userData.age=0; }
      rings.forEach(r=>{ const a=r.userData.age+=dt, k=clamp(a/3,0,1); r.scale.set(.3+a*1.1,.3+a*1.1,1); r.material.opacity=a<3?.35*(1-k):0; });
    }};
}
BUILD.thunder=buildThunder;
