/* PeerRoom 논리 시험: 메모리 안의 가짜 Peer 로 두 사람이 서로 보이는지 확인 */
const fs=require('fs'), assert=require('assert');
const reg=new Map();
class FakeConn{ constructor(peer,remote){ this.peer=remote; this.open=false; this.h={}; this.owner=peer; }
  on(e,f){ this.h[e]=f; } send(d){ const o=this.other; setTimeout(()=>o.h.data&&o.h.data(JSON.parse(JSON.stringify(d))),1); }
  fire(e,a){ this.h[e]&&this.h[e](a); } }
class FakePeer{
  constructor(id){ this.id=id; this.h={}; this.open=false; this.disconnected=false;
    setTimeout(()=>{ if(reg.has(id)) this.fire('error',{type:'unavailable-id'}); else { reg.set(id,this); this.open=true; this.fire('open'); } },1); }
  on(e,f){ this.h[e]=f; } fire(e,a){ this.h[e]&&this.h[e](a); }
  connect(id){ const c=new FakeConn(this,id), t=reg.get(id);
    setTimeout(()=>{ if(!t){ this.fire('error',{type:'peer-unavailable'}); return; }
      const r=new FakeConn(t,this.id); c.other=r; r.other=c; t.fire('connection',r); c.open=r.open=true; c.fire('open'); r.fire('open'); },1); return c; }
  destroy(){ if(reg.get(this.id)===this) reg.delete(this.id); } reconnect(){}
}
global.window={Peer:FakePeer,addEventListener(){}}; global.document={};
const src=fs.readFileSync(__dirname+'/../src/e3_peer.js','utf8');
const PeerRoom=new Function('window','document',src+';return PeerRoom;')(global.window,global.document);
(async()=>{
  const a=await PeerRoom.open(), b=await PeerRoom.open(), c=await PeerRoom.open();
  const seen=[]; a.onPeers(ch=>seen.push(ch.peers.length));
  a.presence({n:'가',s:'sea',x:1,z:2,h:0,i:0,l:0});
  b.presence({n:'나',s:'sea',x:3,z:4,h:1,i:1,l:0});
  c.presence({n:'다',s:'forest',x:5,z:6,h:2,i:0,l:1,evil:'x'});
  await new Promise(r=>setTimeout(r,4500));
  const names=r=>r.peers().map(p=>p.presence.n).sort().join(',');
  assert.strictEqual(names(a),'나,다'); assert.strictEqual(names(b),'가,다'); assert.strictEqual(names(c),'가,나');
  assert(!('evil' in a.peers().find(p=>p.presence.n==='다').presence));
  b.close(); await new Promise(r=>setTimeout(r,50));
  console.log('PEERROOM_OK a sees',names(a));
  process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
