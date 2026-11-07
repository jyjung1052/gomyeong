/* ---- 종이 찢기: 눈사태 방. 손가락으로 그은 대로 종이가 찢어진다. 천천히 그으면 '찌이이익', 빠르게 그으면 '쫙쫙'.
   잘게 찢긴 조각은 날아가 설산의 눈이 되어 펑펑 내리고 쌓인다 ---- */
const Tear=(()=>{
  const dayKey=()=>{ const d=new Date(); return 'gomyeong3d_tear_'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); };
  let today=0; try{ today=+(localStorage.getItem(dayKey())||0); }catch(e){}
  let open_=false, boxOpen=false, sel=null;
  /* 1) 무엇을 찢을지 고르는 상자 */
  const box=document.createElement('div'); box.id='tearBox'; box.className='yellbox actbox'; box.hidden=true;
  box.innerHTML='<div class="yhead"><p class="yq">무엇을 찢어 버릴까요?</p><p class="ycount"></p></div><div class="ych"></div><form class="yrow"><input maxlength="12" placeholder="걱정 쓰기 (안 써도 돼요)" aria-label="종이에 쓸 걱정"><button class="pill sit ygo" type="submit">찢기 시작</button></form><button class="pill ycancel" type="button">닫기</button>';
  const cnt=box.querySelector('.ycount'), chips=box.querySelector('.ych'), form=box.querySelector('.yrow'), inp=form.querySelector('input');
  AV_WORRY.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='pill ychip'; b.textContent=t;
    b.addEventListener('click',()=>{ sel=sel===t?null:t; chips.querySelectorAll('.ychip').forEach(x=>x.classList.toggle('on',x.textContent===sel)); }); chips.appendChild(b); });
  form.addEventListener('submit',e=>{ e.preventDefault(); inp.blur(); begin(inp.value.trim()||sel||''); inp.value=''; });
  box.querySelector('.ycancel').addEventListener('click',()=>{ boxOpen=false; box.hidden=true; });
  ['pointerdown','touchstart','wheel'].forEach(k=>box.addEventListener(k,e=>e.stopPropagation(),{passive:true}));
  (document.querySelector('#hud .bottom')||document.body).prepend(box);
  const showCount=()=>{ cnt.textContent=today?`오늘 ${today}장 찢음`:''; cnt.hidden=!today; }; showCount();

  /* 2) 찢는 판: 화면 가득 종이 한 장. 3D 눈은 그 뒤로 보인다 */
  const layer=document.createElement('div'); layer.id='tearLayer'; layer.hidden=true;
  layer.innerHTML='<canvas></canvas><p class="thint">손가락으로 그어서 찢어요 · 천천히 찌이익, 빠르게 쫙쫙</p><button class="pill tdone" type="button">그만 찢기</button>';
  (document.body||{appendChild(){}}).appendChild(layer);
  const cv2=layer.querySelector('canvas'), g=cv2.getContext('2d'), hint=layer.querySelector('.thint');
  layer.querySelector('.tdone').addEventListener('click',close);
  let VW=0, VH=0, DPR=1;
  function fit(){ DPR=Math.min(2,window.devicePixelRatio||1); VW=window.innerWidth; VH=window.innerHeight; cv2.width=VW*DPR; cv2.height=VH*DPR; cv2.style.width=VW+'px'; cv2.style.height=VH+'px'; }
  window.addEventListener('resize',()=>{ if(open_) fit(); });

  /* 종이: 줄 쳐진 크림색 종이에 걱정 글씨 */
  let sheet=null, pieces=[], A0=1, text='';
  function makeSheet(t){
    const w=Math.min(VW*.8,380), h=Math.min(w*1.32,VH*.62), x0=(VW-w)/2, y0=Math.max(90,(VH-h)/2-30);
    const img=document.createElement('canvas'); img.width=w*DPR; img.height=h*DPR; const c=img.getContext('2d'); c.scale(DPR,DPR);
    c.fillStyle='#fffdf5'; c.fillRect(0,0,w,h);
    c.strokeStyle='rgba(110,150,210,.35)'; c.lineWidth=1.2; for(let y=46;y<h-10;y+=28){ c.beginPath(); c.moveTo(14,y); c.lineTo(w-14,y); c.stroke(); }
    c.strokeStyle='rgba(230,120,120,.4)'; c.beginPath(); c.moveTo(34,0); c.lineTo(34,h); c.stroke();
    if(t){ c.fillStyle='#2b2a35'; c.textAlign='center'; c.textBaseline='middle'; let fs=Math.min(64,w/ (t.length*.9+1)*1.6);
      c.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`; while(c.measureText(t).width>w-40&&fs>20){ fs-=3; c.font=`700 ${fs}px "Gowun Dodum","Apple SD Gothic Neo",sans-serif`; }
      c.save(); c.translate(w/2,h/2); c.rotate(-.06); c.fillText(t,0,0); c.restore(); }
    sheet={img,w,h,x0,y0};
    pieces=[{poly:[[0,0],[w,0],[w,h],[0,h]],ox:x0,oy:y0-VH,vy:0,rot:0,vx:0,vr:0,fall:false,life:0,edges:[]}];   // 위에서 스르륵 내려온다
    A0=w*h; text=t;
  }
  /* 다각형 도우미 */
  const area=p=>{ let a=0; for(let i=0;i<p.length;i++){ const [x1,y1]=p[i],[x2,y2]=p[(i+1)%p.length]; a+=x1*y2-x2*y1; } return Math.abs(a)/2; };
  const centroid=p=>{ let x=0,y=0; p.forEach(q=>{ x+=q[0]; y+=q[1]; }); return [x/p.length,y/p.length]; };
  const inside=(p,x,y)=>{ let c=false; for(let i=0,j=p.length-1;i<p.length;j=i++){ const [xi,yi]=p[i],[xj,yj]=p[j]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c; } return c; };
  /* 조각 좌표(종이 기준) ↔ 화면 좌표 */
  const toLocal=(pc,x,y)=>{ const [cx,cy]=centroid(pc.poly), s=Math.sin(-pc.rot), c=Math.cos(-pc.rot), dx=x-pc.ox-cx, dy=y-pc.oy-cy; return [cx+dx*c-dy*s,cy+dx*s+dy*c]; };
  /* 직선으로 볼록 다각형을 둘로: 자른 면에는 들쭉날쭉한 찢긴 결을 넣는다 */
  function split(poly,ax,ay,bx,by){
    const side=q=>(bx-ax)*(q[1]-ay)-(by-ay)*(q[0]-ax);
    const A=[],B=[],cut=[];
    for(let i=0;i<poly.length;i++){ const p=poly[i], q=poly[(i+1)%poly.length], sp=side(p), sq=side(q);
      if(sp>=0) A.push(p); if(sp<=0) B.push(p);
      if((sp>0&&sq<0)||(sp<0&&sq>0)){ const t=sp/(sp-sq), m=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]; A.push(m); B.push(m); cut.push(m); } }
    if(A.length<3||B.length<3||cut.length<2) return null;
    /* 찢긴 결: 두 교점 사이에 잔 톱니를 넣어 양쪽에 똑같이 붙인다 */
    const [m1,m2]=cut, L=Math.hypot(m2[0]-m1[0],m2[1]-m1[1]), n=Math.max(2,Math.floor(L/9)), nx=-(m2[1]-m1[1])/L, ny=(m2[0]-m1[0])/L, jag=[];
    for(let k=1;k<n;k++){ const t=k/n, j=(Math.random()-.5)*4.5; jag.push([m1[0]+(m2[0]-m1[0])*t+nx*j,m1[1]+(m2[1]-m1[1])*t+ny*j]); }
    const ins=(P,from,to,pts)=>{ const i1=P.indexOf(from), i2=P.indexOf(to); if(i1<0||i2<0) return P;
      const out=[]; for(let i=0;i<P.length;i++){ out.push(P[i]); if(i===i1&&P[(i+1)%P.length]===to) pts.forEach(q=>out.push(q)); else if(i===i2&&P[(i+1)%P.length]===from) pts.slice().reverse().forEach(q=>out.push(q)); } return out; };
    return [ins(A,m1,m2,jag),ins(B,m1,m2,jag)];
  }
  function tearPiece(pc,a,b,speed){
    const la=toLocal(pc,a[0],a[1]), lb=toLocal(pc,b[0],b[1]);
    const r=split(pc.poly,la[0],la[1],lb[0],lb[1]); if(!r) return false;
    const i=pieces.indexOf(pc); pieces.splice(i,1);
    const dx=lb[0]-la[0], dy=lb[1]-la[1], L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L, kick=.6+Math.min(2.5,speed/900);
    r.forEach((poly,k)=>{ const sgn=k?-1:1; const np={poly,ox:pc.ox,oy:pc.oy,rot:pc.rot,vx:nx*sgn*kick*60,vy:ny*sgn*kick*60,vr:sgn*(Math.random()*.6)*kick,fall:false,life:0};
      const ar=area(poly); if(ar<A0*.014||Math.max(...poly.map(q=>q[0]))-Math.min(...poly.map(q=>q[0]))<26&&Math.max(...poly.map(q=>q[1]))-Math.min(...poly.map(q=>q[1]))<26) drop(np,ar);
      pieces.push(np); });
    Sound.rip&&Sound.rip(Math.min(1,speed/1500)); pulse=Math.min(1,.35+speed/2000); figPull=1;
    try{ navigator.vibrate&&navigator.vibrate(8); }catch(e){}
    return true;
  }
  /* 아주 작아진 조각은 팔랑팔랑 날아가 눈이 된다 */
  function drop(pc,ar){ if(pc.fall) return; pc.fall=true; pc.vy=-60-Math.random()*80; pc.vx=(Math.random()-.5)*160; pc.vr=(Math.random()-.5)*6;
    world.tearBits&&world.tearBits(Math.round(4+ar/A0*400),S.me); }
  /* 손가락으로 긋기 */
  let stroke=null, pulse=0, figPull=0, lastMove=0;
  cv2.addEventListener('pointerdown',e=>{ e.preventDefault(); cv2.setPointerCapture(e.pointerId); stroke={pts:[[e.clientX,e.clientY]],t:performance.now(),speed:0}; Sound.tearOn&&Sound.tearOn(); });
  cv2.addEventListener('pointermove',e=>{ if(!stroke) return; const now=performance.now(), p=[e.clientX,e.clientY], q=stroke.pts[stroke.pts.length-1];
    const d=Math.hypot(p[0]-q[0],p[1]-q[1]), dt=Math.max(1,now-(stroke.last||stroke.t)); stroke.last=now;
    const sp=d/dt*1000; stroke.speed=stroke.speed*.6+sp*.4; stroke.pts.push(p); lastMove=now;
    Sound.tearSet&&Sound.tearSet(Math.min(1,stroke.speed/1400));
    /* 그은 선이 조각을 완전히 가로지르면 그 자리에서 쫙 */
    const a=stroke.pts[0];
    if(Math.hypot(p[0]-a[0],p[1]-a[1])>18){
      for(const pc of pieces.slice()){ if(pc.fall) continue; const la=toLocal(pc,a[0],a[1]), lp=toLocal(pc,p[0],p[1]);
        if(!inside(pc.poly,lp[0],lp[1])&&segHits(pc.poly,la,lp)) tearPiece(pc,a,p,stroke.speed); }
      if(!pieces.some(pc=>!pc.fall&&inside(pc.poly,...toLocal(pc,p[0],p[1])))) stroke.pts=[p];   /* 종이 밖으로 나가면 새로 긋기 시작 */
    }
  });
  const end=e=>{ if(!stroke) return; const a=stroke.pts[0], b=stroke.pts[stroke.pts.length-1];
    if(Math.hypot(b[0]-a[0],b[1]-a[1])>40){ const ex=b[0]+(b[0]-a[0])*3, ey=b[1]+(b[1]-a[1])*3, sx=a[0]-(b[0]-a[0])*3, sy=a[1]-(b[1]-a[1])*3;
      for(const pc of pieces.slice()){ if(pc.fall) continue; const la=toLocal(pc,a[0],a[1]), lb=toLocal(pc,b[0],b[1]); if(inside(pc.poly,la[0],la[1])||inside(pc.poly,lb[0],lb[1])) tearPiece(pc,[sx,sy],[ex,ey],stroke.speed); } }
    stroke=null; Sound.tearOff&&Sound.tearOff(); };
  cv2.addEventListener('pointerup',end); cv2.addEventListener('pointercancel',end);
  function segHits(poly,a,b){ for(let i=0;i<poly.length;i++){ const p=poly[i], q=poly[(i+1)%poly.length]; if(segX(a,b,p,q)) return true; } return false; }
  function segX(a,b,c,d){ const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]); return o(a,b,c)*o(a,b,d)<0&&o(c,d,a)*o(c,d,b)<0; }

  function begin(t){ boxOpen=false; box.hidden=true; open_=true; layer.hidden=false; fit(); makeSheet(t); hint.hidden=false; touch(); }
  function close(){ open_=false; layer.hidden=true; stroke=null; Sound.tearOff&&Sound.tearOff(); figure.crumple(S.t,null); }
  function openBox(){ if(open_) return; boxOpen=true; box.hidden=false; touch(); }
  let doneT=0;
  function draw(dt){
    g.setTransform(DPR,0,0,DPR,0,0); g.clearRect(0,0,VW,VH);
    for(const pc of pieces){
      if(pc.fall){ pc.life+=dt; pc.vy+=220*dt; pc.vx*=1-1.5*dt; }
      else{ pc.vx*=1-6*dt; pc.vy*=1-6*dt; pc.vr*=1-6*dt; if(pc.oy<sheet.y0-1&&pc===pieces[0]&&pieces.length===1){ pc.oy+=(sheet.y0-pc.oy)*Math.min(1,dt*7); } }
      pc.ox+=pc.vx*dt; pc.oy+=pc.vy*dt; pc.rot+=pc.vr*dt;
      const [cx,cy]=centroid(pc.poly), op=pc.fall?Math.max(0,1-pc.life/1.4):1; if(op<=0) continue;
      g.save(); g.globalAlpha=op; g.translate(pc.ox+cx,pc.oy+cy); g.rotate(pc.rot); g.translate(-cx,-cy);
      g.beginPath(); pc.poly.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])); g.closePath();
      g.shadowColor='rgba(40,40,60,.25)'; g.shadowBlur=pc.fall?2:10; g.shadowOffsetY=3; g.fillStyle='#fffdf5'; g.fill(); g.shadowColor='transparent';
      g.save(); g.clip(); g.drawImage(sheet.img,0,0,sheet.w,sheet.h); g.restore();
      g.strokeStyle='rgba(200,195,180,.9)'; g.lineWidth=1; g.stroke();
      g.restore();
    }
    pieces=pieces.filter(pc=>!(pc.fall&&pc.life>1.4));
    /* 긋는 중인 선: 찢어지기 시작한 금 */
    if(stroke&&stroke.pts.length>1){ g.strokeStyle='rgba(120,110,95,.55)'; g.lineWidth=1.5; g.beginPath(); stroke.pts.forEach((q,i)=>i?g.lineTo(q[0]+(Math.random()-.5)*1.5,q[1]+(Math.random()-.5)*1.5):g.moveTo(q[0],q[1])); g.stroke(); }
    /* 다 찢었으면 새 종이 */
    const left=pieces.filter(pc=>!pc.fall).reduce((s,pc)=>s+area(pc.poly),0);
    if(left<A0*.1&&!doneT){ doneT=S.t; pieces.filter(pc=>!pc.fall).forEach(pc=>drop(pc,area(pc.poly)));
      today++; try{ localStorage.setItem(dayKey(),String(today)); }catch(e){} showCount(); Sound.whoosh&&Sound.whoosh(); }
    if(doneT&&S.t-doneT>1.2){ doneT=0; makeSheet(text); }
  }
  function tick(dt){
    if(open_){ draw(dt); pulse=Math.max(0,pulse-dt*3); figPull=Math.max(0,figPull-dt*4); if(stroke&&performance.now()-lastMove>120) Sound.tearSet&&Sound.tearSet(0); }
    if(!open_&&!boxOpen) box.hidden=true;
  }
  /* 캐릭터도 종이를 양손으로 잡고 찢는 시늉 */
  function pose(fig){ if(!open_) return; const k=Math.min(1,(stroke?Math.min(1,stroke.speed/900):0)+figPull*.8); fig.crumple(S.t,{mode:'tear',k}); }
  function shake(){ return open_?pulse*.035:0; }
  return {tick,pose,shake,open:openBox,begin,close,busy:()=>open_||boxOpen,isOpen:()=>open_};
})();
