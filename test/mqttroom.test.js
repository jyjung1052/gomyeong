/* MqttRoom 논리 시험: 메모리 안의 가짜 mqtt 중계로 세 사람이 서로 보이는지 확인 */
const fs=require('fs'), assert=require('assert');
const clients=new Set();
class Fake{
  constructor(url,o){ this.url=url; this.o=o; this.connected=false; this.h={}; this.subs=new Set(); this.dead=url.includes('hivemq');
    setTimeout(()=>{ if(this.dead){ this.emit('error',new Error('down')); return; } this.connected=true; clients.add(this); this.emit('connect'); },1); }
  on(e,f){ (this.h[e]=this.h[e]||[]).push(f); return this; } once(e,f){ const w=(...a)=>{ this.h[e]=this.h[e].filter(x=>x!==w); f(...a); }; return this.on(e,w); }
  emit(e,...a){ (this.h[e]||[]).slice().forEach(f=>f(...a)); }
  subscribe(t){ this.subs.add(t); }
  publish(t,p){ clients.forEach(c=>{ if(c!==this&&c.subs.has('gomyeong3d/v1/p/+')&&t.startsWith('gomyeong3d/v1/p/')) setTimeout(()=>c.emit('message',t,Buffer.from(p)),1); }); }
  end(){ this.connected=false; clients.delete(this); }
}
global.window={mqtt:{connect:(u,o)=>new Fake(u,o)},addEventListener(){}}; global.document={};
const src=fs.readFileSync(__dirname+'/../src/e3_mqtt.js','utf8');
const MqttRoom=new Function('window','document',src+';return MqttRoom;')(global.window,global.document);
(async()=>{
  const a=await MqttRoom.open(), b=await MqttRoom.open(), c=await MqttRoom.open();
  assert(a.debug().startsWith('emqx.io'),a.debug());   /* 첫 중계가 죽어 있으면 다음으로 넘어간다 */
  a.presence({n:'가',s:'sea',x:1,z:2,h:0,i:0,l:0});
  b.presence({n:'나',s:'sea',x:3,z:4,h:1,i:1,l:0});
  c.presence({n:'다',s:'forest',x:5,z:6,h:2,i:0,l:1,evil:'x'});
  await new Promise(r=>setTimeout(r,100));
  const names=r=>r.peers().map(p=>p.presence.n).sort().join(',');
  assert.strictEqual(names(a),'나,다'); assert.strictEqual(names(b),'가,다'); assert.strictEqual(names(c),'가,나');
  assert(!('evil' in a.peers().find(p=>p.presence.n==='다').presence));
  /* 나가면 사라진다 */
  const before=a.peers().length; b.close(); await new Promise(r=>setTimeout(r,50)); assert.strictEqual(a.peers().length,before-1);
  console.log('MQTTROOM_OK a sees',names(a));
  process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
