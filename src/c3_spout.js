/* ---- 용오름: 별이 총총한 밤, 구름 바다 위에 떠 있는 포근한 침대들. 누워서 이불킥을 하면 구름이 소용돌이쳐 하늘로 솟는다 ---- */
const SP_R=40, SP_BED_R=10, SP_N=6;
const SP_BEDS=[...Array(SP_N)].map((_,i)=>{
  const a=-Math.PI/2+(i+.5)/SP_N*TAU, x=Math.cos(a)*SP_BED_R, z=Math.sin(a)*SP_BED_R;
  const tx=-Math.sin(a), tz=Math.cos(a);                       // 침대 긴 쪽은 원을 따라(접선 방향)
  return {x,z,a,tx,tz,sx:x-Math.cos(a)*1.25,sz:z-Math.sin(a)*1.25,ry:Math.atan2(tx,tz)};
});
function spoutH(x,z){ return .06*nz(x*.12,1,z*.12)+.03*nz(x*.5,3,z*.5); }
const SP_TOP=.62;                                                // 매트리스 윗면 높이
const SP_SHAME=['선생님한테 엄마라고 함','단톡방에 잘못 보냄','손 흔들었는데 나 아님','새벽 감성 문자','발표 때 삑사리','아는 척했는데 모르는 사람'];
function quiltTex(c1,c2){
  return canvasTex(256,256,(g,w,h)=>{
    g.fillStyle=c1; g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=3; g.setLineDash([8,6]);
    for(let i=1;i<4;i++){ g.beginPath(); g.moveTo(i*w/4,0); g.lineTo(i*w/4,h); g.stroke(); g.beginPath(); g.moveTo(0,i*h/4); g.lineTo(w,i*h/4); g.stroke(); }
    g.setLineDash([]); g.fillStyle=c2;
    for(let i=0;i<4;i++) for(let j=0;j<4;j++){ const x=(i+.5)*w/4, y=(j+.5)*h/4; g.beginPath(); for(let k=0;k<5;k++){ const a=k/5*TAU-Math.PI/2; g.lineTo(x+Math.cos(a)*12,y+Math.sin(a)*12); g.lineTo(x+Math.cos(a+TAU/10)*5,y+Math.sin(a+TAU/10)*5); } g.closePath(); g.fill(); }
  });
}
function buildSpout(){
  const g=new THREE.Group(), R=rng(91);
  g.add(skyDome('#141b44','#34437e','#9a93c4'));
  g.add(new THREE.HemisphereLight(0xbcc6f5,0x585a8c,.8));
  const moonL=new THREE.DirectionalLight(0xdfe6ff,.55); moonL.position.set(-30,40,-20); g.add(moonL);
  /* 별과 달 */
  const stars=points(900,0,'#ffffff',2.2,null,()=>{ const a=R()*TAU, e=.12+R()*1.3, r=520; return [Math.cos(a)*Math.cos(e)*r,Math.sin(e)*r,Math.sin(a)*Math.cos(e)*r]; });
  stars.material.fog=false; stars.material.sizeAttenuation=false; stars.material.size=2.2; g.add(stars);
  g.add(glowSprite('#fff6dc',90,-160,170,-260,.9)); g.add(glowSprite('#fffaf0',30,-160,170,-260,1));
  const moonDisc=mesh(new THREE.CircleGeometry(11,32),B('#fffbea',{fog:false}),-160,170,-260); moonDisc.lookAt(0,0,0); g.add(moonDisc);
  /* 구름 바다: 발밑은 폭신한 구름, 곳곳에 몽실한 구름 덩이 */
  const cg=new THREE.PlaneGeometry(400,400,120,120); cg.rotateX(-Math.PI/2);
  const cp=cg.attributes.position, cc=new Float32Array(cp.count*3), col=new THREE.Color(), C1=new THREE.Color('#c9cff0'), C2=new THREE.Color('#9fa7d8'), C3=new THREE.Color('#e4e0f8');
  for(let i=0;i<cp.count;i++){ const x=cp.getX(i), z=cp.getZ(i), r=Math.hypot(x,z); cp.setY(i,spoutH(x,z)-smooth(SP_R+6,SP_R+60,r)*(3+2*nz(x*.04,2,z*.04)));
    const n=nz(x*.2,4,z*.2)*.5+.5; col.copy(C2).lerp(C1,n).lerp(C3,smooth(.75,1,n)*.6); cc[i*3]=col.r; cc[i*3+1]=col.g; cc[i*3+2]=col.b; }
  cg.setAttribute('color',new THREE.BufferAttribute(cc,3)); cg.computeVertexNormals();
  g.add(new THREE.Mesh(cg,VC({shininess:2})));
  const puffG=new THREE.SphereGeometry(1,14,10), puffM=VC({vertexColors:false,shininess:3});
  const puffs=[]; for(let i=0;i<260;i++){ const a=R()*TAU, r=4+Math.pow(R(),.5)*110, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(SP_BEDS.some(b=>Math.hypot(b.x-x,b.z-z)<3.4)||r<6) continue;
    const s=r<SP_R?.4+R()*.9:1.5+R()*5; puffs.push({x,y:spoutH(x,z)-s*.35-(r>SP_R+6?smooth(SP_R+6,SP_R+60,r)*3:0),z,sx:s*1.4,sy:s*.6,sz:s,ry:R()*6,c:choice(R,['#dfe2f7','#cdd2f0','#eae6fb','#c4c9ea'])}); }
  g.add(instances(puffG,puffM,puffs));
  /* 반딧불 같은 작은 빛 */
  const motes=points(160,0,'#ffe9b0',.16,null,()=>[(R()-.5)*60,.4+R()*5,(R()-.5)*60]); g.add(motes); const mp=motes.geometry.attributes.position;

  /* 멀리 하늘로 감겨 오르는 용오름 기둥: 구름 덩이들이 나선을 그리며 천천히 돈다 */
  function spoutColumn(x,z,h,n,rad){
    const im=new THREE.InstancedMesh(puffG,new THREE.MeshPhongMaterial({color:0xe8ebfa,transparent:true,opacity:.85,shininess:3}),n); im.frustumCulled=false;
    const col={im,x,z,h,n,rad,ph:R()*TAU,age:0,life:0,k:1}; g.add(im); return col;
  }
  const m4=new THREE.Matrix4(), q=new THREE.Quaternion(), sv=new THREE.Vector3(), pv=new THREE.Vector3(), up=new THREE.Vector3(0,1,0);
  function drawColumn(c,t,grow){
    for(let i=0;i<c.n;i++){
      const f=i/c.n, y=f*c.h*grow, a=c.ph+f*TAU*4-t*1.6, r=c.rad*(.35+f*1.1)*(1+.15*Math.sin(t*2+i));
      pv.set(c.x+Math.cos(a)*r,y,c.z+Math.sin(a)*r); const s=(1.1-f*.5)*c.rad*.42*(grow>0?1:0); sv.set(s,s*.8,s); q.setFromAxisAngle(up,a);
      m4.compose(pv,q,sv); c.im.setMatrixAt(i,m4);
    }
    c.im.instanceMatrix.needsUpdate=true;
  }
  const farCols=[spoutColumn(-90,-120,80,70,6),spoutColumn(130,-60,65,60,5),spoutColumn(40,150,90,70,7)];
  const bursts=[];

  /* 침대: 원목 틀, 하얀 매트리스, 베개, 별무늬 누빔 이불(발차기에 들썩인다) */
  const woodM=M('#c9a27a',{shininess:12}), sheetM=M('#f7f6fb',{shininess:6}), pillowM=M('#ffffff',{shininess:8});
  const quilts=[['#f2a7a7','#fff1b8'],['#9fc3ef','#fff7d6'],['#b8a6e6','#ffe9b0'],['#9fd9c0','#ffffff'],['#f3c58c','#fff8e8'],['#c9b6a2','#fff1c9']];
  const beds=SP_BEDS.map((b,i)=>{
    const bg=new THREE.Group(); bg.position.set(b.x,spoutH(b.x,b.z),b.z); bg.rotation.y=b.ry; g.add(bg); bg.userData.spot={x:b.sx,z:b.sz};
    bg.add(mesh(new THREE.BoxGeometry(1.25,.3,2.2),woodM,0,.3,0));
    bg.add(mesh(new THREE.BoxGeometry(1.25,.85,.1),woodM,0,.5,-1.12));
    bg.add(mesh(new THREE.BoxGeometry(1.25,.5,.08),woodM,0,.35,1.12));
    [-.58,.58].forEach(x=>[-1.05,1.05].forEach(z=>bg.add(mesh(new THREE.CylinderGeometry(.05,.05,.25,8),woodM,x,.12,z))));
    bg.add(mesh(new THREE.BoxGeometry(1.15,.18,2.1),sheetM,0,SP_TOP-.09,0));
    const pil=mesh(new THREE.SphereGeometry(.5,16,10),pillowM,0,SP_TOP+.08,-.82); pil.scale.set(.95,.22,.42); bg.add(pil);
    /* 이불: 격자 판을 매트리스 아래쪽 2/3에 덮고, 가장자리는 늘어뜨린다 */
    const W=1.32, L=1.5, nx=12, nz2=16, qg=new THREE.PlaneGeometry(W,L,nx,nz2); qg.rotateX(-Math.PI/2);
    const qp=qg.attributes.position, base=new Float32Array(qp.count*3);
    for(let k=0;k<qp.count;k++){ const x=qp.getX(k), z=qp.getZ(k), ex=Math.max(0,Math.abs(x)-.56); base[k*3]=Math.sign(x)*Math.min(Math.abs(x),.6); base[k*3+1]=.035-ex*2.2+.02*Math.sin(z*9)*Math.sin(x*7); base[k*3+2]=z; }
    for(let k=0;k<qp.count;k++) qp.setXYZ(k,base[k*3],base[k*3+1],base[k*3+2]);
    qg.computeVertexNormals();
    const [c1,c2]=quilts[i%quilts.length];
    const quilt=mesh(qg,new THREE.MeshPhongMaterial({map:quiltTex(c1,c2),shininess:4,side:THREE.DoubleSide}),0,SP_TOP,.32); quilt.userData.noCut=true; quilt.material.userData.noCut=true; bg.add(quilt);
    /* 머리맡 작은 등 */
    bg.add(glowSprite('#ffd89a',.5,.75,.95,-1.1,.9)); bg.add(glowSprite('#ffd89a',2.2,.75,.95,-1.1,.18));
    bg.add(mesh(new THREE.CylinderGeometry(.02,.02,.4,6),woodM,.75,.75,-1.1));
    return {g:bg,quilt,base,qp,qg,lift:0};
  });
  /* 이불 들썩임: 두 발 높이(0~1)에 맞춰 이불을 밀어 올린다 */
  function deform(bd,hl,hr,occ){
    const {qp,base}=bd;
    for(let k=0;k<qp.count;k++){
      const x=base[k*3], z=base[k*3+2];
      let y=base[k*3+1]+(occ?.3*Math.exp(-((x/.34)**2))*(Math.abs(x)<.6?1:0):0);   // 누운 몸 위로 볼록
      [[-.13,hl],[.13,hr]].forEach(([lx,h])=>{ if(h<=.01) return; const fz=.72-h*.95, d=((x-lx)/.3)**2+((z-fz)/.4)**2; y+=h*1.0*Math.exp(-d);   // 발이 올라간 자리를 따라 이불이 솟는다 });
      qp.setY(k,y);
    }
    qp.needsUpdate=true; bd.qg.computeVertexNormals();
  }
  const kicking=new Set();
  let ri=0;
  return {group:g,fog:{c:0x5d6699,n:35,f:170},bg:0x5d6699,bounds:{circle:[0,0,SP_R]},tapTargets:beds.map(b=>b.g),
    avoid:SP_BEDS.map(b=>({x:b.x,z:b.z,r:1.0})).concat(SP_BEDS.map(b=>({x:b.x+b.tx*.7,z:b.z+b.tz*.7,r:.9})),SP_BEDS.map(b=>({x:b.x-b.tx*.7,z:b.z-b.tz*.7,r:.9}))),
    spawn:{x:0,z:SP_R-14},spawnJ:[2,2],groundH:spoutH,waterY:-1000,pitch:.22,pitchSit:.14,
    kickSpot(x,z){ for(let i=0;i<SP_BEDS.length;i++){ const b=SP_BEDS[i]; if(Math.hypot(x-b.sx,z-b.sz)<1.0) return i; } return -1; },
    nearSpot(x,z){ let b=SP_BEDS[0], d=1e9; SP_BEDS.forEach(q=>{ const e=Math.hypot(x-q.sx,z-q.sz); if(e<d){ d=e; b=q; } }); return {x:b.sx,z:b.sz}; },
    snapSpot(x,z){ let b=null, d=3.5; SP_BEDS.forEach(q=>{ const e=Math.min(Math.hypot(x-q.x,z-q.z),Math.hypot(x-q.sx,z-q.sz)); if(e<d){ d=e; b=q; } }); return b?{x:b.sx,z:b.sz}:null; },
    bedFace(i){ const b=SP_BEDS[i]; return {heading:Math.atan2(b.x-b.sx,b.z-b.sz)}; },
    /* 누운 자세: 발은 발치, 머리는 베개 쪽 */
    bedPose(i){ const b=SP_BEDS[i], y=spoutH(b.x,b.z)+SP_TOP+.2; return {x:b.x+b.tx*.95,y,z:b.z+b.tz*.95,heading:Math.atan2(b.tx,b.tz)}; },
    kickAnim(i,hl,hr){ const bd=beds[i]; if(!bd) return; kicking.add(i); deform(bd,hl,hr,1); },
    kickEnd(i){ const bd=beds[i]; if(!bd) return; kicking.delete(i); deform(bd,0,0,0); },
    /* 마지막 한 방: 침대 옆에서 구름이 소용돌이치며 하늘로 솟는다 */
    spout(i){ const b=SP_BEDS[i]; const c=spoutColumn(b.x+Math.cos(b.a)*8,b.z+Math.sin(b.a)*8,30,54,1.8); c.life=4.5; bursts.push(c); },
    update(t,dt,me){
      farCols.forEach(c=>drawColumn(c,t*.6,1));
      for(let i=bursts.length-1;i>=0;i--){ const c=bursts[i]; c.age+=dt; const k=c.age/c.life;
        drawColumn(c,t*2.2,Math.min(1,c.age/1.2)); c.im.material.opacity=.9*(k<.7?1:1-(k-.7)/.3);
        if(k>=1){ g.remove(c.im); c.im.material.dispose(); bursts.splice(i,1); } }
      for(let i=0;i<mp.count;i++){ mp.setY(i,mp.getY(i)+Math.sin(t*.7+i)*dt*.12); }
      mp.needsUpdate=true;
      stars.material.opacity=.85+.15*Math.sin(t*1.3);
    }
  };
}
BUILD.spout=buildSpout;
