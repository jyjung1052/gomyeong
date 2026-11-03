/* ---- 서버 없이 서로 보이기: 공개 MQTT 중계(WebSocket)로 위치만 주고받는다 ----
   claude.ai 안이 아닐 때(GitHub Pages 등) 쓰는 대체 방. Together 가 쓰는 room 인터페이스와 같다:
   connected(), peers(), onPeers(cb,onClose), presence(p)
   - 모두 같은 주제(topic)에 자기 위치를 올리고, 다른 사람의 것을 받아 본다. 저장되지 않는다.
   - 중계가 안 되면 다음 중계로 넘어간다. */
const MqttRoom=(()=>{
  const BROKERS=['wss://broker.hivemq.com:8884/mqtt','wss://broker.emqx.io:8084/mqtt','wss://test.mosquitto.org:8081/mqtt'];
  const TOP='gomyeong3d/v1/p/', LIB='https://cdn.jsdelivr.net/npm/mqtt@4.3.7/dist/mqtt.min.js';
  const FIELDS={n:'string',s:'string',x:'number',z:'number',h:'number',i:'number',l:'number'};
  function loadLib(){
    return new Promise((res,rej)=>{
      if(window.mqtt) return res();
      const sc=document.createElement('script'); sc.src=LIB; sc.async=true;
      const to=setTimeout(()=>rej(new Error('load-timeout')),9000);
      sc.onload=()=>{ clearTimeout(to); window.mqtt?res():rej(new Error('nolib')); };
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
  function tryBroker(url,id,lastWill){
    return new Promise((res,rej)=>{
      let c; try{ c=window.mqtt.connect(url,{clientId:id,clean:true,connectTimeout:6000,reconnectPeriod:3000,keepalive:20,will:{topic:TOP+id,payload:lastWill,qos:0,retain:false}}); }catch(e){ return rej(e); }
      let done=false;
      const to=setTimeout(()=>{ if(done) return; done=true; try{c.end(true);}catch(e){} rej(new Error('timeout')); },7000);
      c.once('connect',()=>{ if(done) return; done=true; clearTimeout(to); res(c); });
      c.once('error',e=>{ if(done) return; done=true; clearTimeout(to); try{c.end(true);}catch(x){} rej(e); });
    });
  }
  async function open(){
    await loadLib();
    const id='g'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
    const bye=JSON.stringify({bye:1});
    let c=null, host='', lastErr=null;
    for(const url of BROKERS){ try{ c=await tryBroker(url,id,bye); host=url.split('//')[1].split(':')[0].replace('broker.',''); break; }catch(e){ lastErr=e; } }
    if(!c) throw new Error('중계 접속 불가'+(lastErr&&lastErr.message?' ('+lastErr.message+')':''));
    const remote=new Map(), cbs=[]; let mine=null, closed=false;
    const list=()=>{ const now=Date.now(), out=[]; remote.forEach((v,k)=>{ if(now-v.seen<8000) out.push({peer:k,presence:v.presence,sameTab:false}); }); return out; };
    const emit=()=>cbs.forEach(f=>{ try{f({peers:list()});}catch(e){} });
    const pub=()=>{ if(mine&&c.connected){ try{ c.publish(TOP+id,JSON.stringify(mine),{qos:0}); }catch(e){} } };
    const sub=()=>{ try{ c.subscribe(TOP+'+',{qos:0}); }catch(e){} };
    sub();
    c.on('connect',()=>{ sub(); pub(); });            /* 재연결되면 다시 구독 */
    c.on('error',()=>{});
    c.on('message',(topic,payload)=>{
      const k=String(topic).slice(TOP.length); if(!k||k===id) return;
      let d; try{ d=JSON.parse(String(payload)); }catch(e){ return; }
      if(d&&d.bye){ if(remote.delete(k)) emit(); return; }
      const pr=clean(d); if(!pr) return;
      remote.set(k,{presence:pr,seen:Date.now()}); emit();
    });
    const t=setInterval(()=>{ pub(); emit(); },2000);
    const close=()=>{ if(closed) return; closed=true; clearInterval(t); try{ c.publish(TOP+id,bye); c.end(); }catch(e){} };
    try{ window.addEventListener('pagehide',e=>{ if(!e.persisted) close(); }); }catch(e){}
    return {
      connected:()=>!closed&&!!c.connected,
      peers:list,
      onPeers(cb){ cbs.push(cb); },
      presence(d){ mine=d; pub(); return Promise.resolve(); },
      close,
      debug:()=>host+(c.connected?'':' 끊김')+' 감지'+list().length
    };
  }
  return {open};
})();
