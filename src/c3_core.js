'use strict';
const $=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv=$('stage');
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const damp=(a,b,k,dt)=>lerp(a,b,1-Math.exp(-k*dt));
function rng(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
const spd=()=>reduce?.4:1;

const REALMS=[
  {id:'sea',name:'바다',short:'파도',line:'파도 소리',color:'#4f9cc7'},
  {id:'forest',name:'숲',short:'눈과 바람',line:'눈 내리는 소리와 바람',color:'#8fb8d9'},
  {id:'lake',name:'호숫가',short:'물결',line:'잔물결과 풀벌레',color:'#7f86c6'},
  {id:'valley',name:'계곡',short:'흐르는 물',line:'계곡물 소리',color:'#3fae9f'},
  {id:'mountain',name:'산',short:'정상의 바람',line:'정상의 바람과 먼 종소리',color:'#8fa0b4'},
  {id:'cave',name:'동굴',short:'물방울',line:'물방울과 울림',color:'#b88a52'},
  {id:'rain',name:'원두막',short:'빗소리',line:'처마에 듣는 빗소리',color:'#6f8f8a'},
  {id:'field',name:'들녘',short:'바람과 풀숲',line:'풀잎이 사그락이는 바람',color:'#a9a05a'},
  /* 검은 방: 하얀 방 맞은편 반원. 쌓인 마음을 몸으로 터뜨리는 곳(아직 짓는 중) */
  {id:'thunder',name:'우레',short:'마음껏 소리치기',line:'대나무숲에 소리치기',color:'#d4b04a',dark:true},
  {id:'bolt',name:'벼락',short:'와장창 깨기',line:'접시와 유리병 깨기',color:'#f0e070',dark:true},
  {id:'spout',name:'용오름',short:'허공에 발차기',line:'이불 위 하이킥',color:'#6f8fe0',dark:true,soon:true},
  {id:'hail',name:'우박',short:'두드리고 때리기',line:'베개 두드리기',color:'#b9c8d8',dark:true,soon:true},
  {id:'quake',name:'지진',short:'쿵쿵 발 구르기',line:'발 굴러 땅 흔들기',color:'#b0824e',dark:true,soon:true},
  {id:'avalanche',name:'눈사태',short:'와르르 무너뜨리기',line:'쌓인 것 무너뜨리기',color:'#dce6f0',dark:true,soon:true},
  {id:'gale',name:'질풍',short:'미친 듯이 달리기',line:'트랙을 미친 듯이 달리기',color:'#e0673f',dark:true,soon:true},
  {id:'downpour',name:'장대비',short:'실컷 울기',line:'창가에서 실컷 울기',color:'#5f86a8',dark:true,soon:true}
];

/* ---- 렌더러 ---- */
let renderer=null;
try{
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true});
  renderer.setClearColor(0xffffff,1);
}catch(e){
  const n=document.querySelector('#login .note');
  if(n) n.textContent='이 기기에서는 3D 화면을 열 수 없어요. 2D 버전을 이용해 주세요.';
}
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,1,.1,1400);
let W=1,H=1;

/* ---- 재료와 도형 도우미 ---- */
const M=(color,o)=>new THREE.MeshPhongMaterial(Object.assign({color,flatShading:false,shininess:4},o||{}));
const B=(color,o)=>new THREE.MeshBasicMaterial(Object.assign({color},o||{}));
function mesh(geo,mat,x,y,z){ const m=new THREE.Mesh(geo,mat); m.position.set(x||0,y||0,z||0); return m; }
function canvasTex(w,h,draw){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c); return t;
}
function radialTex(rgb){
  return canvasTex(128,128,(g,w,h)=>{
    const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    r.addColorStop(0,`rgba(${rgb},1)`); r.addColorStop(.35,`rgba(${rgb},.45)`); r.addColorStop(1,`rgba(${rgb},0)`);
    g.fillStyle=r; g.fillRect(0,0,w,h);
  });
}
const GLOW=radialTex('255,255,255');
function glowSprite(color,size,x,y,z,op){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color,transparent:true,opacity:op==null?1:op,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  s.scale.set(size,size,1); s.position.set(x,y,z); return s;
}
function points(n,spread,color,size,map,fn){
  const g=new THREE.BufferGeometry(), pos=new Float32Array(n*3);
  for(let i=0;i<n;i++){ const p=fn(i); pos[i*3]=p[0]; pos[i*3+1]=p[1]; pos[i*3+2]=p[2]; }
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const m=new THREE.PointsMaterial({color,size,map:map||GLOW,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
  const pt=new THREE.Points(g,m); pt.frustumCulled=false; return pt;
}
function skyDome(top,mid,hor){
  const g=new THREE.SphereGeometry(600,24,14), p=g.attributes.position, col=new Float32Array(p.count*3);
  const a=new THREE.Color(top), b=new THREE.Color(mid), c=new THREE.Color(hor), t=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const y=clamp(p.getY(i)/600,0,1);
    if(y<.35) t.copy(c).lerp(b,y/.35); else t.copy(b).lerp(a,(y-.35)/.65);
    col[i*3]=t.r; col[i*3+1]=t.g; col[i*3+2]=t.b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));
  m.renderOrder=-10; m.frustumCulled=false; return m;
}
/* 평면을 바닥으로 눕히고 높이를 흔든다 */
function groundPlane(w,d,sx,sz,color,fn,circle){
  const g=circle?new THREE.RingGeometry(.01,w,sx,28):new THREE.PlaneGeometry(w,d,sx,sz);
  g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  if(fn) for(let i=0;i<p.count;i++) p.setY(i,fn(p.getX(i),p.getZ(i)));
  g.computeVertexNormals();
  return new THREE.Mesh(g,M(color,{shininess:2}));
}
function instances(geo,mat,items){
  const im=new THREE.InstancedMesh(geo,mat,items.length), m4=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler(), s=new THREE.Vector3(), p=new THREE.Vector3(), c=new THREE.Color();
  items.forEach((it,i)=>{
    e.set(it.rx||0,it.ry||0,it.rz||0); q.setFromEuler(e);
    s.set(it.sx||1,it.sy||1,it.sz||1); p.set(it.x,it.y,it.z);
    m4.compose(p,q,s); im.setMatrixAt(i,m4);
    if(it.c){ c.set(it.c); im.setColorAt(i,c); }
  });
  im.instanceMatrix.needsUpdate=true;
  if(im.instanceColor) im.instanceColor.needsUpdate=true;
  im.frustumCulled=false; return im;
}

