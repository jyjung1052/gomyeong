import {sanitize,allow} from './validate.js';
const MAX_ALL=60, MAX_PER_IP=4, MAX_BYTES=400, STALE_MS=15000;

export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(url.pathname!=='/ws') return new Response('gomyeong relay',{status:200});
    if(req.headers.get('Upgrade')!=='websocket') return new Response('expected websocket',{status:426});
    const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
    const origin=req.headers.get('Origin')||'';
    if(allowed.length&&!allowed.includes(origin)) return new Response('forbidden origin',{status:403});
    const stub=env.ROOM.get(env.ROOM.idFromName('main'));
    return stub.fetch(req);
  }
};

export class Room{
  constructor(state,env){ this.sessions=new Map(); }
  fetch(req){
    const ip=req.headers.get('CF-Connecting-IP')||'?';
    let perIp=0; this.sessions.forEach(s=>{ if(s.ip===ip) perIp++; });
    if(this.sessions.size>=MAX_ALL||perIp>=MAX_PER_IP) return new Response('busy',{status:503});
    const pair=new WebSocketPair(), client=pair[0], server=pair[1];
    server.accept();
    const id=crypto.randomUUID().slice(0,8);
    const s={id,ip,ws:server,d:null,seen:Date.now(),bucket:{}};
    this.sessions.set(id,s);
    const list=[]; this.sessions.forEach(o=>{ if(o!==s&&o.d) list.push({id:o.id,d:o.d}); });
    server.send(JSON.stringify({t:'hi',id,list}));
    server.addEventListener('message',ev=>{
      const raw=typeof ev.data==='string'?ev.data:'';
      if(raw.length>MAX_BYTES){ return; }
      if(!allow(s.bucket,Date.now())) return;
      let m; try{ m=JSON.parse(raw); }catch(e){ return; }
      if(!m||m.t!=='p') return;
      const d=sanitize(m.d); if(!d) return;
      s.d=d; s.seen=Date.now();
      this.broadcast({t:'p',id,d},id);
    });
    const end=()=>{ if(this.sessions.delete(id)) this.broadcast({t:'bye',id},id); };
    server.addEventListener('close',end); server.addEventListener('error',end);
    return new Response(null,{status:101,webSocket:client});
  }
  broadcast(msg,except){
    const txt=JSON.stringify(msg), now=Date.now();
    this.sessions.forEach((o,k)=>{
      if(now-o.seen>STALE_MS&&o.d){ try{o.ws.close(1000,'stale');}catch(e){} this.sessions.delete(k); return; }
      if(k!==except){ try{o.ws.send(txt);}catch(e){ this.sessions.delete(k); } }
    });
  }
}
