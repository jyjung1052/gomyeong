/* ---- 여섯 개의 3D 장면. 각각 {group, fog, bg, bounds, avoid, spawn, update} 를 돌려준다 ---- */
const TINT=['#ffffff','#e6f2e0','#f0f4d8','#d9ecd8','#f2ffe8'];
const choice=(R,a)=>a[Math.floor(R()*a.length)];
function ringScatter(R,n,rMin,rMax,fn){
  const out=[];
  for(let i=0;i<n;i++){ const a=R()*TAU, r=rMin+Math.pow(R(),.85)*(rMax-rMin); out.push(fn(Math.cos(a)*r,Math.sin(a)*r)); }
  return out;
}
function cloudCluster(x,y,z,s,op){
  const c=new THREE.Group(), m=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:op});
  [[0,0,0,1],[.9,.1,.2,.75],[-.85,.05,-.1,.8],[.2,.15,-.6,.6],[.5,.12,.5,.55]].forEach(([a,b,d,k])=>{
    const s1=mesh(new THREE.SphereGeometry(1,16,10),m,a*s,b*s,d*s); s1.scale.set(k*s*1.5,k*s*.45,k*s); c.add(s1);
  });
  c.position.set(x,y,z); return c;
}
function softTex(n,rgb,alpha){
  const R=rng(5);
  const t=canvasTex(256,256,(g,w,h)=>{
    for(let i=0;i<n;i++){
      const x=R()*w, y=R()*h, r=30+R()*50, gr=g.createRadialGradient(x,y,0,x,y,r);
      gr.addColorStop(0,`rgba(${rgb},${alpha})`); gr.addColorStop(1,`rgba(${rgb},0)`);
      g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2);
    }
  });
  t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}

