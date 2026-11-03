/* ---- 들녘: 허리까지 자란 누런 풀과 초록 풀, 끝이 휘어진 억새 이삭, 풀을 깎아 낸 초록 바퀴자국 길 ---- */
const FXH=44;                                              // 걸을 수 있는 들판의 절반 너비
const FPATH=z=>6*Math.sin(z*.035+.6)+2*Math.sin(z*.09);    // 들판을 가로지르는 풀 깎인 길
const FPW=1.25;                                            // 길의 반너비
function fieldH(x,z){
  const r=Math.hypot(x,z), a=Math.atan2(z,x), edge=72+7*Math.sin(a*3+1)+4*Math.sin(a*7);   // 풀숲이 끝나는 곳(들쭉날쭉)
  let y=.35*nz(x*.025,0,z*.025)+.12*nz(x*.07,3,z*.07);
  /* 풀숲 너머: 물 빠진 갯벌이 지평선까지 평평하게 */
  const m=smooth(edge,edge+10,r);
  return y*(1-m)+m*(-.45+.04*nz(x*.05,5,z*.05));
}
function fieldEdge(x,z){ const a=Math.atan2(z,x); return 72+7*Math.sin(a*3+1)+4*Math.sin(a*7); }
/* 풀 한 포기: 가늘고 곧은 줄기 여러 장. 누렇게 마른 줄기와 초록 줄기가 섞인다 */
function tuftGeo(seed,n,hMin,hMax,spread,dry){
  const R=rng(seed), pos=[], col=[], nor=[];
  const GB=new THREE.Color('#6a6426'), GT=new THREE.Color('#d8c95a'), DB=new THREE.Color('#9c8236'), DT=new THREE.Color('#f7d777'), c=new THREE.Color();
  for(let b=0;b<n;b++){
    const isDry=R()<dry, a=R()*TAU, d=Math.sqrt(R())*spread, ox=Math.cos(a)*d, oz=Math.sin(a)*d;
    const h=(isDry?1:.8)*(hMin+R()*(hMax-hMin)), w=isDry?.012+R()*.008:.018+R()*.014;
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
    const H=1.6+R()*.7, dir=R()*TAU, dx=Math.cos(dir), dz=Math.sin(dir), bend=1.2+R()*1.6, N=10, w=.006;
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
  g.add(skyDome('#86ade3','#c3d3ec','#f4efe0'));                 // 위는 파랗고 지평선은 연한 크림빛
  g.add(new THREE.HemisphereLight(0xfff2d8,0x7a6230,.9));
  const sun=new THREE.DirectionalLight(0xffdc9a,1.1); sun.position.set(60,45,-40); g.add(sun);

  /* 지형: 풀숲 아래는 짙은 초록(빈틈도 그늘진 풀처럼), 그 너머는 젖은 갯벌 */
  const T=new THREE.PlaneGeometry(1400,1400,260,260); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color();
  const UND=new THREE.Color('#6a5a24'), UND2=new THREE.Color('#7f6a2c'), MUD=new THREE.Color('#5b5950'), MUD2=new THREE.Color('#45453f'), WET=new THREE.Color('#7f8288');
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i), z=tp.getZ(i), y=fieldH(x,z), r=Math.hypot(x,z);
    tp.setY(i,y);
    const n1=nz(x*.05,1,z*.05)*.5+.5, n2=nz(x*.013,4,z*.013)*.5+.5, n3=nz(x*.004,7,z*.004)*.5+.5;
    const m=smooth(fieldEdge(x,z)+2,fieldEdge(x,z)+12,r);
    c.copy(UND).lerp(UND2,n1);
    const mud=MUD.clone().lerp(MUD2,n2).lerp(WET,smooth(.6,.85,n3)*.35);
    c.lerp(mud,m);
    tc[i*3]=c.r; tc[i*3+1]=c.g; tc[i*3+2]=c.b;
  }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  g.add(new THREE.Mesh(T,VC({shininess:14,specular:0x333333})));
  /* 갯벌 위에 낮게 깔린 아침 안개 */
  const mist=softTex(22,'240,238,228',.3); mist.repeat.set(3,3);
  const mm=mesh(new THREE.RingGeometry(80,700,64,2),new THREE.MeshBasicMaterial({map:mist,transparent:true,opacity:.55,depthWrite:false}),0,.6,0); mm.rotation.x=-Math.PI/2; g.add(mm);
  /* 멀리 왼쪽, 갯벌 끝에 낮게 엎드린 숲 섬 */
  [[-430,-520,170,42],[-610,-470,120,26],[-300,-600,70,18]].forEach(([x,z,rr,h],i)=>{
    const ig=new THREE.SphereGeometry(1,40,16,0,TAU,0,Math.PI/2);
    displace(ig,(px,py,pz)=>{ const k=1+.12*nz(px*3+i,py*2,pz*3); return [px*k,Math.pow(Math.max(py,0),.8)*(1+.15*nz(px*4,0,pz*4)),pz*k*.55]; });
    const im=mesh(ig,M(i===1?'#4a6a5a':'#3b5c40',{shininess:2}),x,-.6,z); im.scale.set(rr,h,rr); g.add(im);
  });

  /* 풀숲: 빈틈 없이 빼곡하게. 앉으면 몸이 묻힌다 */
  const tall=[[],[],[]], TT=['#ffffff','#fff2cc','#ffe9b0','#fbe6b8','#fff6d6'];
  for(let n=0,tries=0;n<24000&&tries<90000;tries++){
    const x=(R()-.5)*104, z=(R()-.5)*104;
    if(Math.hypot(x,z)>60) continue;
    const s=.85+R()*.4; n++;
    tall[n%3].push({x,y:fieldH(x,z)-.03,z,sx:s,sy:s*(.9+R()*.3),sz:s,c:choice(R,TT)});
  }
  /* 바깥쪽: 큼직한 포기로 풀숲 끝(갯벌 가장자리)까지 이어 붙인다 */
  for(let n=0,tries=0;n<5000&&tries<30000;tries++){
    const a=R()*TAU, r=58+R()*26, x=Math.cos(a)*r, z=Math.sin(a)*r;
    if(r>fieldEdge(x,z)+2) continue;
    n++; const s=1.35+R()*.45;
    tall[n%3].push({x,y:fieldH(x,z)-.03,z,sx:s,sy:s*.85,sz:s,c:choice(R,TT)});
  }
  const grassMat=swayMat(new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:0}),U,.2);
  [tuftGeo(1,18,1.0,1.35,.44,.85),tuftGeo(2,16,1.1,1.5,.4,.9),tuftGeo(3,20,.9,1.25,.48,.78)].forEach((tg,i)=>g.add(instances(tg,grassMat,tall[i])));

  /* 풀숲 위로 드문드문 고개 숙인 이삭 */
  const plumes=[[],[],[]];
  for(let n=0,tries=0;n<380&&tries<12000;tries++){
    const x=(R()-.5)*110, z=(R()-.5)*110, cl=nz(x*.06+2,1,z*.06)*.5+.5;
    if(R()>.2+cl*.8||Math.hypot(x,z)>64) continue;
    n++; const s=.75+R()*.3;
    plumes[n%3].push({x,y:fieldH(x,z)-.03,z,sx:s,sy:s,sz:s});
  }
  const plumeMat=swayMat(new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:0}),U,.12);
  [plumeGeo(11),plumeGeo(12),plumeGeo(13)].forEach((pg,i)=>g.add(instances(pg,plumeMat,plumes[i])));

  const avoid=[];

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

  return {group:g,fog:{c:0xe9e8e0,n:60,f:900},bg:0xe9e8e0,bounds:{rect:[-FXH,FXH,-FXH,FXH]},avoid,
    spawn:{x:0,z:14},spawnJ:[30,26],groundH:fieldH,waterY:-1000,pitch:.2,pitchSit:.1,
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
