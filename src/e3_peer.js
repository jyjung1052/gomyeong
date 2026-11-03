/* ---- 서버 없이 서로 보이기: WebRTC(PeerJS 공개 중계)로 열어 둔 사람끼리 직접 연결한다 ----
   claude.ai 안이 아닐 때(GitHub Pages 등) 쓰는 대체 방. Together 가 쓰는 room 인터페이스와 같다:
   connected(), peers(), onPeers(cb,onClose), presence(p)
   - 빈 자리(0..N-1)를 하나 차지하고, 번호가 더 큰 자리의 사람들에게 내가 먼저 연결한다.
   - 위치 정보만 주고받고, 아무것도 저장하지 않는다. */
const PeerRoom=(()=>{
  const PREFIX='gomyeong3d-v1-room-', N=24, LIB='https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const FIELDS={n:'string',s:'string',x:'number',z:'number',h:'number',i:'number',l:'number'};
  function loadLib(){
    return new Promise((res,rej)=>{
      if(window.Peer) return res();
      const sc=document.createElement('script'); sc.src=LIB; sc.async=true;
      const to=setTimeout(()=>rej(new Error('timeout')),9000);
      sc.onload=()=>{ clearTimeout(to); window.Peer?res():rej(new Error('nopeer')); };
      sc.onerror=()=>{ clearTimeout(to); rej(new Error('load')); };
      document.head.appendChild(sc);
    });
  }
  function clean(d){
    if(!d||typeof d!=='object') return null;
    const o={};
    for(const k in FIELDS){ if(typeof d[k]===FIELDS[k]&&(FIELDS[k]!=='number'||isFinite(d[k]))) o[k]=k==='n'?d[k].slice(0,12):d[k]; }
    return o.s?o:null;
  }
  function claim(){
    /* 빈 자리를 찾아 Peer 를 연다. 이미 쓰는 자리면 다음 자리로 */
    return new Promise((res,rej)=>{
      let k=0;
      const next=()=>{
        if(k>=N) return rej(new Error('full'));
        const idx=k++; let p;
        try{ p=new window.Peer(PREFIX+idx); }catch(e){ return rej(e); }
        let done=false;
        const to=setTimeout(()=>{ if(done) return; done=true; try{p.destroy();}catch(e){} rej(new Error('timeout')); },10000);
        p.on('open',()=>{ if(done) return; done=true; clearTimeout(to); res({p,idx}); });
        p.on('error',err=>{
          if(done) return; done=true; clearTimeout(to);
          try{p.destroy();}catch(e){}
          if(err&&err.type==='unavailable-id') next(); else rej(err);
        });
      };
      next();
    });
  }
  async function open(){
    await loadLib();
    const {p,idx}=await claim();
    const remote=new Map();           /* peerId -> {presence, seen} */
    const conns=new Set(), pending=new Set(), cbs=[];
    let mine=null, closed=false;
    const emit=()=>cbs.forEach(f=>{ try{f({peers:list()});}catch(e){} });
    const list=()=>{
      const now=Date.now(), out=[];
      remote.forEach((v,id)=>{ if(now-v.seen<8000) out.push({peer:id,presence:v.presence,sameTab:false}); });
      return out;
    };
    const send=c=>{ if(mine&&c.open){ try{c.send(mine);}catch(e){} } };
    function setup(c){
      c._t=Date.now(); conns.add(c);
      c.on('open',()=>{ pending.delete(c.peer); send(c); });
      c.on('data',d=>{ const pr=clean(d); if(!pr) return; remote.set(c.peer,{presence:pr,seen:Date.now()}); emit(); });
      const gone=()=>{ conns.delete(c); pending.delete(c.peer); let still=false; conns.forEach(o=>{ if(o.peer===c.peer&&o.open) still=true; }); if(!still&&remote.delete(c.peer)) emit(); };
      c.on('close',gone); c.on('error',gone);
    }
    p.on('connection',setup);
    p.on('error',()=>{});                         /* peer-unavailable 등은 무시하고 다음 훑기에서 다시 */
    p.on('disconnected',()=>{ if(!closed){ try{p.reconnect();}catch(e){} } });
    function scan(){
      if(closed||!p.open) return;
      const now=Date.now(), have=new Set();
      conns.forEach(c=>{
        if(c.open) have.add(c.peer);
        else if(c._t&&now-c._t>3500){ conns.delete(c); try{c.close&&c.close();}catch(e){} }   /* 열리지 못한 시도는 정리 */
      });
      for(let k=idx+1;k<N;k++){
        const id=PREFIX+k; if(have.has(id)||pending.has(id)) continue;
        pending.add(id);
        try{ setup(p.connect(id,{serialization:'json'})); }catch(e){ pending.delete(id); }
        setTimeout(()=>pending.delete(id),3500);
      }
    }
    const t1=setInterval(scan,4000), t2=setInterval(()=>{ conns.forEach(send); emit(); },2000);
    scan();
    const close=()=>{ closed=true; clearInterval(t1); clearInterval(t2); try{p.destroy();}catch(e){} };
    try{ window.addEventListener('pagehide',close); }catch(e){}
    return {
      connected:()=>!closed&&p.open&&!p.disconnected,
      peers:list,
      onPeers(cb,onClose){ cbs.push(cb); },
      presence(d){ mine=d; conns.forEach(send); return Promise.resolve(); },
      close
    };
  }
  return {open};
})();
