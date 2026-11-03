/* ---- 들녘: 허리까지 자란 누런 풀과 초록 풀, 끝이 휘어진 억새 이삭, 풀을 깎아 낸 초록 바퀴자국 길 ---- */
const FXH=44;                                              // 걸을 수 있는 들판의 절반 너비
const FPATH=z=>6*Math.sin(z*.035+.6)+2*Math.sin(z*.09);    // 들판을 가로지르는 풀 깎인 길
const FPW=1.25;                                            // 길의 반너비
function fieldH(x,z){
  const r=Math.hypot(x,z);
  let y=.55*nz(x*.025,0,z*.025)+.2*nz(x*.07,3,z*.07);
  /* 들판 가장자리 너머: 낮고 둥근 숲 언덕(한쪽이 더 높다) */
  const far=smooth(62,170,r), side=.6+.4*Math.sin(Math.atan2(z,x)-2.3);
  y+=far*(12+16*side+8*nz(x*.012,2,z*.012));
  y+=smooth(190,320,r)*(24+16*nz(x*.006,9,z*.006));
  return y;
}
/* 풀 한 포기: 가늘고 곧은 줄기 여러 장. 누렇게 마른 줄기와 초록 줄기가 섞인다 */
function tuftGeo(seed,n,hMin,hMax,spread,dry){
  const R=rng(seed), pos=[], col=[], nor=[];
  const GB=new THREE.Color('#3a6428'), GT=new THREE.Color('#9fc25c'), DB=new THREE.Color('#8b8a4c'), DT=new THREE.Color('#e3d397'), c=new THREE.Color();
  for(let b=0;b<n;b++){
    const isDry=R()<dry, a=R()*TAU, d=Math.sqrt(R())*spread, ox=Math.cos(a)*d, oz=Math.sin(a)*d;
    const h=(isDry?1:.7)*(hMin+R()*(hMax-hMin)), w=isDry?.012+R()*.008:.018+R()*.014;
    const fa=R()*TAU, lean=.03+R()*(isDry?.08:.2), lx=Math.cos(a)*lean*h, lz=Math.sin(a)*lean*h;
    const px=Math.cos(fa)*w, pz=Math.sin(fa)*w, B0=isDry?DB:GB, T0=isDry?DT:GT, k=.85+R()*.25;
    [[ox-px,0,oz-pz,0],[ox+px,0,oz+pz,0],[ox+lx,h,oz+lz,1]].forEach(([x,y,z,t])=>{
      pos.push(x,y,z); nor.push(0,1,0);
      c.copy(B0).lerp(T0,Math.pow(t,.7)); col.push(c.r*k,c.g*k,c.b*k);
    });
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  return g;
}
/* 억새 이삭: 길게 솟은 줄기 끝이 둥글게 휘어 내려오고, 그 끝에 솜털 같은 이삭이 달린다 */
function plumeGeo(seed){
  const R=rng(seed), pos=[], col=[], nor=[];
  const SB=new THREE.Color('#8f8d58'), ST=new THREE.Color('#d9cb94'), PL=new THREE.Color('#f1e9d2'), c=new THREE.Color();
  const tri=(a,b,d,ca,cb,cd)=>{ [a,b,d].forEach(p=>{ pos.push(p[0],p[1],p[2]); nor.push(0,1,0); }); [ca,cb,cd].forEach(q=>col.push(q.r,q.g,q.b)); };
  const stalks=2+Math.floor(R()*2);
  for(let s=0;s<stalks;s++){
    const H=1.35+R()*.75, dir=R()*TAU, dx=Math.cos(dir), dz=Math.sin(dir), bend=1.2+R()*1.6, N=10, w=.006;
    const ox=(R()-.5)*.25, oz=(R()-.5)*.25;
    let x=0, y=0, prev=null; const seg=H/N, pts=[];
    for(let i=0;i<=N;i++){
      const t=i/N, ang=bend*Math.pow(t,3);                 // 위로 갈수록 급하게 휜다
      if(i>0){ x+=Math.sin(ang)*seg; y+=Math.cos(ang)*seg; }
      pts.push([ox+dx*x,y,oz+dz*x,t]);
    }
    for(let i=0;i<N;i++){
      const a=pts[i], b=pts[i+1], ca=c.copy(SB).lerp(ST,a[3]).clone(), cb=c.copy(SB).lerp(ST,b[3]).clone();
      tri([a[0]-dz*w,a[1],a[2]+dx*w],[a[0]+dz*w,a[1],a[2]-dx*w],[b[0],b[1],b[2]],ca,ca,cb);
    }
    /* 이삭: 휘어진 끝 30% 구간에 솜털 가닥을 매단다 */
    for(let f=0;f<16;f++){
      const t=.7+R()*.3, i=Math.min(N-1,Math.floor(t*N)), p=pts[i], q=pts[i+1], u=t*N-i;
      const px=p[0]+(q[0]-p[0])*u, py=p[1]+(q[1]-p[1])*u, pz=p[2]+(q[2]-p[2])*u;
      const L=.06+R()*.1, fa=R()*TAU, ex=Math.cos(fa)*L*.6+dx*L*.3, ez=Math.sin(fa)*L*.6+dz*L*.3, ey=-L*(.5+R()*.5), fw=.004;
      const cp=PL.clone().multiplyScalar(.9+R()*.12);
      tri([px-dz*fw,py,pz+dx*fw],[px+dz*fw,py,pz-dx*fw],[px+ex,py+ey,pz+ez],cp,cp,cp);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  return g;
}
/* 들꽃 꽃송이: 꽃잎이 둥글게 벌어진 납작한 원반(줄기 꼭대기 높이에 붙어 있다) */
function petalGeo(petals,top){
  const g=new THREE.CircleGeometry(1,petals*4); g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), z=p.getZ(i), r=Math.hypot(x,z), a=Math.atan2(z,x);
    const k=r<1e-4?0:.55+.45*Math.abs(Math.cos(a*petals/2));
    p.setXYZ(i,x*k,top+.1*r*r,z*k);
  }
  g.computeVertexNormals(); return g;
}
/* 바람에 흔들리는 풀: 높이(제곱)에 비례해 끝이 더 많이 휜다. 같은 바람이 들판을 물결처럼 지나간다 */
function swayMat(mat,U,amp){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uT=U;
    sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip=vec3(instanceMatrix[3][0],instanceMatrix[3][1],instanceMatrix[3][2]);
      #else
        vec3 ip=vec3(0.0);
      #endif
      float hh=max(position.y,0.0);
      float gust=.55+.45*sin(uT*.3+ip.x*.03-ip.z*.018);
      float wv=(sin(uT*1.1+ip.x*.13+ip.z*.06)*.7+sin(uT*2.4+ip.x*.4-ip.z*.27)*.3)*gust;
      transformed.x+=wv*hh*hh*${amp.toFixed(3)};
      transformed.z+=wv*hh*hh*${(amp*.4).toFixed(3)};
      transformed.y-=abs(wv)*hh*hh*${(amp*.2).toFixed(3)};`);
  };
  mat.customProgramCacheKey=()=>'sway'+amp;
  return mat;
}
function buildField(){
  const g=new THREE.Group(), R=rng(31);
  const U={value:0};
  g.add(skyDome('#3c82cf','#79b2e3','#cfe4ee'));
  g.add(new THREE.HemisphereLight(0xeaf4ff,0x6b7a3f,.95));
  const sun=new THREE.DirectionalLight(0xfff4dc,.95); sun.position.set(40,80,30); g.add(sun);

  /* 지형: 들판은 누런 풀빛, 길은 초록, 멀리는 숲이 덮인 언덕 */
  const T=new THREE.PlaneGeometry(760,760,240,240); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color();
  const STRAW=new THREE.Color('#a69d5c'), STRAW2=new THREE.Color('#8c9a50'), PATHG=new THREE.Color('#6fa443'), RUT=new THREE.Color('#8a8058'), WOOD=new THREE.Color('#2f5a2c'), WOOD2=new THREE.Color('#4c7a3c');
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i), z=tp.getZ(i), y=fieldH(x,z), r=Math.hypot(x,z);
    tp.setY(i,y);
    const n1=nz(x*.05,1,z*.05)*.5+.5, n2=nz(x*.17,4,z*.17)*.5+.5;
    c.copy(STRAW2).lerp(STRAW,n1);
    const pd=Math.abs(x-FPATH(z)), inField=1-smooth(55,75,r);
    c.lerp(PATHG,(1-smooth(FPW-.2,FPW+.3,pd))*inField);
    c.lerp(RUT,(1-smooth(.08,.28,Math.abs(pd-.55)))*inField*.7);
    const woods=clamp(smooth(58,95,r)+smooth(.5,.7,nz(x*.03,6,z*.03)*.5+.5)*smooth(48,60,r)*.6,0,1);
    c.lerp(WOOD,woods*.9).lerp(WOOD2,woods*.35*n2);
    const k=.94+.1*n2; tc[i*3]=c.r*k; tc[i*3+1]=c.g*k; tc[i*3+2]=c.b*k;
  }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  g.add(new THREE.Mesh(T,VC({shininess:2})));

  /* 풀: 허리 높이의 풀숲. 길 위에는 짧게 깎인 초록 풀만 */
  const pdist=(x,z)=>Math.abs(x-FPATH(z));
  const tall=[[],[],[]], short=[], TT=['#ffffff','#f6f2e2','#fffbe6','#ecebd2','#f2f6dc'];
  for(let n=0,tries=0;n<24000&&tries<90000;tries++){
    const near=R()<.85, x=(R()-.5)*(near?100:128), z=(R()-.5)*(near?100:128);
    if(pdist(x,z)<FPW+.15||Math.hypot(x,z)>64) continue;
    const s=.8+R()*.45; n++;
    tall[n%3].push({x,y:fieldH(x,z)-.03,z,sx:s,sy:s*(.85+R()*.35),sz:s,c:choice(R,TT)});
  }
  for(let i=0;i<1500;i++){
    const z=(R()-.5)*120, x=FPATH(z)+(R()-.5)*2*FPW;
    short.push({x,y:fieldH(x,z)-.02,z,sx:1,sy:.6+R()*.4,sz:1,c:choice(R,['#ffffff','#eaf6d8'])});
  }
  const grassMat=swayMat(new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:0}),U,.2);
  [tuftGeo(1,18,.75,1.15,.42,.62),tuftGeo(2,16,.85,1.3,.38,.72),tuftGeo(3,20,.6,1.0,.46,.5)].forEach((tg,i)=>g.add(instances(tg,grassMat,tall[i])));
  g.add(instances(tuftGeo(4,10,.12,.26,.28,.05),grassMat,short));

  /* 억새 이삭: 풀숲 위로 드문드문 솟아 끝이 휘어져 있다 */
  const plumes=[[],[],[]];
  for(let n=0,tries=0;n<650&&tries<12000;tries++){
    const x=(R()-.5)*110, z=(R()-.5)*110, cl=nz(x*.06+2,1,z*.06)*.5+.5;
    if(R()>.25+cl*.75||pdist(x,z)<FPW+.3||Math.hypot(x,z)>60) continue;
    n++; const s=.85+R()*.4;
    plumes[n%3].push({x,y:fieldH(x,z)-.03,z,sx:s,sy:s,sz:s});
  }
  const plumeMat=swayMat(new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:0}),U,.12);
  [plumeGeo(11),plumeGeo(12),plumeGeo(13)].forEach((pg,i)=>g.add(instances(pg,plumeMat,plumes[i])));

  /* 들꽃은 아주 드물게(개망초·민들레) */
  const FL=[['#fbfbf4',8],['#f2d046',8]];
  const stems=[], heads=FL.map(()=>[]);
  for(let n=0;n<420;){
    const x=(R()-.5)*100, z=(R()-.5)*100;
    if(pdist(x,z)<FPW-.2) continue;
    const near=pdist(x,z)<FPW+1.4; if(!near&&R()<.6) continue;   // 길가에 조금 더 많이
    n++; const k=R()<.7?0:1, s=.8+R()*.5, it={x,y:fieldH(x,z)-.02,z,sx:s,sy:s*(.9+R()*.4),sz:s};
    stems.push(it); heads[k].push(Object.assign({c:FL[k][0]},it));
  }
  const stemG=new THREE.CylinderGeometry(.005,.008,.5,4,3); stemG.translate(0,.25,0);
  g.add(instances(stemG,swayMat(M('#4a7334',{shininess:0}),U,.2),stems));
  FL.forEach((f,i)=>{
    const hg=petalGeo(f[1],.5); hg.scale(.045,1,.045);
    g.add(instances(hg,swayMat(new THREE.MeshPhongMaterial({color:0xffffff,side:THREE.DoubleSide,shininess:10,emissive:0x111111}),U,.2),heads[i]));
  });

  /* 들판 가장자리의 덤불 띠(흰 꽃이 핀 관목)와 그 뒤 숲 언덕 */
  const avoid=[], broads=[], pines=[], bushes=[];
  for(let n=0,tries=0;n<170&&tries<4000;tries++){
    const a=R()*TAU, r=50+R()*12, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(pdist(x,z)<FPW+2) continue;
    if(nz(Math.cos(a)*3,1,Math.sin(a)*3)>.55) continue;      // 덤불 사이 군데군데 틈
    n++; const s=1.3+R()*1.4;
    bushes.push({x,y:fieldH(x,z)-.1,z,sx:s*1.4,sy:s*(.9+R()*.4),sz:s*1.3,ry:R()*6,c:choice(R,['#ffffff','#e9f2d8','#f4f8ea','#dfe9c8'])});
  }
  for(let n=0,tries=0;n<420&&tries<8000;tries++){
    const a=R()*TAU, r=64+Math.pow(R(),.8)*150, x=Math.cos(a)*r, z=Math.sin(a)*r;
    n++; const s=1+R()*1.4, it={x,y:fieldH(x,z)-.2,z,sx:s,sy:s*(.85+R()*.4),sz:s,ry:R()*6,c:choice(R,TINT)};
    (R()<.75?broads:pines).push(it);
  }
  g.add(instances(broadGeo(),VC(),broads)); g.add(instances(pineGeo(),VC(),pines)); g.add(instances(bushGeo(),VC(),bushes));
  /* 덤불에 핀 흰 꽃 */
  const bloom=points(700,0,'#fffdf2',.22,null,()=>{ const b=bushes[Math.floor(R()*bushes.length)], a=R()*TAU; return [b.x+Math.cos(a)*b.sx*.8,b.y+b.sy*(.3+R()*.6),b.z+Math.sin(a)*b.sz*.8]; });
  bloom.material.blending=THREE.NormalBlending; g.add(bloom);

  /* 맑은 하늘에 아주 작은 구름 몇 점 */
  [[.6,95,240,7],[-.5,120,280,5],[2.4,80,260,6]].forEach(([a,y,r,s])=>{
    const cl=cloudCluster(Math.sin(a)*r,y,-Math.cos(a)*r,s,.75); cl.traverse(o=>{ if(o.material) o.material.fog=false; }); g.add(cl);
  });

  /* 풀숲 위를 나는 작은 벌레와 나비 몇 마리 */
  const wingG=new THREE.PlaneGeometry(.1,.08); wingG.translate(.05,0,0); wingG.rotateX(-Math.PI/2);
  const BC=['#fffbea','#f7d64a','#ffffff','#e8d9a8'];
  const flies=[];
  for(let i=0;i<10;i++){
    const b=new THREE.Group(), mat=new THREE.MeshBasicMaterial({color:BC[i%BC.length],side:THREE.DoubleSide});
    const L=new THREE.Mesh(wingG,mat), Rt=new THREE.Mesh(wingG,mat); Rt.scale.x=-1; b.add(L,Rt);
    g.add(b); flies.push({b,L,Rt,hx:(R()-.5)*60,hz:(R()-.5)*60,rx:2+R()*4,rz:2+R()*4,sp:.2+R()*.25,ph:R()*6,fl:9+R()*5});
  }
  const bugs=points(40,0,'#2b2a22',.06,null,()=>[(R()-.5)*50,1.2+R()*2.5,(R()-.5)*50]); bugs.material.blending=THREE.NormalBlending; g.add(bugs);
  const bp=bugs.geometry.attributes.position;
  /* 바람에 날리는 억새 솜털 */
  const seeds=points(80,0,'#ffffff',.1,null,()=>[(R()-.5)*70,.6+R()*2.4,(R()-.5)*70]); seeds.material.blending=THREE.NormalBlending; seeds.material.opacity=.8; g.add(seeds);
  const sp=seeds.geometry.attributes.position;

  return {group:g,fog:{c:0xc9dfea,n:80,f:520},bg:0xbcd8ea,bounds:{rect:[-FXH,FXH,-FXH,FXH]},avoid,
    spawn:{x:FPATH(14),z:14},spawnJ:[30,26],groundH:fieldH,waterY:-1000,pitch:.2,pitchSit:.1,
    update(t,dt,me){
      const s=spd();
      U.value+=dt*s;
      flies.forEach((f,i)=>{
        const a=t*f.sp*s+f.ph, x=f.hx+Math.sin(a)*f.rx+Math.sin(a*2.3)*.6, z=f.hz+Math.cos(a*.8)*f.rz;
        f.b.position.set(x,fieldH(x,z)+1.2+.35*Math.sin(a*1.7)+.12*Math.sin(t*3+i),z);
        f.b.rotation.y=Math.atan2(Math.cos(a)*f.rx,-Math.sin(a*.8)*f.rz*.8);
        const fl=.35+Math.sin(t*f.fl+i)*.9; f.L.rotation.z=fl; f.Rt.rotation.z=-fl;
      });
      for(let i=0;i<bp.count;i++){ bp.setXYZ(i,bp.getX(i)+Math.sin(t*1.7+i*3)*dt*.8,bp.getY(i)+Math.sin(t*2.3+i)*dt*.3,bp.getZ(i)+Math.cos(t*1.3+i*2)*dt*.8); }
      bp.needsUpdate=true;
      for(let i=0;i<sp.count;i++){
        let x=sp.getX(i)+dt*(.55+.25*Math.sin(t*.4+i))*s, y=sp.getY(i)+Math.sin(t*.9+i*1.3)*dt*.12*s, z=sp.getZ(i)+Math.sin(t*.3+i)*dt*.15*s;
        if(x>35){ x=-35; z=(Math.random()-.5)*70; y=.8+Math.random()*2; }
        sp.setXYZ(i,x,y,z);
      }
      sp.needsUpdate=true;
    }};
}
BUILD.field=buildField;
