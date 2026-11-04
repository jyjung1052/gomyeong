/* ---- 부드러운 자연물 도형: 위치만으로 결정되는 노이즈로 일그러뜨리고, 법선을 다시 계산해 각을 없앤다 ---- */
const nz=(x,y,z)=>Math.sin(x*1.7+y*2.3+z*.9)*.5+Math.sin(x*3.1-y*1.3+z*2.7)*.3+Math.sin(x*5.3+y*4.1-z*3.3)*.2;
const smooth=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
function displace(geo,fn){
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){ const r=fn(p.getX(i),p.getY(i),p.getZ(i)); p.setXYZ(i,r[0],r[1],r[2]); }
  geo.computeVertexNormals(); return geo;
}
/* 여러 도형을 하나로 합치고 부분마다 색을 입힌다(그리기 한 번) */
function merge(parts){
  const pos=[],nor=[],col=[],idx=[]; let off=0; const c=new THREE.Color();
  parts.forEach(pt=>{
    const g=pt.geo, pa=g.attributes.position, na=g.attributes.normal, n=pa.count;
    c.set(pt.color);
    for(let i=0;i<n;i++){
      pos.push(pa.getX(i),pa.getY(i),pa.getZ(i)); nor.push(na.getX(i),na.getY(i),na.getZ(i));
      const k=pt.shade?pt.shade(pa.getY(i)):1; col.push(c.r*k,c.g*k,c.b*k);
    }
    const ia=g.index.array; for(let i=0;i<ia.length;i++) idx.push(ia[i]+off);
    off+=n;
  });
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
  out.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  out.setIndex(idx); return out;
}
const VC=(o)=>M('#ffffff',Object.assign({vertexColors:true,shininess:2},o||{}));

function pineGeo(){
  const parts=[], trunk=new THREE.CylinderGeometry(.15,.3,3.6,8,3); trunk.translate(0,1.8,0);
  displace(trunk,(x,y,z)=>[x+.05*nz(0,y,z),y,z+.05*nz(x,y,0)]);
  parts.push({geo:trunk,color:'#5a4330'});
  [[2.1,2.8,1.9],[1.8,2.6,3.0],[1.45,2.4,4.1],[1.05,2.2,5.1],[.62,1.8,6.0]].forEach(([r,h,y],i)=>{
    const g=new THREE.ConeGeometry(r,h,16,2); g.translate(0,y+h/2,0);
    displace(g,(x,yy,z)=>{
      const a=Math.atan2(z,x), k=1+.14*nz(x*1.3,yy*.8,z*1.3)+.06*Math.sin(a*7+i*2);
      const d=Math.hypot(x,z);
      return [x*k,yy-.16*d/r+.05*nz(x,yy,z),z*k];
    });
    parts.push({geo:g,color:'#2e5a3c',shade:yy=>.7+.4*clamp((yy-y)/h,0,1)});
  });
  return merge(parts);
}
function broadGeo(){
  const parts=[], trunk=new THREE.CylinderGeometry(.2,.4,3.4,8,3); trunk.translate(0,1.7,0);
  displace(trunk,(x,y,z)=>[x+.12*Math.sin(y*.9)+.04*nz(0,y,z),y,z+.04*nz(x,y,0)]);
  parts.push({geo:trunk,color:'#6b4f3a'});
  [[0,4.5,0,2.3,1.9],[1.5,3.8,.5,1.6,1.4],[-1.4,4.0,-.6,1.7,1.5],[.3,5.7,.3,1.5,1.2]].forEach(([x,y,z,rx,ry],i)=>{
    const g=new THREE.SphereGeometry(1,16,12); g.scale(rx,ry,rx*.95); g.translate(x,y,z);
    displace(g,(px,py,pz)=>{ const k=1+.16*nz(px*.9,py*.9,pz*.9); return [x+(px-x)*k,y+(py-y)*k,z+(pz-z)*k]; });
    parts.push({geo:g,color:'#3f7040',shade:yy=>.62+.5*clamp((yy-(y-ry))/(ry*2),0,1)});
  });
  return merge(parts);
}
function bushGeo(){
  const g=new THREE.SphereGeometry(1,14,10); g.scale(1,.72,1);
  displace(g,(x,y,z)=>{ const k=1+.22*nz(x*2.2,y*2.2,z*2.2); return [x*k,Math.max(y*k,-.15),z*k]; });
  return merge([{geo:g,color:'#3c6a3e',shade:y=>.65+.5*clamp((y+.2)/1,0,1)}]);
}
function rockGeo(){
  const g=new THREE.SphereGeometry(1,22,16);
  return displace(g,(x,y,z)=>{ const k=1+.24*nz(x*2,y*2,z*2)+.08*nz(x*5,y*5,z*5); return [x*k,Math.max(y*.72*k,-.35),z*k]; });
}
function stalGeo(){
  const g=new THREE.ConeGeometry(1,1,14,8);
  return displace(g,(x,y,z)=>{ const t=y+.5, k=Math.pow(Math.max(1-t,0),.8)/Math.max(1-t,1e-3)*(1+.2*nz(x*3,y*3,z*3)); const r=Math.hypot(x,z); return r<1e-4?[x,y,z]:[x*k,y,z*k]; });
}
function mountGeo(){
  const g=new THREE.ConeGeometry(1,1,44,18), p=g.attributes.position, col=new Float32Array(p.count*3);
  const c=new THREE.Color(), rock=new THREE.Color('#6c7f8f'), dark=new THREE.Color('#566a7a'), snow=new THREE.Color('#f4f8fb');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i), t=y+.5, a=Math.atan2(z,x), r=Math.hypot(x,z);
    const prof=Math.pow(Math.max(1-t,0),1.35);
    const k=1+.2*Math.sin(a*5+t*3.2)*(1-t*.6)+.14*nz(Math.cos(a)*2,t*4,Math.sin(a)*2);
    const rr=r>1e-4?prof*k:0;
    p.setXYZ(i,Math.cos(a)*rr,y+.05*nz(x*3,t*3,z*3)*(1-t),Math.sin(a)*rr);
    c.copy(dark).lerp(rock,clamp(t*1.6,0,1)).lerp(snow,smooth(.58,.78,t+.08*nz(x*4,t*3,z*4)));
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  g.computeVertexNormals(); return g;
}

