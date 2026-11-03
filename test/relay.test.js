/* 중계 서버 검사 로직(worker/src/validate.js)과 클라이언트(src/e3_ws.js)를 메모리 안에서 시험 */
const fs=require('fs'), assert=require('assert');
(async()=>{
  const {sanitize,allow}=await import('../worker/src/validate.js');
  /* 1) 서버 쪽 검사 */
  assert.strictEqual(sanitize(null),null); assert.strictEqual(sanitize({s:'evil',x:0,z:0,h:0}),null);
  assert.strictEqual(sanitize({s:'sea',x:'1',z:0,h:0}),null); assert.strictEqual(sanitize({s:'sea',x:NaN,z:0,h:0}),null);
  const ok=sanitize({n:'<b>가나다라마바사아자차카타파하</b>\u0007',s:'sea',x:9999,z:-5,h:1,i:7,l:0,evil:1});
  assert.deepStrictEqual(ok,{n:'b가나다라마바사아자차카',s:'sea',x:200,z:-5,h:1,i:1,l:0});
  const bk={}; let pass=0; for(let i=0;i<40;i++) if(allow(bk,1000)) pass++; assert.strictEqual(pass,16);
  assert(allow(bk,2000));   /* 시간이 지나면 다시 허용 */
  /* 2) 클라이언트: 가짜 서버 */
  const socks=new Set(); let nid=0;
  class FakeWS{
    constructor(){ this.readyState=0; this.id='c'+(++nid); this.d=null;
      setTimeout(()=>{ this.readyState=1; socks.add(this); this.onopen&&this.onopen();
        const list=[]; socks.forEach(o=>{ if(o!==this&&o.d) list.push({id:o.id,d:o.d}); });
        this.recv({t:'hi',id:this.id,list}); },1); }
    recv(m){ setTimeout(()=>this.onmessage&&this.onmessage({data:JSON.stringify(m)}),1); }
    send(raw){ const m=JSON.parse(raw); if(m.t!=='p') return; const d=sanitize(m.d); if(!d) return; this.d=d; socks.forEach(o=>{ if(o!==this) o.recv({t:'p',id:this.id,d}); }); }
    close(){ this.readyState=3; socks.delete(this); socks.forEach(o=>o.recv({t:'bye',id:this.id})); this.onclose&&this.onclose(); }
  }
  global.window={addEventListener(){}}; global.WebSocket=FakeWS;
  const load=url=>new Function('window',fs.readFileSync(__dirname+'/../src/e3_ws.js','utf8').replace('__RELAY_URL__',url)+';return WsRoom;')(global.window);
  await assert.rejects(()=>load('').open(),/서버 미설정/);
  const W=load('wss://example.invalid/ws');
  const a=await W.open(), b=await W.open(), c=await W.open();
  a.presence({n:'가',s:'sea',x:1,z:2,h:0,i:0,l:0}); b.presence({n:'나',s:'sea',x:3,z:4,h:1,i:1,l:0}); c.presence({n:'다',s:'forest',x:5,z:6,h:2,i:0,l:1});
  await new Promise(r=>setTimeout(r,50));
  const names=r=>r.peers().map(p=>p.presence.n).sort().join(',');
  assert.strictEqual(names(a),'나,다'); assert.strictEqual(names(b),'가,다'); assert.strictEqual(names(c),'가,나');
  b.close(); await new Promise(r=>setTimeout(r,20)); assert.strictEqual(names(a),'다');
  console.log('RELAY_OK a sees',names(a));
  process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
