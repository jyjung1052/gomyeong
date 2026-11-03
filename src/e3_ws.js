/* ---- 서로 보이기: 내가 운영하는 중계 서버(Cloudflare Workers)에 WebSocket 으로 위치만 올리고 받는다 ----
   Together 가 쓰는 room 인터페이스와 같다: connected(), peers(), onPeers(cb), presence(p)
   서버 주소는 빌드할 때 RELAY_URL 로 들어간다. 비어 있으면 혼자 명상하는 모드. */
const WsRoom=(()=>{
  const URL_='__RELAY_URL__';
  const FIELDS={n:'string',s:'string',x:'number',z:'number',h:'number',i:'number',l:'number'};
  function clean(d){
    if(!d||typeof d!=='object') return null;
    const o={};
    for(const k in FIELDS){ if(typeof d[k]===FIELDS[k]&&(FIELDS[k]!=='number'||isFinite(d[k]))) o[k]=k==='n'?d[k].slice(0,12):d[k]; }
    return o.s?o:null;
  }
  function open(){
    return new Promise((resolve,reject)=>{
      if(!URL_||URL_.indexOf('__')===0) return reject(new Error('서버 미설정'));
      const remote=new Map(), cbs=[]; let ws=null, mine=null, closed=false, tries=0, first=true, timer=null;
      const list=()=>{ const now=Date.now(), out=[]; remote.forEach((v,k)=>{ if(now-v.seen<9000) out.push({peer:k,presence:v.presence,sameTab:false}); }); return out; };
      const emit=()=>cbs.forEach(f=>{ try{f({peers:list()});}catch(e){} });
      const pub=()=>{ if(mine&&ws&&ws.readyState===1){ try{ ws.send(JSON.stringify({t:'p',d:mine})); }catch(e){} } };
      function connect(){
        if(closed) return;
        let w; try{ w=new WebSocket(URL_); }catch(e){ if(first){ first=false; reject(e); } return; }
        ws=w;
        const to=setTimeout(()=>{ try{w.close();}catch(e){} },8000);
        w.onopen=()=>{ clearTimeout(to); tries=0; };
        w.onmessage=ev=>{
          let m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
          if(!m||typeof m!=='object') return;
          if(m.t==='hi'){
            remote.clear(); (Array.isArray(m.list)?m.list:[]).forEach(o=>{ const pr=clean(o&&o.d); if(pr&&typeof o.id==='string') remote.set(o.id,{presence:pr,seen:Date.now()}); });
            if(first){ first=false; resolve(room); } pub(); emit();
          }else if(m.t==='p'&&typeof m.id==='string'){ const pr=clean(m.d); if(pr){ remote.set(m.id,{presence:pr,seen:Date.now()}); emit(); } }
          else if(m.t==='bye'&&typeof m.id==='string'){ if(remote.delete(m.id)) emit(); }
        };
        w.onclose=()=>{
          clearTimeout(to); remote.clear(); emit();
          if(first){ first=false; reject(new Error('서버 접속 불가')); }
          if(!closed){ tries++; setTimeout(connect,Math.min(15000,1000*Math.pow(2,Math.min(tries,4)))); }
        };
        w.onerror=()=>{};
      }
      const t=setInterval(()=>{ pub(); emit(); },2000);
      const room={
        connected:()=>!closed&&!!ws&&ws.readyState===1,
        peers:list,
        onPeers(cb){ cbs.push(cb); },
        presence(d){ mine=d; pub(); return Promise.resolve(); },
        close(){ closed=true; clearInterval(t); try{ws&&ws.close();}catch(e){} },
        debug:()=>(ws&&ws.readyState===1?'서버 연결됨':'서버 끊김')+' 감지'+list().length
      };
      try{ window.addEventListener('pagehide',e=>{ if(!e.persisted) room.close(); }); }catch(e){}
      connect();
    });
  }
  return {open};
})();