function islandGeo(){
  const g=new THREE.SphereGeometry(1,56,26,0,TAU,0,Math.PI/2), p=g.attributes.position, col=new Float32Array(p.count*3);
  const c=new THREE.Color(), sand=new THREE.Color('#d9c9a0'), grass=new THREE.Color('#6f9a62'), top=new THREE.Color('#4d7a50'), rock=new THREE.Color('#8a8478');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i), a=Math.atan2(z,x);
    const k=1+.16*nz(x*2.5,y*2.5,z*2.5)+.08*Math.sin(a*3+1);
    const yy=Math.pow(Math.max(y,0),.85)*(1+.25*nz(x*3,0,z*3));
    p.setXYZ(i,x*k,yy,z*k);
    c.copy(sand).lerp(grass,smooth(.05,.18,yy)).lerp(top,smooth(.45,.95,yy)).lerp(rock,smooth(.5,.9,nz(x*4,y*4,z*4))*(yy>.1?.4:0));
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.computeVertexNormals(); return g;
}
function conchGeo(){
  const pts=[[0,0],[.08,0],[.17,.04],[.22,.12],[.2,.24],[.14,.36],[.08,.47],[.03,.56],[0,.62]].map(p=>new THREE.Vector2(p[0],p[1]));
  const g=new THREE.LatheGeometry(pts,32);
  return displace(g,(x,y,z)=>{ const k=1+.11*Math.sin(Math.atan2(z,x)*2+y*22); return [x*k,y,z*k]; });
}
function scallopGeo(){
  const g=new THREE.SphereGeometry(1,32,12,0,TAU,0,1.0);
  return displace(g,(x,y,z)=>{ const a=Math.atan2(z,x), r=Math.hypot(x,z), k=1+.07*Math.sin(a*12)*smooth(.1,.8,r); return [x*k,y*.3,z*.92*k]; });
}
function starGeo(){
  const parts=[];
  for(let k=0;k<5;k++){ const g=new THREE.SphereGeometry(1,12,8); g.scale(.3,.07,.075); g.translate(.2,0,0); g.rotateY(k*TAU/5); parts.push({geo:g,color:'#ffffff'}); }
  const c=new THREE.SphereGeometry(1,12,8); c.scale(.14,.08,.14); parts.push({geo:c,color:'#ffffff'});
  return merge(parts);
}