/* ---- 앉는 사람: 저고리 모양의 윗옷과 넉넉한 바지 ---- */
function buildFigure(){
  const root=new THREE.Group();
  const top=M('#eee8d9',{shininess:6}), topDk=M('#d3cbb6',{shininess:6}), collar=M('#fbf8f0',{shininess:6}), tie=M('#7f9b86',{shininess:6});
  const pants=M('#6e4c38',{shininess:4}), pantsDk=M('#553a2a',{shininess:4}), skin=M('#ecd0ad',{shininess:8}), ink=B('#3b2f26'), hairM=M('#2e2622',{shininess:14});
  const ball=(r,mat,x,y,z,sx,sy,sz)=>{ const m=mesh(new THREE.SphereGeometry(r,24,16),mat,x,y,z); m.scale.set(sx||1,sy||1,sz||1); return m; };
  const lathe=(pts,mat)=>new THREE.Mesh(new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),32),mat);
  const UP=new THREE.Vector3(0,1,0);
  const limb=(a,b,r0,r1,mat)=>{
    const D=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]), len=D.length();
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,len,20,2),mat);
    m.position.set(a[0]+D.x*.5,a[1]+D.y*.5,a[2]+D.z*.5);
    m.quaternion.setFromUnitVectors(UP,D.normalize()); return m;
  };

  /* 윗몸: 허리를 원점으로 한다 */
  const upper=new THREE.Group(); root.add(upper);
  const chest=new THREE.Group(); upper.add(chest);
  const PR=[[-.17,.275],[-.02,.255],[.08,.245],[.2,.245],[.32,.23],[.4,.2],[.48,.14],[.52,.075],[.535,0]], SXW=1.15, SZD=.82;
  const rAt=y=>{ for(let i=0;i<PR.length-1;i++){ const A=PR[i],C=PR[i+1]; if(y<=C[0]) return lerp(A[1],C[1],clamp((y-A[0])/(C[0]-A[0]),0,1)); } return 0; };
  const surf=(x,y)=>{ const r=rAt(y), ex=r*SXW, q=1-Math.pow(clamp(x/ex,-.97,.97),2); return r*SZD*Math.sqrt(q)+.011; };
  const body=lathe([[0,-.17]].concat(PR.map(p=>[p[1],p[0]])),top); body.geometry.scale(SXW,1,SZD); chest.add(body);
  const hem=mesh(new THREE.TorusGeometry(.275,.012,8,40),topDk,0,-.168,0); hem.rotation.x=Math.PI/2; hem.scale.set(SXW,SZD,1); chest.add(hem);
  /* 깃: 오른쪽 깃이 왼쪽 위로 겹쳐 비스듬히 내려온다 */
  const lapel=(x0,y0,x1,y1,rad,mat)=>{ const n=7; for(let i=0;i<n;i++){ const ta=i/n, tb=(i+1)/n, xa=lerp(x0,x1,ta), ya=lerp(y0,y1,ta), xb=lerp(x0,x1,tb), yb=lerp(y0,y1,tb); chest.add(limb([xa,ya,surf(xa,ya)],[xb,yb,surf(xb,yb)],rad,rad,mat)); } };
  lapel(-.085,.52,.2,.3,.02,topDk); lapel(.085,.52,.15,.33,.018,topDk);
  const neckBand=mesh(new THREE.TorusGeometry(.098,.024,10,28),collar,0,.545,0); neckBand.rotation.x=Math.PI/2; chest.add(neckBand);
  /* 고름 */
  chest.add(ball(.03,tie,.17,.27,surf(.17,.27)+.012,1.5,.9,.8));
  [[.19,-.08],[.15,.08]].forEach(([x,r])=>{ const rb=mesh(new THREE.BoxGeometry(.034,.34,.008),tie,x,.1,surf(x,.1)+.006); rb.rotation.z=r; chest.add(rb); });
  upper.add(mesh(new THREE.CylinderGeometry(.075,.085,.14,16),skin,0,.6,0));
  const head=new THREE.Group(); head.position.y=.76; upper.add(head);
  head.add(ball(.235,skin,0,0,0)); head.add(ball(.055,skin,-.235,-.01,0)); head.add(ball(.055,skin,.235,-.01,0));
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.255,28,16,0,TAU,0,Math.PI*.43),hairM); cap.position.set(0,.02,-.025); cap.rotation.x=-.18; head.add(cap);
  head.add(ball(.215,hairM,0,.01,-.09,1.1,.86,.9));
  const brows=[-1,1].map(sx=>{ const br=mesh(new THREE.BoxGeometry(.07,.011,.01),hairM,sx*.085,.082,.22); br.rotation.z=0; head.add(br); return br; });
  /* 고함칠 때만 보이는 크게 벌린 입 */
  const mouth=ball(.05,M('#5a2a26',{shininess:10}),0,-.1,.2,1.1,1,.5); mouth.visible=false; head.add(mouth);
  const eyesOpen=new THREE.Group(), eyesClosed=new THREE.Group();
  eyesOpen.add(ball(.028,ink,-.085,.03,.21),ball(.028,ink,.085,.03,.21));
  [-.085,.085].forEach(x=>eyesClosed.add(mesh(new THREE.BoxGeometry(.075,.014,.01),ink,x,.03,.225)));
  eyesClosed.visible=false; head.add(eyesOpen,eyesClosed);

  /* 서 있을 때의 팔: 어깨에서 흔든다 */
  const standArms=new THREE.Group(); upper.add(standArms);
  const mkArm=sx=>{
    const a=new THREE.Group(); a.position.set(sx*.235,.4,0);
    a.add(ball(.078,top,0,0,0)); a.add(limb([0,0,0],[0,-.27,.02],.074,.088,top)); a.add(ball(.09,top,0,-.27,.02));
    a.add(limb([0,-.27,.02],[0,-.52,.09],.09,.122,top));
    const cuff=mesh(new THREE.TorusGeometry(.125,.012,8,24),topDk,0,-.52,.09); cuff.rotation.x=Math.PI/2+.28; a.add(cuff);
    a.add(ball(.068,skin,0,-.6,.1,1,1.15,.8)); standArms.add(a); return a;
  };
  const armL=mkArm(-1), armR=mkArm(1);
  /* 앉았을 때의 팔: 무릎 위로 내려 두 손을 포갠다 */
  const sitArms=new THREE.Group(); sitArms.visible=false; upper.add(sitArms);
  [-1,1].forEach(sx=>{
    const S1=[sx*.235,.4,0], E=[sx*.33,.15,.1], Hd=[sx*.06,-.02,.3];
    sitArms.add(ball(.078,top,S1[0],S1[1],S1[2])); sitArms.add(limb(S1,E,.074,.088,top)); sitArms.add(ball(.09,top,E[0],E[1],E[2]));
    sitArms.add(limb(E,Hd,.09,.12,top)); sitArms.add(ball(.07,skin,Hd[0],Hd[1]-.01,Hd[2]+.04));
  });
  sitArms.add(ball(.075,skin,0,-.03,.35,1.4,.7,1));

  /* 서 있을 때의 다리: 통 넓은 바지, 발목은 끈으로 묶었다 */
  const legsStand=new THREE.Group(); root.add(legsStand);
  legsStand.add(ball(.28,pants,0,-.02,-.02,1,.5,.48));
  const mkLeg=sx=>{
    const l=new THREE.Group(); l.position.set(sx*.125,0,0);
    const pl=lathe([[0,-.79],[.122,-.79],[.13,-.75],[.142,-.69],[.152,-.59],[.168,-.47],[.18,-.34],[.178,-.2],[.17,-.08],[.155,0],[0,0]],pants); pl.geometry.scale(1,1,.88); l.add(pl);
    const band=mesh(new THREE.TorusGeometry(.125,.02,10,24),pantsDk,0,-.775,0); band.rotation.x=Math.PI/2; l.add(band);
    l.add(limb([0,-.78,0],[0,-.86,.01],.056,.05,skin));
    l.add(ball(.08,skin,0,-.875,.06,1,.5,1.75));
    for(let i=0;i<5;i++) l.add(ball(.017-.001*i,skin,(i-2)*.027*(sx>0?-1:1)*-1,-.885,.2-Math.abs(i-2)*.008));
    legsStand.add(l); return l;
  };
  const legL=mkLeg(-1), legR=mkLeg(1);
  /* 앉았을 때의 다리: 책상다리 */
  const legsSit=new THREE.Group(); legsSit.visible=false; root.add(legsSit);
  legsSit.add(ball(.28,pants,0,.2,-.02,1,.55,.55));
  [-1,1].forEach(sx=>{
    const hip=[sx*.14,.2,0], knee=[sx*.5,.17,.3], foot=[-sx*.14,.11,.5];
    legsSit.add(limb(hip,knee,.16,.155,pants)); legsSit.add(ball(.16,pants,knee[0],knee[1],knee[2]));
    const mid=[knee[0]+(foot[0]-knee[0])*.78,knee[1]+(foot[1]-knee[1])*.78,knee[2]+(foot[2]-knee[2])*.78];
    legsSit.add(limb(knee,mid,.155,.13,pants)); legsSit.add(ball(.135,pantsDk,mid[0],mid[1],mid[2],1,.55,1));
    legsSit.add(limb(mid,foot,.058,.052,skin)); legsSit.add(ball(.058,skin,foot[0],foot[1],foot[2]));
    legsSit.add(ball(.072,skin,foot[0],foot[1]-.015,foot[2]+.07,1,.55,1.55));
    for(let i=0;i<5;i++) legsSit.add(ball(.016,skin,foot[0]+(i-2)*.026,foot[1]-.03,foot[2]+.19-Math.abs(i-2)*.008));
  });

  const shadow=mesh(new THREE.CircleGeometry(.8,28),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.18,depthWrite:false}),0,.03,0);
  shadow.rotation.x=-Math.PI/2; root.add(shadow);
  const halo=mesh(new THREE.CircleGeometry(2.2,28),new THREE.MeshBasicMaterial({map:GLOW,color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}),0,.04,0);
  halo.rotation.x=-Math.PI/2; root.add(halo);
  const ring=mesh(new THREE.RingGeometry(.97,1,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,fog:false}),0,.06,0);
  ring.rotation.x=-Math.PI/2; root.add(ring);

  /* 분노 몸짓: stage 'build'(꾹 참으며 몸을 비틀고 부르르) → 'yell'(고개 젖히고 팔 벌려 터뜨림). null이면 원래대로 */
  const yell=(t,stage,u)=>{
    if(!stage){
      upper.rotation.set(0,0,0); upper.position.x=0; head.rotation.set(0,0,0); armL.rotation.z=0; armR.rotation.z=0; armL.rotation.y=0; armR.rotation.y=0;
      mouth.visible=false; brows[0].rotation.z=0; brows[1].rotation.z=0; brows[0].position.y=brows[1].position.y=.082; return;
    }
    const jit=(a)=>(Math.sin(t*61)+Math.sin(t*47+1.3))*.5*a;
    eyesOpen.visible=false; eyesClosed.visible=true;
    brows[0].rotation.z=-.45; brows[1].rotation.z=.45; brows[0].position.y=brows[1].position.y=.065;
    if(stage==='build'){
      const k=Math.min(1,u*1.6), writhe=Math.sin(t*6.5)*.42*k+Math.sin(t*3.1)*.2*k;
      upper.rotation.set(.22*k+jit(.04*k),writhe,Math.sin(t*4.7)*.16*k+jit(.05*k));
      upper.position.y-=.08*k; upper.position.x=jit(.025*k);
      head.rotation.set(.35*k+jit(.06*k),-writhe*.5,jit(.06*k));
      armL.rotation.x=-1.25*k+jit(.15*k); armR.rotation.x=-1.25*k+jit(.15*k);   // 주먹을 가슴 앞에 움켜쥔다
      armL.rotation.z=.55*k; armR.rotation.z=-.55*k;
      mouth.visible=u>.55; mouth.scale.set(1.3,.35+.3*u,.5);
    }else{
      const k=Math.min(1,u*6), fade=u>.85?1-(u-.85)/.15:1, shake=.07*fade;
      upper.rotation.set(-.32*k*fade+jit(shake),jit(shake*.6),jit(shake));
      upper.position.x=jit(.03*fade);
      head.rotation.set(-.55*k*fade+jit(shake*1.5),jit(shake),jit(shake));
      armL.rotation.x=-.5*k*fade; armR.rotation.x=-.5*k*fade;
      armL.rotation.z=-2.3*k*fade+jit(.12*fade); armR.rotation.z=2.3*k*fade+jit(.12*fade);   // 두 팔을 하늘로 벌린다
      mouth.visible=true; mouth.scale.set(1.25,1.6*k*fade+.3,.55);
    }
  };
  /* 망치: 오른손에 쥔다. 내리칠 때만 보인다 */
  const hammer=new THREE.Group(); hammer.visible=false; hammer.position.set(0,-.6,.1); armR.add(hammer);
  hammer.add(mesh(new THREE.CylinderGeometry(.028,.034,.8,8),M('#8a6a44',{shininess:10}),0,-.3,0));
  const hh=mesh(new THREE.BoxGeometry(.16,.16,.36),M('#3a3b3f',{shininess:60,specular:0x888888}),0,-.72,0); hammer.add(hh);
  hammer.add(mesh(new THREE.CylinderGeometry(.04,.04,.06,8),M('#222'),0,-.08,0));
  /* 내리치기 몸짓: 0~.5 머리 위로 치켜들고 → .5~.62 온 힘으로 내리찍고 → 천천히 돌아온다. null이면 원래대로 */
  const smash=(t,u)=>{
    if(u==null){ hammer.visible=false; upper.rotation.set(0,0,0); head.rotation.set(0,0,0); armL.rotation.set(0,0,0); armR.rotation.set(0,0,0);
      mouth.visible=false; brows[0].rotation.z=0; brows[1].rotation.z=0; brows[0].position.y=brows[1].position.y=.082; return; }
    hammer.visible=true;
    const ease=x=>x*x*(3-2*x);
    let ax, lean, open;
    if(u<.5){ const k=ease(u/.5); ax=-3.05*k; lean=-.28*k; open=.2*k; }
    else if(u<.62){ const k=Math.pow((u-.5)/.12,2); ax=lerp(-3.05,-.55,k); lean=lerp(-.28,.5,k); open=lerp(.2,1,k); }
    else{ const k=ease(Math.min(1,(u-.62)/.38)), hold=u<.75?0:k; ax=lerp(-.55,0,hold); lean=lerp(.5,0,hold); open=1-k; }
    const jit=u>.6&&u<.72?(Math.sin(t*70)*.03):0;
    armL.rotation.set(ax+jit,0,.32*Math.min(1,u*4)); armR.rotation.set(ax+jit,0,-.32*Math.min(1,u*4));
    upper.rotation.set(lean,0,0); head.rotation.set(-lean*.4,0,0);
    brows[0].rotation.z=-.45; brows[1].rotation.z=.45; brows[0].position.y=brows[1].position.y=.065;
    eyesOpen.visible=u<.5; eyesClosed.visible=u>=.5;
    mouth.visible=open>.15; mouth.scale.set(1.2,.4+1.2*open,.5);
  };
  return {
    root, shadow, flats:[shadow,halo,ring], yell, smash,
    update(t,sitting,walking,breath,haloColor,haloK,ringOn,lie){
      const lying=!!(sitting&&lie), sit=sitting&&!lying;
      legsStand.visible=!sit; legsSit.visible=sit;
      standArms.visible=!sit; sitArms.visible=sit;
      eyesOpen.visible=!sitting; eyesClosed.visible=sitting;
      shadow.scale.setScalar(sitting?1.15:.85);
      if(!sit){
        const ph=t*9, sw=walking?Math.sin(ph):0, bob=walking?Math.abs(Math.sin(ph))*.045:0;
        upper.position.y=.92+bob; legsStand.position.y=.92+bob;
        legL.rotation.x=sw*.6; legR.rotation.x=-sw*.6;
        armL.rotation.x=-sw*.5; armR.rotation.x=sw*.5;
        if(lying){ chest.scale.set(1+.012*breath,1+.02*breath,1+.03*breath); head.position.y=.76+.012*breath; legL.rotation.x=legR.rotation.x=armL.rotation.x=armR.rotation.x=0; }
        else{ chest.scale.set(1,1,1); head.position.y=.76; }
      }else{
        upper.position.y=.3;
        chest.scale.set(1+.012*breath,1+.02*breath,1+.03*breath); head.position.y=.76+.012*breath;
      }
      halo.material.color.set(haloColor||'#ffffff');
      halo.material.opacity=sitting?.5*haloK:0;
      ring.visible=sitting&&ringOn&&!lying;
      if(ring.visible){
        const r=1.5+1.2*breath; ring.scale.set(r,r,1); ring.material.opacity=.55-.25*breath;
      }
    }
  };
}