/* ---- 숲 ---- */
/* ---- 눈 덮인 나무 모양: 위를 향한 면에 눈을 입힌다 ---- */
function snowify(geo,amt,thr){
  const g=geo.clone(), n=g.attributes.normal, p=g.attributes.position, c=g.attributes.color;
  for(let i=0;i<c.count;i++){
    const ny=n.getY(i)+.16*nz(p.getX(i)*2,p.getY(i)*2,p.getZ(i)*2);
    const k=smooth(thr,thr+.25,ny)*amt;
    c.setXYZ(i,lerp(c.getX(i),.95,k),lerp(c.getY(i),.97,k),lerp(c.getZ(i),1,k));
  }
  return g;
}
/* 소나무: 초록 가지 위에 눈이 두툼하게 얹히고, 가지 끝자락은 초록이 드러난다 */
function pineSnowGeo(){
  const parts=[], trunk=new THREE.CylinderGeometry(.15,.3,3.6,8,3); trunk.translate(0,1.8,0);
  displace(trunk,(x,y,z)=>[x+.05*nz(0,y,z),y,z+.05*nz(x,y,0)]);
  parts.push({geo:trunk,color:'#4e3b2e'});
  [[2.1,2.8,1.9],[1.8,2.6,3.0],[1.45,2.4,4.1],[1.05,2.2,5.1],[.62,1.8,6.0]].forEach(([r,h,y],i)=>{
    const g=new THREE.ConeGeometry(r,h,18,3); g.translate(0,y+h/2,0);
    displace(g,(x,yy,z)=>{
      const a=Math.atan2(z,x), k=1+.14*nz(x*1.3,yy*.8,z*1.3)+.07*Math.sin(a*7+i*2), d=Math.hypot(x,z);
      return [x*k,yy-.2*d/r+.05*nz(x,yy,z),z*k];
    });
    parts.push({geo:g,color:'#dde7f1',shade:yy=>.78+.28*clamp((yy-y)/h,0,1)});
    const c=new THREE.ConeGeometry(r*.9,h*.86,18,4); c.translate(0,y+h*.14+h*.43+.04,0);
    displace(c,(x,yy,z)=>{
      const a=Math.atan2(z,x), d=Math.hypot(x,z), lowK=1-smooth(y+h*.14,y+h*.5,yy);
      const k=1.05+.12*nz(x*2.1,yy*1.2,z*2.1)+lowK*(.1*Math.sin(a*9+i*3)+.05);
      return [x*k,yy-.2*d/r+.09*nz(x*1.7,yy*1.7,z*1.7)+.05,z*k];
    });
    parts.push({geo:c,color:'#f8fbff',shade:yy=>.9+.1*clamp((yy-y)/h,0,1)});
  });
  return merge(parts);
}
/* 눈꽃 핀 나뭇가지: 가지마다 눈이 두껍게 앉고, 끝마다 눈송이 뭉치가 꽃처럼 핀다 */
function bareTreeGeo(){
  const parts=[], R=rng(41), BR='#5d483a', SN=['#ffffff','#f3f8fd','#e8f0f8'];
  const puff=(x,y,z,r)=>{
    const g=new THREE.SphereGeometry(r,7,5); g.scale(1.2,.78,1);
    displace(g,(px,py,pz)=>{ const k=1+.25*nz(px*9+x,py*9+y,pz*9+z); return [px*k,py*k,pz*k]; });
    g.translate(x,y,z); parts.push({geo:g,color:SN[Math.floor(R()*3)]});
  };
  const limb=(len,r0,r1,tilt,az,x,y,z,snow)=>{
    const mkc=(a,b,color,noisy)=>{
      const g=new THREE.CylinderGeometry(b,a,len,6,2); g.translate(0,len/2,0);
      if(noisy) displace(g,(px,py,pz)=>{ const k=1+.3*nz(px*40,py*4,pz*40); return [px*k,py,pz*k]; });
      g.rotateZ(tilt); g.rotateY(az); g.translate(x,y,z); parts.push({geo:g,color});
    };
    mkc(r0,r1,BR,false);
    if(snow) mkc(r0*2.2+.02,r1*3.4+.02,SN[0],true);
    const ex=x-Math.sin(tilt)*Math.cos(az)*len, ey=y+Math.cos(tilt)*len, ez=z+Math.sin(tilt)*Math.sin(az)*len;
    if(snow){
      puff(ex,ey+.03,ez,.12+R()*.1);
      puff(x+(ex-x)*.55,y+(ey-y)*.55+.05,z+(ez-z)*.55,.1+R()*.08);
    }
    return {x:ex,y:ey,z:ez};
  };
  const trunk=new THREE.CylinderGeometry(.14,.3,5.2,8,4); trunk.translate(0,2.6,0);
  displace(trunk,(x,y,z)=>[x+.08*Math.sin(y*.8),y,z+.05*nz(x,y,0)]);
  parts.push({geo:trunk,color:BR});
  for(let k=0;k<5;k++){ const s=new THREE.SphereGeometry(1,7,5); s.scale(.1,.5+R()*.4,.17); s.translate(.18,.9+k*.8,(R()-.5)*.1); parts.push({geo:s,color:'#fbfdff'}); }
  for(let i=0;i<9;i++){
    const h=2.3+i*.46, az=i*2.4+R(), tilt=.55+R()*.6, len=1.3+R()*1.4;
    const e=limb(len,.09,.03,tilt,az,0,h,0,true);
    limb(len*.6,.04,.015,tilt+.5,az+1.2+R(),e.x,e.y,e.z,true);
    limb(len*.5,.035,.012,tilt*.4,az-1.2-R(),e.x,e.y,e.z,true);
  }
  const top=limb(1.1,.09,.03,.1,0,0,5.1,0,true);
  puff(top.x,top.y+.05,top.z,.22);
  return merge(parts);
}
function buildForest(){
  const g=new THREE.Group(), R=rng(9);
  g.add(skyDome('#8fa3b6','#b3c1ce','#d7dfe6'));
  g.add(new THREE.HemisphereLight(0xeaf1f9,0xb6c4d3,1.0));
  const dl=new THREE.DirectionalLight(0xfdfdff,.55); dl.position.set(8,20,6); g.add(dl);
  const ground=groundPlane(90,0,96,0,'#f2f6fb',(x,z)=>.1*Math.sin(x*.3)*Math.cos(z*.27)+.07*nz(x*.35,0,z*.35)+.03*nz(x*1.3,0,z*1.3),true);
  ground.material=M('#f2f6fb',{shininess:14,specular:0x4a5058}); g.add(ground);
  const WIN=['#ffffff','#f4f8ff','#e9f0f8','#ffffff'];
  g.add(instances(pineSnowGeo(),VC(),ringScatter(R,150,17,68,(x,z)=>{ const s=.85+R()*1.0; return {x,y:-.05,z,sx:s,sy:s*(.9+R()*.4),sz:s,ry:R()*6,c:choice(R,WIN)}; })));
  g.add(instances(bareTreeGeo(),VC(),ringScatter(R,90,15,66,(x,z)=>{ const s=.9+R()*.7; return {x,y:-.05,z,sx:s,sy:s,sz:s,ry:R()*6,c:'#ffffff'}; })));
  g.add(instances(snowify(bushGeo(),.97,-.2),VC(),ringScatter(R,150,11,48,(x,z)=>{ const s=.5+R()*.9; return {x,y:.0,z,sx:s*1.2,sy:s*.9,sz:s*1.2,ry:R()*6,c:choice(R,WIN)}; })));
  const stones=[[-4,-4,1.1],[5,-2,.8],[-6,3,.9]].map(([x,z,s])=>({x,y:s*.25,z,sx:s*1.3,sy:s,sz:s*1.1,ry:x,c:'#c9d3dc'}));
  g.add(instances(rockGeo(),VC({vertexColors:false}),stones));
  const caps=[[-4,-4,1.1],[5,-2,.8],[-6,3,.9]].map(([x,z,s])=>({x,y:s*.62,z,sx:s*1.15,sy:s*.4,sz:s*.98,ry:x,c:'#ffffff'}));
  g.add(instances(rockGeo(),VC({vertexColors:false,shininess:14}),caps));
  const log=mesh(new THREE.CylinderGeometry(.35,.4,5,14,6),M('#6a5242'),3.5,.35,-6); log.rotation.z=Math.PI/2; log.rotation.y=.4; g.add(log);
  const lcap=mesh(new THREE.CylinderGeometry(.27,.33,4.9,12,2),M('#f6f9fc',{shininess:14}),3.5,.62,-6); lcap.rotation.z=Math.PI/2; lcap.rotation.y=.4; lcap.scale.set(.5,1,1); g.add(lcap);
  /* 내리는 눈: 또렷한 눈송이 두 겹(작은 것 많이, 큰 것 가끔) */
  const flakeTex=canvasTex(32,32,(c,w,h)=>{ const gr=c.createRadialGradient(16,16,0,16,16,16); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.55,'rgba(255,255,255,.95)'); gr.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=gr; c.fillRect(0,0,w,h); });
  const mkSnow=(n,size)=>{
    const p=points(n,0,'#ffffff',size,flakeTex,()=>[(R()-.5)*36,R()*14,(R()-.5)*36]);
    p.material.blending=THREE.NormalBlending; p.material.opacity=1; p.material.alphaTest=.05; g.add(p); return p;
  };
  const snowA=mkSnow(reduce?120:280,.12), snowB=mkSnow(reduce?16:50,.24);
  const flakes=[snowA,snowB].map((pt,k)=>({pos:pt.geometry.attributes.position,n:pt.geometry.attributes.position.count,v:Float32Array.from({length:pt.geometry.attributes.position.count},()=>(k?1.0:.5)+R()*.8)}));
  return {group:g,fog:{c:0xb2c0cd,n:8,f:58},bg:0xb2c0cd,bounds:{circle:[0,0,10]},avoid:[],spawn:{x:0,z:2.5},
    update(t,dt){
      const s=spd();
      flakes.forEach(f=>{
        for(let i=0;i<f.n;i++){
          let y=f.pos.getY(i)-dt*f.v[i]*s, x=f.pos.getX(i)+Math.sin(t*.6+i)*dt*.4*s+dt*.15*s;
          if(y<0){ y+=14; x=(Math.random()-.5)*36; f.pos.setZ(i,(Math.random()-.5)*36); }
          f.pos.setY(i,y); f.pos.setX(i,x);
        }
        f.pos.needsUpdate=true;
      });
    }};
}

