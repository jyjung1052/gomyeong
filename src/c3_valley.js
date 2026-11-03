/* ---- 계곡: 깊은 웅덩이에서 헤엄치고, 얕은 여울에 앉아 물소리를 듣는다 ---- */
const VSX=z=>1.5*Math.sin(z*.12)+.8*Math.sin(z*.31+1);                 // 물길의 중심 x
const VW=z=>2.1+5.6*Math.exp(-Math.pow(z/6.5,2));                      // 물길의 반너비(가운데가 넓은 웅덩이)
const VD=z=>.32+1.95*Math.exp(-Math.pow((z+.5)/6,2));                  // 물 깊이
const V_WATER=-.02;
function valleyH(x,z){
  const w=VW(z), dx=Math.abs(x-VSX(z)), n=.06*nz(x*.5,0,z*.5);
  let y;
  if(dx<w){ const u=dx/w; y=-VD(z)*(1-u*u)*(1-.12*Math.sin(z*.9+x*.7))+n*.6*(1-u); }
  else{ const d=dx-w; y=.1*d+.018*d*d+n*smooth(0,2,d)*(1+d*.1); }
  y+=6.5*smooth(-16.5,-20.5,z)+7*smooth(26,52,z);
  return y;
}
function buildValley(){
  const g=new THREE.Group(), R=rng(77);
  g.add(skyDome('#7fb2d8','#b9d8e6','#e6f1ee'));
  g.add(new THREE.HemisphereLight(0xdcecf5,0x58704f,.9));
  const sun=new THREE.DirectionalLight(0xfff0d0,.95); sun.position.set(-14,26,10); g.add(sun);

  /* 지형: 높이와 색을 함께 만든다 */
  const T=new THREE.PlaneGeometry(130,130,260,260); T.rotateX(-Math.PI/2);
  const tp=T.attributes.position, tc=new Float32Array(tp.count*3), c=new THREE.Color();
  const col=h=>new THREE.Color(h);
  const SAND=col('#cfc4a2'), GRAV=col('#9a9686'), GRASS=col('#72a851'), MOSS=col('#68a04c'), DEEP=col('#2c5b5e'), MID=col('#6f9588'), ROCK=col('#82857f'), FAR=col('#4a7d41');
  for(let i=0;i<tp.count;i++){
    const x=tp.getX(i), z=tp.getZ(i), y=valleyH(x,z);
    tp.setY(i,y);
    const w=VW(z), d=Math.abs(x-VSX(z))-w, nn=nz(x*.8,0,z*.8)*.5+.5;
    if(d<0){ const t=clamp(-y/1.8,0,1); c.copy(SAND).lerp(MID,smooth(0,.5,t)).lerp(DEEP,smooth(.45,1,t)); }
    else{
      c.copy(SAND).lerp(GRAV,smooth(.6,1.8,d)*(1-smooth(1.8,3.2,d))).lerp(GRASS,smooth(1.4,3.4,d)).lerp(FAR,smooth(18,40,d));
    }
    c.lerp(ROCK,smooth(-16.5,-19,z)*.9);
    const k=.97+.05*nz(x*.35,0,z*.35); tc[i*3]=c.r*k; tc[i*3+1]=c.g*k; tc[i*3+2]=c.b*k;
  }
  T.setAttribute('color',new THREE.BufferAttribute(tc,3)); T.computeVertexNormals();
  const terrain=new THREE.Mesh(T,VC({shininess:3}));
  g.add(terrain);

  /* 물: 깊이에 따라 색이 다르고, 흐르는 줄무늬를 위에 겹친다 */
  const WX=60, WZ=64, WSX=60, WSZ=64, wz0=10;
  const wg=new THREE.PlaneGeometry(WX,WZ,WSX,WSZ); wg.rotateX(-Math.PI/2);
  const wp=wg.attributes.position, wc=new Float32Array(wp.count*3), fc=new Float32Array(wp.count*3), base=new Float32Array(wp.count*2);
  const SH=col('#8fd8cc'), DP=col('#1f6e78');
  for(let i=0;i<wp.count;i++){
    const x=wp.getX(i), z=wp.getZ(i)+wz0, dep=clamp(-valleyH(x,z)/2,0,1);
    c.copy(SH).lerp(DP,smooth(0,1,dep)); wc[i*3]=c.r; wc[i*3+1]=c.g; wc[i*3+2]=c.b;
    const f=clamp(1-dep*1.3,0,1)*(dep>0?1:0)*.9; fc[i*3]=f; fc[i*3+1]=f; fc[i*3+2]=f;
    base[i*2]=x; base[i*2+1]=z;
  }
  wg.setAttribute('color',new THREE.BufferAttribute(wc,3));
  const water=new THREE.Mesh(wg,new THREE.MeshPhongMaterial({vertexColors:true,transparent:true,opacity:.7,shininess:140,specular:0xffffff,depthWrite:false}));
  water.position.set(0,V_WATER,wz0); g.add(water);
  const streak=(seed)=>{
    const t=canvasTex(128,512,(gg,w,h)=>{
      gg.fillStyle='#000'; gg.fillRect(0,0,w,h);
      const Rr=rng(seed);
      for(let i=0;i<70;i++){
        const x=Rr()*w, y=Rr()*h, len=30+Rr()*110, a=.12+Rr()*.35;
        const gr=gg.createLinearGradient(0,y,0,y+len); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(.5,`rgba(255,255,255,${a})`); gr.addColorStop(1,'rgba(255,255,255,0)');
        gg.fillStyle=gr; gg.fillRect(x,y,1+Rr()*3,len);
        if(y+len>h){ gg.fillStyle=gr; gg.fillRect(x,y-h,1+Rr()*3,len); }
      }
    });
    t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
  };
  const tA=streak(3), tB=streak(9); tA.repeat.set(10,16); tB.repeat.set(7,10);
  const mkFlow=(tx,k)=>{
    const fg=wg.clone(); fg.setAttribute('color',new THREE.BufferAttribute(fc,3));
    const m=new THREE.Mesh(fg,new THREE.MeshBasicMaterial({map:tx,vertexColors:true,transparent:true,opacity:k,blending:THREE.AdditiveBlending,depthWrite:false}));
    m.position.set(0,V_WATER+.012,wz0); g.add(m); return m;
  };
  mkFlow(tA,.55); mkFlow(tB,.35);

  /* 폭포: 절벽 표면을 따라 흘러내리는 띠 */
  const fall=new THREE.PlaneGeometry(2.2,5,6,28), fp=fall.attributes.position;
  for(let i=0;i<fp.count;i++){
    const lx=fp.getX(i), t=(fp.getY(i)+2.5)/5, z=-16.2-t*4.4, x=VSX(z)+lx*(VW(z)/2.1)*.9;
    fp.setXYZ(i,x,valleyH(x,z)+.1,z);
  }
  fall.computeVertexNormals();
  const tF=canvasTex(64,256,(gg,w,h)=>{
    gg.fillStyle='#000'; gg.fillRect(0,0,w,h);
    const Rr=rng(5);
    for(let i=0;i<46;i++){ const x=Rr()*w, y=Rr()*h, len=40+Rr()*120; const gr=gg.createLinearGradient(0,y,0,y+len); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(.5,`rgba(255,255,255,${.3+Rr()*.5})`); gr.addColorStop(1,'rgba(255,255,255,0)'); gg.fillStyle=gr; gg.fillRect(x,y,2+Rr()*4,len); }
  });
  tF.wrapS=tF.wrapT=THREE.RepeatWrapping; tF.repeat.set(2,3);
  const fallMesh=new THREE.Mesh(fall,new THREE.MeshBasicMaterial({map:tF,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,color:0xdff3ff}));
  g.add(fallMesh);
  const spray=points(36,0,'#e8f4fa',.9,null,i=>[VSX(-16.4)+(R()-.5)*3,.2+R()*1.6,-16.2+(R()-.5)*1.6]); g.add(spray);
  const sprayP=spray.geometry.attributes.position;

  /* 나무와 숲 바닥 */
  const valid=(x,z,min)=>Math.abs(x-VSX(z))-VW(z)>min;
  const pines=[], broads=[], bushes=[], rocks=[], pebbles=[], avoid=[];
  let guard=0;
  while((pines.length<150||broads.length<110)&&guard++<4000){
    const x=(R()-.5)*100, z=-24+R()*60;
    if(!valid(x,z,3.2)) continue;
    if(Math.abs(x)<17&&z>-17&&z<16) continue;
    const s=.8+R()*1.1, it={x,y:valleyH(x,z)-.08,z,sx:s,sy:s*(.9+R()*.4),sz:s,ry:R()*6,c:choice(R,TINT)};
    if(R()<.55&&pines.length<150) pines.push(it); else if(broads.length<110) broads.push(it);
  }
  guard=0;
  while(bushes.length<0&&guard++<6000){
    const x=(R()-.5)*44, z=-16+R()*32;
    if(!valid(x,z,1.6)) continue;
    const s=.22+R()*.3; bushes.push({x,y:valleyH(x,z)+.0,z,sx:s*1.4,sy:s*.45,sz:s*1.4,ry:R()*6,c:choice(R,['#e9f7d8','#ffffff','#dff0c8'])});
  }
  g.add(instances(pineGeo(),VC(),pines)); g.add(instances(broadGeo(),VC(),broads)); g.add(instances(bushGeo(),VC(),bushes));

  /* 바위와 조약돌 */
  const RC=['#8c8e88','#7a7d77','#9b9b92','#6f726c'];
  guard=0;
  while(rocks.length<26&&guard++<800){
    const z=-14+R()*26, side=R()<.5?-1:1, w=VW(z), x=VSX(z)+side*(w+(R()-.35)*2.6);
    if(Math.abs(x)>11.5) continue;
    const s=.45+Math.pow(R(),2)*.9;
    rocks.push({x,y:valleyH(x,z)+s*.12,z,sx:s*1.2,sy:s*.9,sz:s,ry:R()*6,c:choice(R,RC)});
    if(s>1.05) avoid.push({x,z,r:s*.95});
  }
  for(let i=0;i<14;i++){ const z=-12+R()*22, w=VW(z), x=VSX(z)+(R()-.5)*w*1.3, s=.35+R()*.55; rocks.push({x,y:valleyH(x,z)+s*.05,z,sx:s*1.2,sy:s*.8,sz:s,ry:R()*6,c:choice(R,RC)}); }
  for(let i=0;i<360;i++){
    const z=-14+R()*28, w=VW(z), side=R()<.5?-1:1, x=VSX(z)+side*(w+(R()-.55)*3.4), s=.05+R()*.12;
    pebbles.push({x,y:valleyH(x,z)+s*.2,z,sx:s*1.3,sy:s*.7,sz:s,ry:R()*6,c:choice(R,['#b9b09a','#a39d8c','#cfc7b0','#8f8c80'])});
  }
  for(let k=0;k<7;k++){ const z=-16.3+R()*1.2, x=VSX(z)+(R()-.5)*3.2, s=.6+R()*.7; rocks.push({x,y:valleyH(x,z)+.05,z,sx:s*1.2,sy:s*.8,sz:s,ry:R()*6,c:choice(R,RC)}); }
  g.add(instances(rockGeo(),VC({vertexColors:false}),rocks)); g.add(instances(rockGeo(),VC({vertexColors:false}),pebbles));

  /* 물고기 */
  const fishes=[];
  for(let i=0;i<7;i++){
    const f=new THREE.Group(), cl=i<4?'#d6934a':'#6d7c74';
    const b=mesh(new THREE.SphereGeometry(.14,12,8),M(cl,{shininess:30}),0,0,0); b.scale.set(.55,.5,1.7); f.add(b);
    const tl=mesh(new THREE.ConeGeometry(.1,.2,8),M(cl,{shininess:30}),0,0,-.3); tl.rotation.x=-Math.PI/2; tl.scale.set(.4,1,1); f.add(tl);
    g.add(f); fishes.push({f,a:R()*TAU,sp:.18+R()*.18,rx:2.4+R()*3,rz:2.2+R()*3.4,y:-.55-R()*.7,ph:R()*6});
  }
  /* 물빛 반짝임, 잠자리, 안개 */
  const glint=points(70,0,'#ffffff',.2,null,()=>{ const z=-10+R()*22, x=VSX(z)+(R()-.5)*VW(z)*1.7; return [x,V_WATER+.04,z]; }); g.add(glint);
  const flies=points(9,0,'#eaffd8',.14,null,i=>[0,1,0]); g.add(flies);
  const fp2=flies.geometry.attributes.position;
  const mist=softTex(18,'230,240,240',.22); mist.repeat.set(2,2);
  const mm=mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshBasicMaterial({map:mist,transparent:true,opacity:.45,depthWrite:false}),0,1.6,-4); mm.rotation.x=-Math.PI/2; g.add(mm);
  const rayTex=canvasTex(64,256,(gg,w,h)=>{ const gr=gg.createLinearGradient(0,0,0,h); gr.addColorStop(0,'rgba(255,248,210,.0)'); gr.addColorStop(.25,'rgba(255,248,210,.9)'); gr.addColorStop(1,'rgba(255,248,210,0)'); gg.fillStyle=gr; gg.fillRect(0,0,w,h); const gx=gg.createLinearGradient(0,0,w,0); gx.addColorStop(0,'rgba(0,0,0,1)'); gx.addColorStop(.5,'rgba(0,0,0,0)'); gx.addColorStop(1,'rgba(0,0,0,1)'); gg.globalCompositeOperation='destination-out'; gg.fillStyle=gx; gg.fillRect(0,0,w,h); });
  [[-7,9,-6,.35],[3,10,-11,-.3],[8,9,2,.4],[-3,10,4,-.35]].forEach(([x,y,z,r],i)=>{
    const m=mesh(new THREE.PlaneGeometry(3.4+i*.4,17),new THREE.MeshBasicMaterial({map:rayTex,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,side:THREE.DoubleSide}),x,y,z);
    m.rotation.z=r; m.rotation.y=i*.9; g.add(m);
  });

  /* 물결 고리 */
  const ringG=new THREE.RingGeometry(.9,1,28), rings=[];
  for(let i=0;i<28;i++){
    const m=mesh(ringG,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}),0,V_WATER+.03,0);
    m.rotation.x=-Math.PI/2; m.visible=false; m.userData={age:9,life:1,max:.5}; g.add(m); rings.push(m);
  }
  let rc=0, ringT=0, splT=0, ambT=0;
  const ring=(x,z,max,life)=>{ const r=rings[rc++%rings.length]; r.position.set(x,V_WATER+.03,z); r.userData.age=0; r.userData.life=life; r.userData.max=max; r.visible=true; };

  const spawnZ=9;
  const wv=wp, N=wv.count;
  let frame=0;
  return {group:g,fog:{c:0xcfe3df,n:16,f:92},bg:0xbfd9e6,bounds:{rect:[-12,12,-14.2,12]},avoid,
    spawn:{x:VSX(spawnZ)-VW(spawnZ)-1.4,z:spawnZ},groundH:valleyH,waterY:V_WATER,pitch:.26,pitchSit:.14,
    update(t,dt,me){
      const s=spd();
      tA.offset.y+=dt*.5*s; tB.offset.y+=dt*.27*s; tB.offset.x=Math.sin(t*.2)*.02; tF.offset.y+=dt*1.7*s;
      mist.offset.x+=dt*.002*s;
      if((frame++&1)===0){
        for(let i=0;i<N;i++){
          const x=base[i*2], z=base[i*2+1];
          wv.setY(i,.022*Math.sin(x*1.3+t*1.3+z*.8)+.014*Math.sin(x*2.7-t*1.9+z*1.7));
        }
        wv.needsUpdate=true; wg.computeVertexNormals();
      }
      for(let i=0;i<sprayP.count;i++){ let y=sprayP.getY(i)+dt*(.5+(i%5)*.12)*s; if(y>2.2) y=.1; sprayP.setY(i,y); }
      sprayP.needsUpdate=true;
      glint.material.opacity=.55+.35*Math.sin(t*3.1);
      fishes.forEach((o,i)=>{
        o.a+=dt*o.sp*s;
        const z0=VSX(0), px=z0+Math.cos(o.a)*o.rx, pz=-.5+Math.sin(o.a)*o.rz;
        o.f.position.set(px,o.y+.08*Math.sin(t*1.5+o.ph),pz);
        o.f.rotation.y=Math.atan2(-Math.sin(o.a)*o.rx,Math.cos(o.a)*o.rz);
        o.f.children[1].rotation.y=Math.sin(t*7+o.ph)*.5;
      });
      for(let i=0;i<fp2.count;i++){ const a=t*.35+i*1.7; fp2.setXYZ(i,VSX(2)+Math.sin(a)*4+Math.cos(a*.6+i)*2,1.1+.4*Math.sin(a*1.3),-2+Math.cos(a*.8)*7); }
      fp2.needsUpdate=true;
      ambT-=dt; if(ambT<0){ ambT=.8+Math.random()*1.8; const z=-8+Math.random()*16; ring(VSX(z)+(Math.random()-.5)*VW(z)*1.3,z,.35+Math.random()*.3,1.6); }
      if(me){
        const dep=V_WATER-valleyH(me.x,me.z);
        if(dep>.05&&(me.walking)){
          ringT-=dt; if(ringT<0){ ringT=.28; ring(me.x,me.z,.9+Math.min(dep,1.2)*.4,1.2); }
          splT-=dt; if(splT<0){ splT=dep>.8?.55:.4; Sound.event('splash',Math.min(1,dep)); }
        }
      }
      rings.forEach(r=>{
        if(!r.visible) return;
        const u=r.userData; u.age+=dt; const k=u.age/u.life;
        if(k>=1){ r.visible=false; return; }
        const sc=u.max*(.25+k*1.4); r.scale.set(sc,sc,1); r.material.opacity=.5*(1-k);
      });
    }};
}
BUILD.valley=buildValley;