/* ---- 하얀 방(여덟 문)과 맞은편 검은 방(여덟 문) ---- */
/* 문은 서 있는 자리(0,2)를 반원으로 감싼다. 각 문은 가운데를 바라보고, 다가서는 자리(ax,az)는 문 앞 2.4 */
const HUB_C={x:0,z:2}, HUB_R=8.5;
const WHITE_N=REALMS.filter(r=>!r.dark).length, BLACK_N=REALMS.length-WHITE_N;
const DOORS=REALMS.map((r,i)=>{
  /* 하얀 문은 앞쪽 반원, 검은 문은 뒤쪽 반원 */
  const GAP=TAU/(WHITE_N+BLACK_N), th=r.dark?Math.PI+(i-WHITE_N-(BLACK_N-1)/2)*GAP:(i-(WHITE_N-1)/2)*GAP, sn=Math.sin(th), cs=Math.cos(th);   // 열여섯 문을 원 둘레에 같은 간격으로
  const x=HUB_C.x+sn*HUB_R, z=HUB_C.z-cs*HUB_R;
  return {realm:r,x,z,ry:-th,w:2.2,h:4.5,ax:x-sn*2.4,az:z+cs*2.4};
});
function archShape(w,h,inset){
  const r=w/2-inset, s=new THREE.Shape();
  s.moveTo(-r,inset>0?inset:0); s.lineTo(-r,h-w/2); s.absarc(0,h-w/2,r,Math.PI,0,true); s.lineTo(r,inset>0?inset:0); s.lineTo(-r,inset>0?inset:0);
  return s;
}
function archGeo(shape,w,h){
  const g=new THREE.ShapeGeometry(shape,16), p=g.attributes.position, uv=g.attributes.uv;
  for(let i=0;i<p.count;i++) uv.setXY(i,(p.getX(i)+w/2)/w,p.getY(i)/h);
  return g;
}
/* 문마다 이름에 맞는 풍경을 그려 넣는다 */
const DOOR_PAINT={
  sea(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,300); gr.addColorStop(0,'#8ec8ec'); gr.addColorStop(1,'#fbe4cb'); g.fillStyle=gr; g.fillRect(0,0,w,300);
    const sun=g.createRadialGradient(150,262,4,150,262,90); sun.addColorStop(0,'rgba(255,244,205,1)'); sun.addColorStop(.3,'rgba(255,230,180,.6)'); sun.addColorStop(1,'rgba(255,230,180,0)'); g.fillStyle=sun; g.fillRect(0,150,w,220);
    gr=g.createLinearGradient(0,270,0,h); gr.addColorStop(0,'#74c3df'); gr.addColorStop(1,'#2b7fae'); g.fillStyle=gr; g.fillRect(0,270,w,h);
    for(let r=0;r<9;r++){ const y=282+r*r*2.6+r*8; g.strokeStyle='rgba(255,255,255,'+(.18+r*.05)+')'; g.lineWidth=1.5+r*.35; g.beginPath(); for(let x=0;x<=w;x+=6){ const yy=y+Math.sin(x*.05+r*1.7)*(2+r*.5); x?g.lineTo(x,yy):g.moveTo(x,yy); } g.stroke(); }
    g.fillStyle='#fff'; g.beginPath(); g.moveTo(74,300); g.lineTo(74,254); g.lineTo(100,298); g.closePath(); g.fill();
    g.fillStyle='#f3e4cf'; g.beginPath(); g.moveTo(70,300); g.lineTo(70,266); g.lineTo(54,298); g.closePath(); g.fill();
    g.fillStyle='#8b6a48'; g.fillRect(52,299,52,5);
  },
  forest(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#cddff0'); gr.addColorStop(.7,'#eef4fa'); gr.addColorStop(1,'#ffffff'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='#f7fbff'; g.beginPath(); g.moveTo(0,330); g.quadraticCurveTo(100,300,w,340); g.lineTo(w,h); g.lineTo(0,h); g.fill();
    const tree=(x,y,sz,a)=>{ for(let k=0;k<4;k++){ const ty=y-k*sz*.45, tw=sz*(1-k*.18); g.fillStyle='rgba(92,120,150,'+a+')'; g.beginPath(); g.moveTo(x,ty-sz*.7); g.lineTo(x+tw*.5,ty); g.lineTo(x-tw*.5,ty); g.closePath(); g.fill(); g.fillStyle='rgba(255,255,255,'+Math.min(1,a+.2)+')'; g.beginPath(); g.moveTo(x,ty-sz*.7); g.lineTo(x+tw*.36,ty-sz*.08); g.quadraticCurveTo(x,ty-sz*.22,x-tw*.4,ty-sz*.06); g.closePath(); g.fill(); } g.fillStyle='rgba(120,100,90,'+a+')'; g.fillRect(x-2,y,4,sz*.18); };
    [[40,300,60,.35],[210,296,54,.35],[92,320,72,.55],[170,324,80,.6],[130,350,100,.9],[30,360,92,.85],[226,366,96,.88]].forEach(t=>tree(...t));
    const Rr=rng(11); for(let i=0;i<70;i++){ g.fillStyle='rgba(255,255,255,'+(.5+Rr()*.5)+')'; g.beginPath(); g.arc(Rr()*w,Rr()*340,1+Rr()*1.8,0,TAU); g.fill(); }
  },
  lake(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,300); gr.addColorStop(0,'#b9b6ea'); gr.addColorStop(1,'#f6dbe2'); g.fillStyle=gr; g.fillRect(0,0,w,300);
    g.fillStyle='#fffbe8'; g.beginPath(); g.arc(160,120,24,0,TAU); g.fill();
    g.fillStyle='rgba(255,251,232,.25)'; g.beginPath(); g.arc(160,120,40,0,TAU); g.fill();
    g.fillStyle='#8c88bd'; g.beginPath(); g.moveTo(0,300); g.lineTo(0,240); g.lineTo(46,206); g.lineTo(88,244); g.lineTo(140,190); g.lineTo(196,250); g.lineTo(230,222); g.lineTo(w,252); g.lineTo(w,300); g.fill();
    gr=g.createLinearGradient(0,300,0,h); gr.addColorStop(0,'#a1a6dc'); gr.addColorStop(1,'#6a73bd'); g.fillStyle=gr; g.fillRect(0,300,w,h);
    for(let i=0;i<9;i++){ g.fillStyle='rgba(255,251,232,'+(.5-i*.045)+')'; g.fillRect(160-14+i*1.5,306+i*14,28-i*3,3); }
    g.strokeStyle='rgba(255,255,255,.3)'; g.lineWidth=1.5; for(let i=0;i<7;i++){ g.beginPath(); g.ellipse(70+i*22,320+i*22,22+i*3,3+i*.4,0,0,TAU); g.stroke(); }
  },
  valley(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,300); gr.addColorStop(0,'#cdeee3'); gr.addColorStop(1,'#eef8ef'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='#6fb98f'; g.beginPath(); g.moveTo(0,260); g.quadraticCurveTo(60,150,120,200); g.quadraticCurveTo(190,120,w,230); g.lineTo(w,h); g.lineTo(0,h); g.fill();
    g.fillStyle='#8c9a96'; g.fillRect(96,170,64,170);
    g.fillStyle='#55a37a'; g.beginPath(); g.moveTo(0,300); g.quadraticCurveTo(70,260,96,300); g.lineTo(96,h); g.lineTo(0,h); g.fill(); g.beginPath(); g.moveTo(w,290); g.quadraticCurveTo(190,260,160,310); g.lineTo(160,h); g.lineTo(w,h); g.fill();
    g.fillStyle='rgba(255,255,255,.92)'; g.fillRect(110,172,36,170);
    g.fillStyle='rgba(255,255,255,.5)'; for(let i=0;i<8;i++) g.fillRect(114+i*4,176+(i%3)*20,2,120);
    gr=g.createLinearGradient(0,340,0,h); gr.addColorStop(0,'#7fe0d2'); gr.addColorStop(1,'#2fa392'); g.fillStyle=gr; g.fillRect(0,340,w,h);
    g.fillStyle='rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(128,344,34,8,0,0,TAU); g.fill();
    g.strokeStyle='rgba(255,255,255,.4)'; g.lineWidth=2; for(let i=0;i<6;i++){ g.beginPath(); g.moveTo(20+i*40,370+i%3*16); g.quadraticCurveTo(40+i*40,360+i%3*16,60+i*40,372+i%3*16); g.stroke(); }
  },
  mountain(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,330); gr.addColorStop(0,'#33406c'); gr.addColorStop(.55,'#d98f7a'); gr.addColorStop(1,'#ffe0a0'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    const sun=g.createRadialGradient(128,300,6,128,300,110); sun.addColorStop(0,'rgba(255,248,214,1)'); sun.addColorStop(.35,'rgba(255,214,150,.6)'); sun.addColorStop(1,'rgba(255,200,140,0)'); g.fillStyle=sun; g.fillRect(0,170,w,260);
    const ridge=(y,amp,col,seed)=>{ const Rr=rng(seed); g.fillStyle=col; g.beginPath(); g.moveTo(0,h); let yy=y; for(let x=0;x<=w+20;x+=18){ yy=y+(Rr()-.5)*amp; g.lineTo(x,yy); } g.lineTo(w,h); g.fill(); };
    ridge(318,30,'#a98898',2); ridge(338,34,'#8b7592',5); ridge(362,36,'#6b6486',9); ridge(392,30,'#4f5476',14);
    g.fillStyle='rgba(255,255,255,.55)'; for(let i=0;i<7;i++){ g.beginPath(); g.ellipse(20+i*38,350+(i%2)*26,46,9,0,0,TAU); g.fill(); }
    g.fillStyle='#fff0c8'; g.beginPath(); g.arc(128,300,26,Math.PI,0); g.fill();
  },
  cave(g,w,h,R){
    g.fillStyle='#2b2019'; g.fillRect(0,0,w,h);
    const gr=g.createRadialGradient(128,100,10,128,120,200); gr.addColorStop(0,'rgba(255,226,160,.95)'); gr.addColorStop(.4,'rgba(222,160,90,.45)'); gr.addColorStop(1,'rgba(120,70,40,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='rgba(255,236,190,.25)'; g.beginPath(); g.moveTo(100,0); g.lineTo(156,0); g.lineTo(220,400); g.lineTo(40,400); g.fill();
    g.fillStyle='#17110d'; g.beginPath(); g.moveTo(0,0); g.lineTo(100,0); g.quadraticCurveTo(70,70,84,140); g.quadraticCurveTo(40,220,60,340); g.lineTo(0,h); g.fill(); g.beginPath(); g.moveTo(w,0); g.lineTo(156,0); g.quadraticCurveTo(186,60,170,140); g.quadraticCurveTo(216,230,196,340); g.lineTo(w,h); g.fill();
    g.fillStyle='#3a2c22'; g.beginPath(); g.moveTo(0,420); g.quadraticCurveTo(128,360,w,420); g.lineTo(w,h); g.lineTo(0,h); g.fill();
    [[70,400,14,'#f4c36b'],[96,414,9,'#7fe0d2'],[168,404,12,'#f4c36b'],[190,420,8,'#ffd9a0']].forEach(([x,y,s,c])=>{ g.fillStyle=c; g.globalAlpha=.9; g.beginPath(); g.moveTo(x,y-s*2.2); g.lineTo(x+s*.7,y); g.lineTo(x,y+s*.3); g.lineTo(x-s*.7,y); g.closePath(); g.fill(); g.globalAlpha=1; });
  },
  field(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,300); gr.addColorStop(0,'#3c82cf'); gr.addColorStop(1,'#cfe4ee'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='#3f6e3a'; g.beginPath(); g.moveTo(90,282); g.quadraticCurveTo(170,236,w,240); g.lineTo(w,300); g.lineTo(90,300); g.fill();
    g.fillStyle='#5f8f4a'; for(let i=0;i<9;i++){ g.beginPath(); g.arc(10+i*30,292+(i%2)*3,14+(i%3)*3,0,TAU); g.fill(); }
    gr=g.createLinearGradient(0,296,0,h); gr.addColorStop(0,'#b9b073'); gr.addColorStop(1,'#cdbd7c'); g.fillStyle=gr; g.fillRect(0,296,w,h);
    g.fillStyle='#78ad48'; g.beginPath(); g.moveTo(122,300); g.lineTo(136,300); g.lineTo(170,h); g.lineTo(96,h); g.closePath(); g.fill();
    const Rr=rng(8);
    g.lineWidth=1.2; for(let i=0;i<220;i++){ const x=Rr()*w, y=300+Rr()*(h-300), L=8+(y-300)*.12*Rr()+6; g.strokeStyle=Rr()<.65?'rgba(214,198,132,.95)':'rgba(110,150,70,.9)'; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(Rr()-.5)*3,y-L); g.stroke(); }
    g.strokeStyle='rgba(235,226,196,.95)'; g.lineWidth=1.3;
    [[200,330,70],[228,350,64],[176,350,56],[40,340,58]].forEach(([x,y,L])=>{ g.beginPath(); g.moveTo(x,y+L); g.quadraticCurveTo(x+4,y,x-12,y+8); g.stroke(); g.lineWidth=3; g.beginPath(); g.moveTo(x-10,y+6); g.lineTo(x-14,y+18); g.stroke(); g.lineWidth=1.3; });
  },
  thunder(g,w,h,R){
    g.fillStyle='#0f1114'; g.fillRect(0,0,w,h);
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#2a2a38'); gr.addColorStop(1,'#101214'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='rgba(255,236,160,.18)'; g.beginPath(); g.arc(150,90,90,0,TAU); g.fill();
    g.strokeStyle='#ffe58a'; g.lineWidth=5; g.lineJoin='miter'; g.beginPath(); g.moveTo(150,20); g.lineTo(122,120); g.lineTo(150,118); g.lineTo(112,230); g.stroke();
    g.strokeStyle='rgba(255,229,138,.5)'; g.lineWidth=2; g.beginPath(); g.moveTo(132,82); g.lineTo(96,128); g.stroke();
    const Rr=rng(3); for(let i=0;i<16;i++){ const x=8+i*16+Rr()*6, lean=(Rr()-.5)*30; g.strokeStyle=i%2?'#3f6a3a':'#4f7f45'; g.lineWidth=6+Rr()*3; g.beginPath(); g.moveTo(x,h); g.quadraticCurveTo(x+lean*.3,260,x+lean,120+Rr()*80); g.stroke();
      g.strokeStyle='rgba(20,30,20,.6)'; g.lineWidth=1.5; for(let k=0;k<5;k++){ const y=h-40-k*50; g.beginPath(); g.moveTo(x-4,y); g.lineTo(x+4,y); g.stroke(); } }
  },
  spout(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#1a1d2c'); gr.addColorStop(1,'#0c0d12'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(140,165,240,.75)'; for(let i=0;i<14;i++){ const y=40+i*24, rx=18+i*7; g.lineWidth=3; g.beginPath(); g.ellipse(128+Math.sin(i*.7)*14,y,rx,7,0,0,TAU); g.stroke(); }
    g.fillStyle='#e9e4ff'; g.beginPath(); g.ellipse(128,330,96,22,0,0,TAU); g.fill();
    g.fillStyle='#3a3550'; g.save(); g.translate(150,300); g.rotate(-.5); g.fillRect(-6,-60,12,60); g.restore();
    g.fillStyle='#f2e6d0'; g.beginPath(); g.ellipse(178,250,12,7,-.5,0,TAU); g.fill();
  },
  hail(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#1c2128'); gr.addColorStop(1,'#0d0f12'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    const Rr=rng(5); g.fillStyle='rgba(220,232,245,.9)'; for(let i=0;i<60;i++){ g.beginPath(); g.arc(Rr()*w,Rr()*300,1.5+Rr()*3,0,TAU); g.fill(); }
    [[80,300,70,40,'#e8e4dc'],[170,316,74,42,'#d9d4ca'],[124,268,66,36,'#f4f0e8']].forEach(([x,y,rx,ry,c])=>{ g.fillStyle=c; g.beginPath(); g.ellipse(x,y,rx,ry,0,0,TAU); g.fill(); g.strokeStyle='rgba(0,0,0,.15)'; g.lineWidth=2; g.beginPath(); g.ellipse(x,y,rx*.6,ry*.4,0,0,TAU); g.stroke(); });
    g.fillStyle='rgba(255,255,255,.85)'; for(let i=0;i<10;i++){ const x=40+Rr()*180, y=180+Rr()*80; g.beginPath(); g.ellipse(x,y,7,2.5,Rr()*3,0,TAU); g.fill(); }
  },
  downpour(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#1d2733'); gr.addColorStop(1,'#0e1318'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='#2c3a48'; g.fillRect(40,40,176,250); g.strokeStyle='#5b6b78'; g.lineWidth=6; g.strokeRect(40,40,176,250); g.beginPath(); g.moveTo(128,40); g.lineTo(128,290); g.moveTo(40,165); g.lineTo(216,165); g.stroke();
    const Rr=rng(9); g.strokeStyle='rgba(170,200,230,.55)'; g.lineWidth=1.4; for(let i=0;i<90;i++){ const x=44+Rr()*168, y=44+Rr()*240; g.beginPath(); g.moveTo(x,y); g.lineTo(x-3,y+18); g.stroke(); }
    g.fillStyle='rgba(190,215,240,.7)'; for(let i=0;i<14;i++){ const x=48+Rr()*160, y=60+Rr()*220; g.beginPath(); g.ellipse(x,y,2.5,4,0,0,TAU); g.fill(); }
    g.fillStyle='#e9e0d0'; g.beginPath(); g.ellipse(128,350,46,30,0,0,TAU); g.fill(); g.fillStyle='#2b2420'; g.beginPath(); g.arc(128,318,20,0,TAU); g.fill();
  },
  gale(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#2a1610'); gr.addColorStop(1,'#110a08'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.strokeStyle='#c4573a'; g.lineWidth=26; g.beginPath(); g.ellipse(128,250,104,150,0,0,TAU); g.stroke();
    g.strokeStyle='rgba(255,255,255,.75)'; g.lineWidth=2; g.setLineDash([10,8]); g.beginPath(); g.ellipse(128,250,104,150,0,0,TAU); g.stroke(); g.setLineDash([]);
    g.strokeStyle='rgba(255,170,120,.6)'; g.lineWidth=3; for(let i=0;i<7;i++){ const y=90+i*36; g.beginPath(); g.moveTo(20+i*6,y); g.lineTo(110+i*10,y-6); g.stroke(); }
  },
  bolt(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#24222e'); gr.addColorStop(1,'#0e0e12'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.strokeStyle='#fff3a0'; g.lineWidth=6; g.beginPath(); g.moveTo(90,10); g.lineTo(140,110); g.lineTo(112,116); g.lineTo(170,230); g.stroke();
    g.fillStyle='rgba(255,243,160,.15)'; g.beginPath(); g.arc(140,240,80,0,TAU); g.fill();
    const Rr=rng(12); for(let i=0;i<22;i++){ const x=128+(Rr()-.5)*200, y=250+Rr()*110, s=4+Rr()*12; g.fillStyle=i%3?'rgba(230,240,250,.85)':'rgba(170,215,200,.8)'; g.beginPath(); g.moveTo(x,y-s); g.lineTo(x+s*.8,y+s*.3); g.lineTo(x-s*.6,y+s*.6); g.closePath(); g.fill(); }
    g.fillStyle='#e9e4da'; g.beginPath(); g.ellipse(128,340,40,10,0,0,TAU); g.fill();
  },
  quake(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#2a2018'); gr.addColorStop(1,'#120d09'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='#5a4330'; g.fillRect(0,250,w,h-250);
    g.strokeStyle='#0c0806'; g.lineWidth=5; g.beginPath(); g.moveTo(128,250); g.lineTo(110,300); g.lineTo(140,340); g.lineTo(118,400); g.moveTo(110,300); g.lineTo(60,330); g.moveTo(140,340); g.lineTo(200,360); g.stroke();
    g.strokeStyle='rgba(240,190,120,.55)'; g.lineWidth=3; for(let i=0;i<3;i++){ g.beginPath(); g.ellipse(128,250,40+i*30,8+i*5,0,0,TAU); g.stroke(); }
    g.fillStyle='#8a6a4a'; [[60,236,18],[200,232,22],[150,226,12]].forEach(([x,y,r])=>{ g.beginPath(); g.arc(x,y,r,Math.PI,0); g.fill(); });
  },
  avalanche(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#1d2430'); gr.addColorStop(1,'#0d1016'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='#e6edf4'; g.beginPath(); g.moveTo(0,330); g.lineTo(70,150); g.lineTo(150,250); g.lineTo(210,120); g.lineTo(w,200); g.lineTo(w,h); g.lineTo(0,h); g.fill();
    g.fillStyle='rgba(240,246,252,.75)'; const Rr=rng(14); for(let i=0;i<26;i++){ g.beginPath(); g.arc(120+Rr()*130,200+Rr()*170,8+Rr()*20,0,TAU); g.fill(); }
    ['#c9b28c','#b89c74','#d6c39f'].forEach((c,i)=>{ g.save(); g.translate(60+i*26,330-i*4); g.rotate(-.4+i*.35); g.fillStyle=c; g.fillRect(-18,-9,36,18); g.restore(); });
  },
  rain(g,w,h,R){
    let gr=g.createLinearGradient(0,0,0,h); gr.addColorStop(0,'#9fb3b0'); gr.addColorStop(1,'#d5e1dc'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='rgba(120,150,140,.5)'; g.beginPath(); g.moveTo(0,250); g.quadraticCurveTo(70,190,130,240); g.quadraticCurveTo(190,200,w,250); g.lineTo(w,330); g.lineTo(0,330); g.fill();
    g.fillStyle='#4a5a54'; g.beginPath(); g.moveTo(52,222); g.lineTo(204,222); g.lineTo(232,262); g.lineTo(24,262); g.closePath(); g.fill();
    g.fillStyle='#6a7a72'; g.fillRect(40,262,176,6);
    g.fillStyle='#5a4a3a'; [56,98,158,200].forEach(x=>g.fillRect(x,268,6,62));
    g.fillStyle='#8a7556'; g.fillRect(34,330,188,8);
    gr=g.createLinearGradient(0,338,0,h); gr.addColorStop(0,'#6f9a88'); gr.addColorStop(1,'#3e6e5c'); g.fillStyle=gr; g.fillRect(0,338,w,h);
    const Rr=rng(5); for(let i=0;i<22;i++){ const x=Rr()*w,y=350+Rr()*150,r=18+Rr()*20; g.fillStyle='rgba('+(70+Rr()*30|0)+','+(130+Rr()*40|0)+','+(100+Rr()*30|0)+',.9)'; g.beginPath(); g.ellipse(x,y,r,r*.32,0,0,TAU); g.fill(); }
    g.fillStyle='#f4c9d4'; g.beginPath(); g.arc(180,420,9,0,TAU); g.fill(); g.fillStyle='#fde6ec'; g.beginPath(); g.arc(180,418,5,0,TAU); g.fill();
    g.strokeStyle='rgba(255,255,255,.5)'; g.lineWidth=1.3; for(let i=0;i<60;i++){ const x=Rr()*w,y=Rr()*330; g.beginPath(); g.moveTo(x,y); g.lineTo(x-4,y+16); g.stroke(); }
  }
};
function doorTexture(realm){
  return canvasTex(256,512,(g,w,h)=>{
    (DOOR_PAINT[realm.id]||((g,w,h)=>{ g.fillStyle='#fff'; g.fillRect(0,0,w,h); }))(g,w,h,realm);
    /* 이름 띠 */
    g.fillStyle=realm.dark?'rgba(18,18,22,.9)':'rgba(253,251,245,.92)'; g.beginPath(); g.roundRect?g.roundRect(34,392,188,92,14):g.rect(34,392,188,92); g.fill();
    g.strokeStyle=realm.color; g.globalAlpha=.7; g.lineWidth=2; g.beginPath(); g.moveTo(54,470); g.lineTo(202,470); g.stroke(); g.globalAlpha=1;
    g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle=realm.dark?'#f2efe6':'#34332e'; g.font='700 52px "Gowun Batang","Apple SD Gothic Neo","Malgun Gothic",serif';
    g.fillText(realm.name,w/2,424);
    g.fillStyle=realm.dark?'#a9a59a':'#8a887f'; g.font='22px "Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    g.fillText(realm.short,w/2,456);
  });
}
/* 문 위의 둥근 표식 */
function emblemTexture(realm){
  return canvasTex(128,128,(g,w,h)=>{
    g.fillStyle=realm.color; g.beginPath(); g.arc(64,64,60,0,TAU); g.fill();
    g.fillStyle='rgba(255,255,255,.18)'; g.beginPath(); g.arc(64,64,50,0,TAU); g.fill();
    g.strokeStyle='#fff'; g.fillStyle='#fff'; g.lineWidth=5; g.lineCap='round'; g.lineJoin='round';
    const id=realm.id;
    if(id==='sea'){ for(let i=0;i<3;i++){ g.beginPath(); for(let x=28;x<=100;x+=4){ const y=48+i*17+Math.sin((x-28)*.14)*5; x==28?g.moveTo(x,y):g.lineTo(x,y); } g.stroke(); } }
    else if(id==='forest'){ for(let i=0;i<3;i++){ const a=i*Math.PI/3; g.beginPath(); g.moveTo(64+Math.cos(a)*34,64+Math.sin(a)*34); g.lineTo(64-Math.cos(a)*34,64-Math.sin(a)*34); g.stroke(); } g.beginPath(); g.arc(64,64,6,0,TAU); g.fill(); }
    else if(id==='lake'){ g.beginPath(); g.arc(64,64,30,0,TAU); g.fill(); g.fillStyle=realm.color; g.beginPath(); g.arc(76,56,26,0,TAU); g.fill(); }
    else if(id==='valley'){ g.beginPath(); g.moveTo(64,26); g.quadraticCurveTo(96,66,64,100); g.quadraticCurveTo(32,66,64,26); g.fill(); }
    else if(id==='mountain'){ g.beginPath(); g.moveTo(24,98); g.lineTo(54,40); g.lineTo(72,70); g.lineTo(84,52); g.lineTo(106,98); g.closePath(); g.fill(); }
    else if(id==='cave'){ g.beginPath(); g.moveTo(64,24); g.lineTo(88,64); g.lineTo(64,104); g.lineTo(40,64); g.closePath(); g.fill(); }
    else { for(let i=0;i<3;i++){ g.beginPath(); g.moveTo(40+i*24,34+i%2*10); g.lineTo(34+i*24,60+i%2*10); g.stroke(); g.beginPath(); g.moveTo(52+i*12,76+i%2*6); g.lineTo(48+i*12,96+i%2*6); g.stroke(); } }
  });
}
function buildHub(){
  const g=new THREE.Group();
  g.add(new THREE.HemisphereLight(0xffffff,0xe9e7e0,.95));
  const dl=new THREE.DirectionalLight(0xffffff,.55); dl.position.set(4,10,6); g.add(dl);
  const floor=groundPlane(70,0,48,0,'#f4f3ef',null,true); g.add(floor);
  /* 맞은편 반원은 검은 방: 검은 바닥과 둥글게 두른 검은 벽 */
  const bf=new THREE.CircleGeometry(40,64,Math.PI,Math.PI); bf.rotateX(-Math.PI/2);
  const blackFloor=mesh(bf,M('#17171a',{shininess:30,specular:0x333338}),HUB_C.x,.006,HUB_C.z); g.add(blackFloor);
  const bw=new THREE.CylinderGeometry(11.5,11.5,14,64,1,true,-Math.PI/2,Math.PI);
  const blackWall=mesh(bw,new THREE.MeshBasicMaterial({color:0x0e0e10,side:THREE.BackSide,fog:false}),HUB_C.x,7,HUB_C.z); g.add(blackWall);
  const seam=mesh(new THREE.PlaneGeometry(23,.04),B('#8f8c84'),HUB_C.x,.014,HUB_C.z); seam.rotation.x=-Math.PI/2; g.add(seam);
  const ringTex=canvasTex(1024,1024,(c,w,h)=>{
    const cx=w/2, cy=h/2, U=64; c.lineCap='round';
    [1.6,3.4,5.4,7.4].forEach((r,i)=>{ c.strokeStyle='rgba(150,146,130,'+(.22-i*.03)+')'; c.lineWidth=i===3?3:2; c.beginPath(); c.arc(cx,cy,r*U,0,TAU); c.stroke(); });
    DOORS.forEach(d=>{
      const th=-d.ry, sn=Math.sin(th), cs=Math.cos(th);
      const gr=c.createLinearGradient(cx+sn*1.6*U,cy-cs*1.6*U,cx+sn*7.2*U,cy-cs*7.2*U); gr.addColorStop(0,d.realm.color+'00'); gr.addColorStop(1,d.realm.color+'88');
      c.strokeStyle=gr; c.lineWidth=5; c.beginPath(); c.moveTo(cx+sn*1.6*U,cy-cs*1.6*U); c.lineTo(cx+sn*7.2*U,cy-cs*7.2*U); c.stroke();
      c.fillStyle=d.realm.color+'bb'; c.beginPath(); c.arc(cx+sn*7.2*U,cy-cs*7.2*U,7,0,TAU); c.fill();
    });
    c.fillStyle='rgba(150,146,130,.28)'; for(let i=0;i<12;i++){ const a=i/12*TAU; c.beginPath(); c.ellipse(cx+Math.cos(a)*.85*U,cy+Math.sin(a)*.85*U,.42*U,.16*U,a,0,TAU); c.fill(); }
  });
  const decal=mesh(new THREE.CircleGeometry(8,64),new THREE.MeshBasicMaterial({map:ringTex,transparent:true,depthWrite:false,fog:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),HUB_C.x,.012,HUB_C.z);
  decal.rotation.x=-Math.PI/2; g.add(decal);
  const dust=points(40,0,'#cfcdc4',.12,null,()=>[(Math.random()-.5)*40,Math.random()*8,(Math.random()-.5)*30-6]);
  g.add(dust);
  const doors=DOORS.map((d,i)=>{
    const dg=new THREE.Group(); dg.position.set(d.x,0,d.z); dg.rotation.y=d.ry;
    const outer=archShape(d.w+.3,d.h+.15,0), inner=archShape(d.w,d.h,0);
    outer.holes.push(new THREE.Path(inner.getPoints(24).reverse()));
    const frameMat=M('#'+new THREE.Color(d.realm.color).lerp(new THREE.Color(d.realm.dark?'#141416':'#ffffff'),.72).getHexString(),{shininess:12});
    const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(outer,{depth:.22,bevelEnabled:false,curveSegments:16}),frameMat);
    frame.position.z=-.11; dg.add(frame);
    const portal=new THREE.Mesh(archGeo(inner,d.w,d.h),new THREE.MeshBasicMaterial({map:doorTexture(d.realm),fog:false}));
    portal.position.z=-.02; portal.userData.door=i; dg.add(portal);
    const glow=new THREE.Mesh(archGeo(inner,d.w,d.h),new THREE.MeshBasicMaterial({color:d.realm.color,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
    glow.position.z=.0; dg.add(glow);
    const emb=mesh(new THREE.CircleGeometry(.34,32),new THREE.MeshBasicMaterial({map:emblemTexture(d.realm),transparent:true,fog:false}),0,d.h+.62,.01); dg.add(emb);
    const sill=mesh(new THREE.BoxGeometry(d.w+.3,.05,.3),B(d.realm.color),0,.025,0); dg.add(sill);
    const spill=mesh(new THREE.PlaneGeometry(d.w*1.6,3.4),new THREE.MeshBasicMaterial({map:canvasTex(64,128,(c,w,h)=>{ const gr=c.createLinearGradient(0,0,0,h); gr.addColorStop(0,'rgba(255,255,255,.9)'); gr.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=gr; c.fillRect(0,0,w,h); }),color:d.realm.color,transparent:true,opacity:.15,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}),0,.02,1.7);
    spill.rotation.x=-Math.PI/2; dg.add(spill);
    g.add(dg);
    return {portal,glow,spill};
  });
  return {
    group:g, doors, portals:doors.map(d=>d.portal),
    fog:{c:0xffffff,n:16,f:58}, bg:0xffffff,
    bounds:{circle:[HUB_C.x,HUB_C.z,7.6]}, avoid:[], spawn:{x:HUB_C.x,z:HUB_C.z},
    update(t,dt,me,hover){
      dust.position.y=Math.sin(t*.2)*.3;
      doors.forEach((d,i)=>{
        const near=clamp(1-Math.hypot(me.x-DOORS[i].ax,me.z-DOORS[i].az)/3.6,0,1);
        const k=Math.max(near,hover===i?.9:0);
        d.glow.material.opacity=.12*k+.04*Math.sin(t*1.3+i)*k;
        d.spill.material.opacity=.12+.5*k;
      });
    }
  };
}