/* ---- 호숫가: 울창한 숲 속의 호수 ---- */
const LAKE_C=[0,-30], LAKE_R=[30,26];
function lakeH(x,z){
  const r=Math.hypot((x-LAKE_C[0])/LAKE_R[0],(z-LAKE_C[1])/LAKE_R[1]);
  let y=-.8+smooth(.9,1.05,r)*.8;
  y+=clamp(r-1.7,0,3)*1.8+.1*Math.sin(x*.12)*Math.cos(z*.1)*clamp(r-1,0,1);
  return y;
}
function buildLake(){
  const g=new THREE.Group(), R=rng(12);
  g.add(skyDome('#2f3a76','#8a79ac','#f0b59a'));
  g.add(new THREE.HemisphereLight(0x8a8fc9,0x2d3a35,.95));
  const dl=new THREE.DirectionalLight(0xcbd6ff,.5); dl.position.set(-30,40,-20); g.add(dl);
  const stars=points(220,0,'#ffffff',3,null,()=>{ const a=R()*TAU, e=.2+R()*1.25, r=520; return [Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r]; });
  stars.material.sizeAttenuation=false; stars.material.fog=false; g.add(stars);
  const MX=-45, MY=70, MZ=-176;
  const mdir=new THREE.Vector3(MX,MY,MZ).normalize().multiplyScalar(450);
  g.add(glowSprite('#fff4d8',90,mdir.x,mdir.y,mdir.z,.7));
  const disc=mesh(new THREE.CircleGeometry(11,32),B('#fff7e0',{fog:false}),mdir.x*.99,mdir.y*.99,mdir.z*.99); disc.lookAt(0,0,0); g.add(disc);
  const far=[]; for(let i=0;i<14;i++){ const r=50+R()*40, h=60+R()*60; far.push({x:-320+i*46+R()*20,y:h/2-30,z:-300-R()*60,sx:r,sy:h,sz:r,ry:R()*3,c:'#3a4478'}); }
  g.add(instances(mountGeo(),VC(),far));
  /* 지형: 호수 바닥이 파이고 둑이 올라와 숲 언덕으로 이어진다 */
  const tg=new THREE.PlaneGeometry(230,230,160,160); tg.rotateX(-Math.PI/2);
  const tp=tg.attributes.position, tcol=new Float32Array(tp.count*3), tc=new THREE.Color();
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i), z=tp.getZ(i)-30, r=Math.hypot(x/LAKE_R[0],(z+30)/LAKE_R[1]);
    tp.setY(i,lakeH(x,z)+.05*nz(x*.4,0,z*.4));
    tc.set('#4a5a4a').lerp(new THREE.Color('#223329'),smooth(1.05,1.9,r)).lerp(new THREE.Color('#34503f'),.25+.25*nz(x*.2,0,z*.2));
    tcol[i*3]=tc.r; tcol[i*3+1]=tc.g; tcol[i*3+2]=tc.b;
  }
  tg.setAttribute('color',new THREE.BufferAttribute(tcol,3)); tg.computeVertexNormals();
  const terrain=new THREE.Mesh(tg,VC()); terrain.position.set(0,0,-30); g.add(terrain);
  const wt=canvasTex(8,128,(c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#26336a'); gr.addColorStop(.6,'#7a70a6'); gr.addColorStop(1,'#e0a893'); c.fillStyle=gr; c.fillRect(0,0,w,h); });
  const wgeo=new THREE.RingGeometry(.01,1,80,3); wgeo.rotateX(-Math.PI/2);
  const water=mesh(wgeo,new THREE.MeshBasicMaterial({map:wt,fog:false}),LAKE_C[0],-.1,LAKE_C[1]); water.scale.set(LAKE_R[0]*1.03,1,LAKE_R[1]*1.03); g.add(water);
  const streaks=[]; for(let k=0;k<7;k++){
    const z=-8-k*7, x=MX*(6-z)/176;
    const s=mesh(new THREE.PlaneGeometry(1.2+k*.8,.9+k*.25),new THREE.MeshBasicMaterial({color:0xfff4d8,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}),x,-.05,z);
    s.rotation.x=-Math.PI/2; g.add(s); streaks.push(s);
  }
  /* 숲: 호수를 빙 둘러 빽빽하게. 걷는 자리 앞쪽만 비워 둔다 */
  const pines=[], broads=[], bushes=[];
  const inClear=(x,z)=>Math.abs(x)<14&&z>-6&&z<24;
  const spot=(x,z)=>{ const r=Math.hypot((x-LAKE_C[0])/LAKE_R[0],(z-LAKE_C[1])/LAKE_R[1]); return r>1.07&&!inClear(x,z)&&Math.abs(x)<108&&z>-132&&z<76; };
  for(let n=0,tries=0;n<250&&tries<4000;tries++){
    const a=R()*TAU, rho=1.07+Math.pow(R(),1.5)*1.6, x=LAKE_C[0]+Math.cos(a)*LAKE_R[0]*rho, z=LAKE_C[1]+Math.sin(a)*LAKE_R[1]*rho;
    if(!spot(x,z)) continue; n++;
    const s=1+R()*1.2, it={x,y:lakeH(x,z)-.1,z,sx:s,sy:s*(.9+R()*.4),sz:s,ry:R()*6,c:choice(R,TINT)};
    (R()<.68?pines:broads).push(it);
  }
  for(let n=0,tries=0;n<90&&tries<1500;tries++){
    const x=(R()<.5?-1:1)*(15+R()*16), z=-4+R()*28;
    if(!spot(x,z)) continue; n++;
    const s=.9+R()*.9, it={x,y:lakeH(x,z)-.1,z,sx:s,sy:s,sz:s,ry:R()*6,c:choice(R,TINT)};
    (R()<.55?pines:broads).push(it);
  }
  for(let n=0,tries=0;n<190&&tries<3000;tries++){
    const x=(R()-.5)*90, z=-40+R()*80;
    const r=Math.hypot((x-LAKE_C[0])/LAKE_R[0],(z-LAKE_C[1])/LAKE_R[1]);
    if(r<1.06||r>1.9||inClear(x,z)) continue; n++;
    const s=.5+R()*.9; bushes.push({x,y:lakeH(x,z)+.05,z,sx:s*1.3,sy:s,sz:s*1.3,ry:R()*6,c:choice(R,TINT)});
  }
  g.add(instances(pineGeo(),VC(),pines)); g.add(instances(broadGeo(),VC(),broads)); g.add(instances(bushGeo(),VC(),bushes));
  const boulders=[]; for(let i=0;i<12;i++){ const x=(R()-.5)*36, zs=LAKE_C[1]+LAKE_R[1]*Math.sqrt(Math.max(0,1-Math.pow(x/LAKE_R[0],2))), s=.5+R()*1.1; boulders.push({x,y:lakeH(x,zs+1)+s*.2,z:zs+.5+R()*2,sx:s*1.3,sy:s,sz:s,ry:R()*3,c:choice(R,['#5d6660','#6c716b','#505a55'])}); }
  g.add(instances(rockGeo(),VC({vertexColors:false}),boulders));
  const pads=[]; for(let i=0;i<30;i++){ const x=(R()-.5)*26, zs=LAKE_C[1]+LAKE_R[1]*Math.sqrt(Math.max(0,1-Math.pow(x/LAKE_R[0],2))); pads.push({x,y:-.07,z:zs-1.5-R()*7,sx:.5+R()*.5,sy:1,sz:.5+R()*.5,ry:R()*3,c:choice(R,['#3f6a48','#4a7a50','#35603f'])}); }
  const padG=new THREE.CircleGeometry(1,20); padG.rotateX(-Math.PI/2);
  g.add(instances(padG,M('#ffffff',{shininess:6}),pads));
  const lotus=[]; for(let i=0;i<7;i++){ const p=pads[i*3]; lotus.push({x:p.x+.2,y:-.02,z:p.z,sx:.22,sy:.16,sz:.22,c:'#f0a9c8'}); }
  g.add(instances(new THREE.SphereGeometry(1,14,10),M('#ffffff',{shininess:20}),lotus));
  const reedData=[]; for(let i=0;i<110;i++){
    const x=(R()-.5)*44, zs=LAKE_C[1]+LAKE_R[1]*Math.sqrt(Math.max(0,1-Math.pow(x/LAKE_R[0],2))), z=zs-.6+R()*2.4;
    reedData.push({x,z,y:lakeH(x,z),h:.9+R()*1.2,p:R()*6});
  }
  const reeds=new THREE.InstancedMesh(new THREE.CylinderGeometry(.012,.045,1,5,4),M('#31543f',{shininess:0}),reedData.length); reeds.frustumCulled=false; g.add(reeds);
  const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
  const mistTex=[softTex(26,'200,190,230',.22),softTex(22,'190,200,235',.2)];
  const mists=mistTex.map((tx,i)=>{ tx.repeat.set(2.2,1.4); const m=mesh(new THREE.PlaneGeometry(130,76),new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:.5,depthWrite:false,fog:false}),0,.5+i*.7,-30); m.rotation.x=-Math.PI/2; g.add(m); return m; });
  const rings=[]; for(let i=0;i<6;i++){
    const r=mesh(new THREE.RingGeometry(.9,1,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}),0,-.04,-12);
    r.rotation.x=-Math.PI/2; r.userData={age:9}; g.add(r); rings.push(r);
  }
  const fly=()=>points(22,0,'#e6ff96',.5,null,()=>{ const x=(R()-.5)*60, z=-6+R()*26; return [x,.4+R()*3,z]; });
  const fireA=fly(), fireB=fly(); g.add(fireA,fireB);
  let next=1.2, ri=0;
  return {group:g,fog:{c:0x7c6b9a,n:22,f:170},bg:0x7c6b9a,bounds:{rect:[-12,12,-2.8,12]},avoid:[],spawn:{x:0,z:5},
    update(t,dt){
      const s=spd();
      streaks.forEach((m,i)=>{ m.material.opacity=.3+.2*Math.sin(t*1.6*s+i*1.3); m.scale.x=1+.15*Math.sin(t*2*s+i); });
      reedData.forEach((d,i)=>{
        const sw=Math.sin(t*.8*s+d.p)*.1;
        e.set(sw*.6,0,sw); q.setFromEuler(e); sc.set(1,d.h,1); ps.set(d.x,d.y+d.h/2,d.z); m4.compose(ps,q,sc); reeds.setMatrixAt(i,m4);
      });
      reeds.instanceMatrix.needsUpdate=true;
      mists.forEach((m,i)=>{ m.material.map.offset.x+=dt*(.004+i*.003)*s; m.material.map.offset.y+=dt*.002*s; });
      next-=dt;
      if(next<=0){
        const r=rings[ri++%rings.length]; r.userData.age=0; r.position.set((R()-.5)*20,-.04,-16+R()*8);
        Sound.event('plip'); next=2+Math.random()*4;
      }
      rings.forEach(r=>{ const a=r.userData.age+=dt, k=clamp(a/4,0,1); r.scale.set(1+a*2.4,1+a*2.4,1); r.material.opacity=a<4?.5*(1-k):0; });
      [fireA,fireB].forEach((f,j)=>{
        const p=f.geometry.attributes.position;
        for(let i=0;i<p.count;i++){ p.setX(i,p.getX(i)+Math.sin(t*.5+i*2+j)*dt*.4*s); p.setY(i,clamp(p.getY(i)+Math.cos(t*.6+i+j)*dt*.3*s,.3,3.4)); }
        p.needsUpdate=true; f.material.opacity=.5+.5*Math.sin(t*1.6+j*Math.PI);
      });
    }};
}