/* 바위산 소나무: 구불구불 휜 붉은 줄기, 옆으로 뻗은 가지, 가지 끝마다 납작하게 층진 솔잎 뭉치. seed마다 모양이 다르다 */
function koreanPineGeo(seed){
  const R=rng(seed), parts=[];
  const H=4.6+R()*2.2, lean=(R()-.5)*1.6, wob=.25+R()*.5, ph=R()*6, dir=R()*TAU;
  const bx=y=>{ const t=y/H; return Math.cos(dir)*(lean*t*t+wob*Math.sin(t*4.2+ph)*t); };
  const bz=y=>{ const t=y/H; return Math.sin(dir)*(lean*t*t)+wob*.6*Math.cos(t*3.6+ph)*t; };
  /* 줄기: 아래는 굵고 위로 갈수록 가늘게, 껍질 결이 거칠다 */
  const trunk=new THREE.CylinderGeometry(.12,.3,H,9,16); trunk.translate(0,H/2,0);
  displace(trunk,(x,y,z)=>{ const k=1+.12*nz(x*6,y*3,z*6)+.06*Math.sin(Math.atan2(z,x)*5+y*2); return [x*k+bx(y),y,z*k+bz(y)]; });
  parts.push({geo:trunk,color:'#8a5a3c',shade:y=>y<H*.35?.62+.5*(y/(H*.35))*.6:.9+.2*nz(y,1,2)});
  /* 뿌리: 바위를 움켜쥔 듯 밑동이 몇 갈래로 퍼진다 */
  for(let i=0;i<4;i++){
    const a=i/4*TAU+R()*.8, rt=new THREE.CylinderGeometry(.04,.13,.9,6,3); rt.translate(0,.45,0); rt.rotateZ(-1.25); rt.rotateY(a); rt.translate(0,.08,0);
    parts.push({geo:rt,color:'#6e4a33'});
  }
  /* 솔잎 뭉치: 납작한 구름 모양 덩어리 2~3개를 겹친다 */
  const pad=(cx,cy,cz,r)=>{
    const n=2+Math.floor(R()*2);
    for(let k=0;k<n;k++){
      const g=new THREE.SphereGeometry(1,14,9), ox=(R()-.5)*r*.9, oz=(R()-.5)*r*.9, oy=(R()-.3)*r*.18, rr=r*(.55+R()*.45);
      g.scale(rr,rr*(.3+R()*.12),rr*(.8+R()*.3));
      displace(g,(x,y,z)=>{ const q=1+.22*nz(x*3.1+seed,y*4,z*3.1)+.1*nz(x*9,y*9,z*9); return [x*q,y*q,z*q]; });
      g.translate(cx+ox,cy+oy,cz+oz);
      const top=cy+oy, hh=rr*.35;
      parts.push({geo:g,color:R()<.5?'#3d6a3a':'#46703c',shade:y=>.55+.6*clamp((y-(top-hh))/(hh*2),0,1)});
    }
  };
  /* 가지: 줄기 위쪽 절반에서 옆으로 뻗어 끝이 살짝 들린다 */
  const nb=3+Math.floor(R()*4);
  for(let i=0;i<nb;i++){
    const y0=H*(.42+.5*i/nb+R()*.06), a=dir+i*2.4+(R()-.5)*.8, L=1.1+R()*1.5*(1-i/nb*.5);
    const sx=bx(y0), sz=bz(y0), ex=sx+Math.cos(a)*L, ez=sz+Math.sin(a)*L, ey=y0+.25+R()*.5;
    const br=new THREE.CylinderGeometry(.03,.08,1,6,4); br.translate(0,.5,0);
    const v=new THREE.Vector3(ex-sx,ey-y0,ez-sz), len=v.length(); br.scale(1,len,1);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()); br.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)); br.translate(sx,y0,sz);
    displace(br,(x,y,z)=>[x+.04*nz(y*4,x,z),y,z+.04*nz(x,y*4,z)]);
    parts.push({geo:br,color:'#7d5236'});
    pad(ex,ey+.05,ez,.75+R()*.55);
  }
  /* 꼭대기 뭉치 */
  pad(bx(H),H-.1,bz(H),.9+R()*.5);
  return merge(parts);
}