/* ---- 산 ---- */
/* 금강산의 날카로운 화강암 봉우리: 세로로 결이 지고 꼭대기가 뾰족하다 */
function spireGeo(){
  const g=new THREE.CylinderGeometry(.2,1,1,12,26), p=g.attributes.position, col=new Float32Array(p.count*3);
  const c=new THREE.Color(), shade=new THREE.Color('#6f7882'), lite=new THREE.Color('#dfe2e0'), moss=new THREE.Color('#5f7d58'), warm=new THREE.Color('#e8ddd0');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i), t=y+.5, a=Math.atan2(z,x), r=Math.hypot(x,z);
    const rib=Math.sin(a*4+1.7+t*3)*.22+Math.sin(a*9-t*6)*.12+.16*nz(Math.cos(a)*2.2,t*5,Math.sin(a)*2.2);
    const rr=r<1e-4?0:(.2+.8*Math.pow(1-t,1.55))*(1+rib);
    p.setXYZ(i,Math.cos(a)*rr,y+.025*nz(x*4,t*5,z*4),Math.sin(a)*rr);
    const streak=smooth(.2,.7,Math.sin(a*9-t*6)*.5+.5+.3*nz(Math.cos(a)*4,t*3,Math.sin(a)*4));
    c.copy(shade).lerp(lite,clamp(.25+t*.9,0,1)*(.6+.4*streak)).lerp(warm,smooth(.3,1,t)*.25);
    c.lerp(moss,smooth(.42,.0,t)*smooth(.1,.6,nz(x*3,t*4,z*3)+.4)*.55);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.computeVertexNormals(); return g;
}
/* 겹겹이 이어지는 산맥: 멀수록 옅고 따뜻하게 흐려지는 한 바퀴의 능선. 해가 뜨는 쪽은 능선이 낮아져 틈이 생긴다 */
function ridgeRing(r,baseDeg,ampDeg,seed,cool,haze,sunAz,notchDeg){
  const SEG=360, g=new THREE.CylinderGeometry(r,r,1,SEG,1,true), p=g.attributes.position, col=new Float32Array(p.count*3);
  const cT=new THREE.Color(cool), cH=new THREE.Color(haze), warm=new THREE.Color('#ffb98a'), c=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), z=p.getZ(i), th=Math.atan2(x,z), top=p.getY(i)>0;
    const cx=Math.cos(th), sx=Math.sin(th);
    let d=th-sunAz; d=Math.atan2(Math.sin(d),Math.cos(d));
    const A=baseDeg+ampDeg*(nz(cx*4,seed,sx*4)+.55*nz(cx*11,seed+3,sx*11)+.28*nz(cx*29,seed+7,sx*29))-notchDeg*Math.exp(-Math.pow(d/.2,2));
    p.setY(i,top?r*Math.tan(A*Math.PI/180):-280);
    const w=Math.pow((Math.cos(d)+1)/2,3);
    if(top) c.copy(cT).lerp(warm,w*.5); else c.copy(cH).lerp(warm,w*.35);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false}));
  m.frustumCulled=false; return m;
}
function buildMountain(){
  const g=new THREE.Group(), R=rng(17);
  g.add(skyDome('#3d6cb4','#c8a2bc','#ffbd7a'));
  g.add(new THREE.HemisphereLight(0xb6c0e6,0x8c7c72,.85));
  const SUNAZ=Math.atan2(-.34,-1), SUNEL=.6*Math.PI/180, SD=585;
  const sdir=new THREE.Vector3(Math.sin(SUNAZ)*Math.cos(SUNEL),Math.sin(SUNEL),Math.cos(SUNAZ)*Math.cos(SUNEL));
  const dl=new THREE.DirectionalLight(0xffbf85,1.25); dl.position.copy(sdir).multiplyScalar(60); g.add(dl);
  g.add(glowSprite('#ffe2a8',230,sdir.x*SD,sdir.y*SD,sdir.z*SD,.9));
  g.add(glowSprite('#ff9a60',760,sdir.x*SD,sdir.y*SD,sdir.z*SD,.34));
  const disc=mesh(new THREE.CircleGeometry(12.5,40),B('#fff3cf',{fog:false}),sdir.x*(SD-4),sdir.y*(SD-4),sdir.z*(SD-4)); disc.lookAt(0,0,0); g.add(disc);
  [[150,-15,3.6,'#3a4868','#c9929c',1.6],[230,-12,3.1,'#4f5f88','#d8a2a2',2.0],[320,-9,2.6,'#7482ab','#e4b5aa',2.8],[430,-6,2.1,'#9aa2c4','#eec3b0',3.4],[545,-2.3,1.5,'#c4bfd4','#f6d2b4',1.6]]
    .forEach(([r,base,amp,cool,haze,notch],i)=>g.add(ridgeRing(r,base,amp,i*5.3+1,cool,haze,SUNAZ,notch)));

  /* 정상: 편평한 화강암 바위마당 */
  const SR=9.8;
  const pg=new THREE.RingGeometry(.01,SR,56,16); pg.rotateX(-Math.PI/2);
  const pp=pg.attributes.position, pc=new Float32Array(pp.count*3), cc=new THREE.Color();
  const GR=new THREE.Color('#b9b8b0'), CR=new THREE.Color('#8d9094'), LI=new THREE.Color('#8f9d7c');
  for(let i=0;i<pp.count;i++){
    const x=pp.getX(i), z=pp.getZ(i), r=Math.hypot(x,z);
    pp.setY(i,.05*Math.sin(x*.5)*Math.cos(z*.45)+.04*nz(x*.7,0,z*.7)-.5*smooth(8.6,SR,r));
    const crack=smooth(.55,.75,Math.abs(nz(x*.9,0,z*.9))*2);
    cc.copy(GR).lerp(CR,crack*.6).lerp(LI,smooth(.55,.9,nz(x*.5+3,0,z*.5))*.5).lerp(CR,smooth(8,SR,r)*.5);
    const k=.95+.1*nz(x*2,0,z*2); pc[i*3]=cc.r*k; pc[i*3+1]=cc.g*k; pc[i*3+2]=cc.b*k;
  }
  pg.setAttribute('color',new THREE.BufferAttribute(pc,3)); pg.computeVertexNormals();
  g.add(new THREE.Mesh(pg,VC({shininess:6})));
  /* 정상 아래로 곤두박질치는 절벽 */
  const cliffG=new THREE.CylinderGeometry(SR,46,230,56,26,true), cp=cliffG.attributes.position, ccol=new Float32Array(cp.count*3);
  const CA=new THREE.Color('#c4c6c2'), CB=new THREE.Color('#6c747d');
  for(let i=0;i<cp.count;i++){
    const x=cp.getX(i), y=cp.getY(i), z=cp.getZ(i), a=Math.atan2(z,x), t=(y+115)/230;
    const k=1+.16*nz(x*.12,y*.07,z*.12)+.07*Math.sin(a*5+y*.05)+.05*Math.sin(a*13+y*.12);
    cp.setX(i,x*k); cp.setZ(i,z*k);
    const streak=smooth(.3,.75,Math.sin(a*11+y*.02)*.5+.5+.3*nz(Math.cos(a)*3,y*.05,Math.sin(a)*3));
    cc.copy(CB).lerp(CA,clamp(t*1.1,0,1)*(.55+.45*streak));
    ccol[i*3]=cc.r; ccol[i*3+1]=cc.g; ccol[i*3+2]=cc.b;
  }
  cliffG.setAttribute('color',new THREE.BufferAttribute(ccol,3)); cliffG.computeVertexNormals();
  const cliff=new THREE.Mesh(cliffG,VC({side:THREE.DoubleSide,shininess:4})); cliff.position.y=-115-.2; g.add(cliff);

  /* 구름바다(운해) */
  const seaLayer=(y,rgb,a,rep,op)=>{
    const tx=softTex(26,rgb,a); tx.repeat.set(rep,rep);
    const m=mesh(new THREE.PlaneGeometry(1500,1500),new THREE.MeshBasicMaterial({map:tx,transparent:true,opacity:op,depthWrite:false}),0,y,0); m.rotation.x=-Math.PI/2; g.add(m); return tx;
  };
  const sea=[seaLayer(-98,'188,176,208',.5,6,.85),seaLayer(-90,'255,222,206',.55,5,.9),seaLayer(-82,'255,242,232',.5,4,.75)];
  const clouds=[]; for(let i=0;i<46;i++){
    const a=R()*TAU, d=30+R()*260, c=cloudCluster(Math.cos(a)*d,-94+R()*10,Math.sin(a)*d,7+R()*14,.95);
    c.userData={x0:c.position.x,v:1+R()*2}; g.add(c); clouds.push(c);
  }
  for(let i=0;i<5;i++){ const a=R()*TAU, d=80+R()*220, c=cloudCluster(Math.cos(a)*d,-30+R()*12,Math.sin(a)*d,6+R()*8,.7); c.userData={x0:c.position.x,v:2+R()*2}; g.add(c); clouds.push(c); }

  /* 정상의 소나무, 바위, 돌탑, 정상석 */
  const avoid=[];
  const boulders=[]; for(let i=0;i<10;i++){
    const a=R()*TAU, r=6.8+R()*1.8, s=.5+R()*.9;
    boulders.push({x:Math.cos(a)*r,y:s*.15,z:Math.sin(a)*r,sx:s*1.3,sy:s*.9,sz:s,ry:R()*6,c:choice(R,['#c8c6bd','#b9b8b0','#a7aaa6','#d2d0c6'])});
    avoid.push({x:Math.cos(a)*r,z:Math.sin(a)*r,r:s*1.1});
  }
  g.add(instances(rockGeo(),VC({vertexColors:false}),boulders));
  const cairn=[]; [[1,.5],[.82,.42],[.66,.36],[.5,.3],[.36,.26],[.22,.22]].forEach(([w,h],i)=>{ cairn.push({x:-3.7+(R()-.5)*.1,y:.15+[0,.48,.88,1.2,1.48,1.72][i],z:-3.3,sx:w,sy:h,sz:w*.9,ry:R()*3,c:'#b2b1a8'}); });
  g.add(instances(rockGeo(),VC({vertexColors:false}),cairn));
  avoid.push({x:-3.7,z:-3.3,r:.85});
  /* 솟는 안개와 매 */
  const wisps=points(70,0,'#ffffff',2.4,null,()=>{ const a=R()*TAU, r=11+R()*26; return [Math.cos(a)*r,-85+R()*65,Math.sin(a)*r]; });
  wisps.material.opacity=.3; wisps.material.fog=false; g.add(wisps);
  const wp=wisps.geometry.attributes.position;
  const birds=[]; for(let i=0;i<4;i++){
    const b=new THREE.Group(), wm=B('#3a4553');
    const l=new THREE.Group(), r=new THREE.Group();
    l.add(mesh(new THREE.BoxGeometry(1.5,.05,.34),wm,-.75,0,0)); r.add(mesh(new THREE.BoxGeometry(1.5,.05,.34),wm,.75,0,0));
    b.add(l,r); b.userData={l,r,p:i*1.7,rad:34+i*9}; g.add(b); birds.push(b);
  }
  return {group:g,fog:{c:0xf0d8c6,n:140,f:900},bg:0xf0d8c6,bounds:{circle:[0,0,7.6]},avoid,spawn:{x:0,z:2},pitch:.22,pitchSit:.1,
    update(t,dt){
      const s=spd();
      clouds.forEach(c=>{ c.position.x=((((c.userData.x0+t*c.userData.v*s)+330)%660)+660)%660-330; });
      sea.forEach((tx,i)=>{ tx.offset.x+=dt*(.0018+i*.0012)*s*(i%2?-1:1); tx.offset.y+=dt*.0009*s; });
      for(let i=0;i<wp.count;i++){ let y=wp.getY(i)+dt*(1.2+(i%4)*.5)*s; if(y>-15) y-=70; wp.setY(i,y); }
      wp.needsUpdate=true;
      birds.forEach((b,i)=>{
        const a=t*(.09+i*.012)*s+b.userData.p, rad=b.userData.rad;
        b.position.set(Math.cos(a)*rad,-45+Math.sin(t*.25+i*2)*6+i*4,Math.sin(a)*rad-8); b.rotation.y=-a;
        const f=Math.sin(t*2.2+i)*.18; b.userData.l.rotation.z=f; b.userData.r.rotation.z=-f;
      });
    }};
}

/* ---- 동굴 ---- */
function buildCave(){
  const g=new THREE.Group(), R=rng(23);
  g.add(new THREE.AmbientLight(0x3e4c62,1.9));
  g.add(new THREE.HemisphereLight(0x4a5b78,0x1c2028,.5));
  const wallG=new THREE.CylinderGeometry(19,19,26,64,18,true), wp=wallG.attributes.position;
  for(let i=0;i<wp.count;i++){
    const x=wp.getX(i), z=wp.getZ(i), y=wp.getY(i), a=Math.atan2(z,x), k=1+.12*Math.sin(a*3+y*.4)+.06*Math.sin(a*7+y)+.04*nz(x*.3,y*.3,z*.3);
    wp.setX(i,x*k); wp.setZ(i,z*k);
  }
  wallG.computeVertexNormals();
  const wall=new THREE.Mesh(wallG,M('#38414f',{side:THREE.BackSide})); wall.position.y=11; g.add(wall);
  const floor=groundPlane(19,0,72,0,'#3d444e',(x,z)=>.05*Math.sin(x*.7)*Math.cos(z*.6)+.04*nz(x*.5,0,z*.5),true); g.add(floor);
  const ceil=mesh(new THREE.CircleGeometry(19,48),M('#232a34'),0,23,0); ceil.rotation.x=Math.PI/2; g.add(ceil);
  /* 빛이 들어오는 곳: 천장 틈 네 곳. 각각 다른 빛깔 */
  const SHAFTS=[
    {top:[5,22,-4],bot:[1,0,0],c:0xbcd8ff,i:1.6},
    {top:[-6,22,9],bot:[-4,0,5],c:0xffd9a8,i:1.2},
    {top:[9,22,10],bot:[6,0,6.5],c:0xb8f0e0,i:1.1},
    {top:[-13,22,0],bot:[-8,0,0],c:0xd2c4ff,i:1.1}
  ];
  const tips=[]; for(let i=0;i<64;i++){ const a=R()*TAU, r=2+R()*15, l=3+R()*6.5, w=.5+R()*.6; tips.push({x:Math.cos(a)*r,y:23-l/2,z:Math.sin(a)*r,sx:w,sy:l,sz:w,ry:R()*3,rz:Math.PI,c:'#2a323d'}); }
  g.add(instances(stalGeo(),VC({vertexColors:false}),tips));
  const nearShaft=(x,z,d)=>SHAFTS.some(s=>Math.hypot(x-s.bot[0],z-s.bot[2])<d);
  const avoid=[];
  let gd=0;
  /* 바위 */
  const rocks=[]; gd=0;
  while(rocks.length<40&&gd++<800){
    const a=R()*TAU, r=9.4+R()*2.4, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(nearShaft(x,z,2.8)||Math.hypot(x-2,z-3)<2.4) continue;
    const s=.2+Math.pow(R(),2)*.4;
    rocks.push({x,y:s*.1,z,sx:s*1.25,sy:s*.9,sz:s,ry:R()*6,c:choice(R,['#3a424e','#444d5a','#313945','#4b5563'])});
  }
  g.add(instances(rockGeo(),VC({vertexColors:false}),rocks));
  /* 빛줄기 */
  const vols=[];
  SHAFTS.forEach((s,i)=>{
    const top=new THREE.Vector3(...s.top), bot=new THREE.Vector3(...s.bot);
    const spot=new THREE.SpotLight(s.c,s.i,50,.38,.6,1); spot.position.copy(top); spot.target.position.copy(bot); g.add(spot,spot.target);
    const len=top.distanceTo(bot), dir=bot.clone().sub(top).normalize();
    const vol=mesh(new THREE.ConeGeometry(3.4,len,32,1,true),new THREE.MeshBasicMaterial({color:s.c,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),(top.x+bot.x)/2,(top.y+bot.y)/2,(top.z+bot.z)/2);
    vol.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().negate()); g.add(vol); vols.push(vol);
    const patch=mesh(new THREE.CircleGeometry(3.8,32),new THREE.MeshBasicMaterial({map:GLOW,color:s.c,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}),s.bot[0],.06+i*.002,s.bot[2]); patch.rotation.x=-Math.PI/2; g.add(patch);
  });
  /* 빛나는 수정 무리 */
  const crys=[], cl=[], CC=['#7fe8ff','#b79bff','#ffc07a','#8dffc4','#ff9ec8'];
  [[.9,9.6],[2.0,9.8],[3.2,9.5],[4.6,9.7],[5.45,9.6],[6.0,9.4]].forEach(([a,r],i)=>{
    const cx=Math.cos(a)*r, cz=Math.sin(a)*r, col=CC[i%CC.length];
    for(let k=0;k<5;k++){
      const s=.5+R()*.9;
      crys.push({x:cx+(R()-.5)*.9,y:0,z:cz+(R()-.5)*.9,sx:s*.7,sy:s*1.0,sz:s*.7,rx:(R()-.5)*.5,rz:(R()-.5)*.5,ry:R()*3,c:col});
    }
    if(cl.length<4){ const pl=new THREE.PointLight(new THREE.Color(col),.9,9,2); pl.position.set(cx,.9,cz); g.add(pl); cl.push(pl); }
    g.add(glowSprite(col,2.4,cx,.7,cz,.55));
  });
  const cg=new THREE.ConeGeometry(.22,1,6); cg.translate(0,.5,0);
  g.add(instances(cg,new THREE.MeshBasicMaterial({color:0xffffff}),crys));
  /* 바닥의 발광 버섯 */
  const fung=[]; gd=0;
  while(fung.length<40&&gd++<400){
    const a=R()*TAU, r=2.5+R()*8.5, x=Math.cos(a)*r, z=Math.sin(a)*r;
    const s=.06+R()*.1; fung.push({x,y:s*.8,z,sx:s,sy:s*.8,sz:s,c:choice(R,['#8ff0d6','#a6e8ff','#c9b8ff'])});
  }
  g.add(instances(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({color:0xffffff}),fung));
  const moss=[]; for(let i=0;i<14;i++){
    const a=R()*TAU, r=14+R()*3, y=.8+R()*5, m=mesh(new THREE.SphereGeometry(.14+R()*.1,12,9),B('#6fe8c8'),Math.cos(a)*r,y,Math.sin(a)*r); g.add(m); moss.push(m);
  }
  const dust=points(90,0,'#d2e6ff',.14,null,i=>{ const s=SHAFTS[i%SHAFTS.length]; return [s.bot[0]+(R()-.5)*7,R()*20,s.bot[2]+(R()-.5)*7]; }); g.add(dust);
  const dp=dust.geometry.attributes.position;
  let next=1.5;
  return {group:g,fog:{c:0x0b0e14,n:10,f:50},bg:0x0b0e14,bounds:{circle:[0,0,11]},avoid,spawn:{x:2,z:3},
    update(t,dt){
      const s=spd();
      vols.forEach((v,i)=>{ v.material.opacity=.085+.025*Math.sin(t*.4*s+i*1.7); });
      moss.forEach((m,i)=>{ m.scale.setScalar(.8+.3*Math.sin(t+i)); });
      cl.forEach((l,i)=>{ l.intensity=.8+.25*Math.sin(t*.8*s+i*2.1); });
      for(let i=0;i<dp.count;i++){ let y=dp.getY(i)+dt*.12*s; if(y>22) y-=22; dp.setY(i,y); dp.setX(i,dp.getX(i)+Math.sin(t*.3+i)*dt*.1*s); }
      dp.needsUpdate=true;
      next-=dt; if(next<=0){ next=2.4+Math.random()*3.4; Sound.event('drip'); }
    }};
}
const BUILD={sea:buildSea,forest:buildForest,lake:buildLake,mountain:buildMountain,cave:buildCave};
