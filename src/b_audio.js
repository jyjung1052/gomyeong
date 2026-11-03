/* 소리: 파일 없이 Web Audio로 직접 합성한다. 장면마다 하나의 bus를 만들고, 나갈 때 서서히 끈다. */
const Sound=(()=>{
  let ctx=null, master=null, noiseW=null, noiseB=null, impulse=null, cur=null;
  let vol=.7, muted=false, seated=false;
  const rnd=(a,b)=>a+Math.random()*(b-a);

  function applyMaster(){
    if(!ctx) return;
    master.gain.setTargetAtTime(muted?0:vol*.9, ctx.currentTime, .08);
  }
  function loopable(d){
    const n=d.length, k=2400;
    for(let i=0;i<k;i++){ const m=i/k; d[n-k+i]=d[n-k+i]*(1-m)+d[i]*m; }
  }
  function init(){
    if(ctx){ if(ctx.state==='suspended') ctx.resume(); return; }
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    try{
      ctx=new AC();
      master=ctx.createGain(); master.gain.value=0; master.connect(ctx.destination);
      const n=ctx.sampleRate*4;
      noiseW=ctx.createBuffer(1,n,ctx.sampleRate);
      noiseB=ctx.createBuffer(1,n,ctx.sampleRate);
      const w=noiseW.getChannelData(0), b=noiseB.getChannelData(0);
      let last=0;
      for(let i=0;i<n;i++){
        const x=Math.random()*2-1;
        w[i]=x*.6;
        last=(last+.02*x)/1.02;
        b[i]=Math.max(-1,Math.min(1,last*5.5));
      }
      loopable(w); loopable(b);
      const L=Math.floor(ctx.sampleRate*3.2);
      impulse=ctx.createBuffer(2,L,ctx.sampleRate);
      for(let c=0;c<2;c++){
        const d=impulse.getChannelData(c);
        for(let i=0;i<L;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/L,3.2);
      }
      ctx.resume();
      applyMaster();
    }catch(e){ ctx=null; }
  }

  const mk={
    src(sc,buf){ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; s.start(0,rnd(0,3)); sc.srcs.push(s); return s; },
    osc(sc,type,f){ const o=ctx.createOscillator(); o.type=type; o.frequency.value=f; o.start(); sc.srcs.push(o); return o; },
    gain(v){ const g=ctx.createGain(); g.gain.value=v; return g; },
    filt(type,f,q){ const b=ctx.createBiquadFilter(); b.type=type; b.frequency.value=f; if(q!=null) b.Q.value=q; return b; },
    lfo(sc,f,depth,param){ const o=mk.osc(sc,'sine',f); const g=mk.gain(depth); o.connect(g); g.connect(param); return o; },
    every(sc,a,b,fn){
      const go=()=>{
        if(sc.dead) return;
        sc.timers.push(setTimeout(()=>{ if(sc.dead) return; fn(); go(); }, rnd(a,b)*1000));
      };
      go();
    },
    /* 소리를 내는 노이즈 한 줄: 노이즈 → 필터 → 게인 → bus */
    bed(sc,buf,filters,g){
      let n=mk.src(sc,buf); const out=mk.gain(g);
      filters.forEach(f=>{ n.connect(f); n=f; });
      n.connect(out); out.connect(sc.bus);
      return out;
    }
  };

  /* 녹음한 소리 파일: 한 번 받아 두고, 장면에 들어갈 때마다 이음매 없이 반복한다 */
  const bufCache={};
  function loadBuf(url){
    if(!bufCache[url]) bufCache[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab=>new Promise((ok,no)=>ctx.decodeAudioData(ab,ok,no)));
    bufCache[url].catch(()=>{ delete bufCache[url]; });
    return bufCache[url];
  }
  function sampleLoop(sc,url,g,onReady){
    if(typeof fetch!=='function') return;
    loadBuf(url).then(buf=>{
      if(sc.dead) return;
      const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true;
      s.loopStart=.06; s.loopEnd=buf.duration-.06;           /* AAC 앞뒤 무음 패딩을 건너뛴다 */
      const out=ctx.createGain(), t=ctx.currentTime; out.gain.setValueAtTime(0,t); out.gain.linearRampToValueAtTime(g,t+2.5);
      const lim=ctx.createDynamicsCompressor(); lim.threshold.value=-4; lim.knee.value=2; lim.ratio.value=12; lim.attack.value=.004; lim.release.value=.2;   /* 키운 소리가 찢어지지 않게 */
      s.connect(out); out.connect(lim); lim.connect(sc.bus); s.start(0,.06+Math.random()*(buf.duration-1)); sc.srcs.push(s);
      if(onReady) onReady();
    }).catch(()=>{});
  }
  function tone(sc,f0,f1,dur,peak,type,wetAmt,pan){
    if(!ctx||sc.dead) return;
    const t=ctx.currentTime;
    const o=ctx.createOscillator(); o.type=type||'sine';
    o.frequency.setValueAtTime(f0,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
    const g=ctx.createGain();
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(peak,t+Math.min(.02,dur*.3));
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);
    let out=g;
    if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=pan||0; g.connect(p); out=p; }
    out.connect(sc.bus);
    const w=ctx.createGain(); w.gain.value=wetAmt==null?.3:wetAmt;
    out.connect(w); w.connect(sc.wet);
    o.start(t); o.stop(t+dur+.1);
  }

  /* 갈매기 울음: "끼-룩 끼-룩". 톱니파가 올랐다 내려오고, 목청 같은 필터를 지난다 */
  function gullCry(sc,near){
    if(!ctx||sc.dead) return;
    const pan=rnd(-.8,.8), n=2+Math.floor(Math.random()*3), base=rnd(1350,1750), lvl=(near?.085:.045)*rnd(.8,1.1);
    let at=0;
    for(let k=0;k<n;k++){
      const t=ctx.currentTime+at, f0=base*rnd(.95,1.06), len=rnd(.2,.3);
      const o=ctx.createOscillator(); o.type='sawtooth';
      o.frequency.setValueAtTime(f0*.82,t);
      o.frequency.exponentialRampToValueAtTime(f0*1.32,t+len*.28);      /* 끼 */
      o.frequency.exponentialRampToValueAtTime(f0*.7,t+len);            /* 룩 */
      const vib=ctx.createOscillator(); vib.frequency.value=rnd(30,46); const vg=ctx.createGain(); vg.gain.value=26; vib.connect(vg); vg.connect(o.frequency);
      const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=rnd(2100,2700); bp.Q.value=1.4;
      const g=ctx.createGain();
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(lvl,t+.035); g.gain.setTargetAtTime(lvl*.45,t+len*.3,.05); g.gain.exponentialRampToValueAtTime(.0001,t+len);
      o.connect(bp); bp.connect(g);
      let out=g; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=pan; g.connect(p); out=p; }
      out.connect(sc.bus);
      const w=ctx.createGain(); w.gain.value=near?.35:.7; out.connect(w); w.connect(sc.wet);
      o.start(t); vib.start(t); o.stop(t+len+.05); vib.stop(t+len+.05);
      at+=len+rnd(.1,.2)+(k===0?.06:0);
    }
  }

  function bird(sc){
    const f=rnd(2300,4200), n=Math.floor(rnd(2,5)), pan=rnd(-.8,.8);
    for(let i=0;i<n;i++){
      setTimeout(()=>tone(sc,f*rnd(.9,1.15),f*rnd(.7,1.3),rnd(.07,.13),rnd(.025,.06),'sine',.35,pan), i*rnd(110,170));
    }
  }
  function bell(sc){
    const base=Math.random()<.5?196:233;
    [[1,.05,9],[2.76,.025,6],[5.4,.012,4],[8.93,.006,2.5]].forEach(([m,p,d])=>tone(sc,base*m,base*m*.998,d,p,'sine',.8,0));
  }

  /* 연잎에 빗방울이 떨어지는 소리: 잎 몸통이 울리는 낮은 '톡'과 물방울이 튀는 높은 '타닥' */
  function leafTap(sc,loud){
    if(!ctx||sc.dead) return;
    const t=ctx.currentTime, pan=rnd(-.9,.9), pk=rnd(.006,.02)*(loud?1.8:1);
    const s=ctx.createBufferSource(); s.buffer=noiseW;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=rnd(1800,4200); bp.Q.value=rnd(1.2,3);
    const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(pk,t+.004); g.gain.exponentialRampToValueAtTime(.0001,t+rnd(.03,.07));
    s.connect(bp); bp.connect(g);
    const mix=ctx.createGain(); g.connect(mix);
    let out=mix; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=pan; mix.connect(p); out=p; }
    out.connect(sc.bus);
    s.start(t,rnd(0,3)); s.stop(t+.1);
  }
  /* 장대비: 바닥을 치는 '탁', 나뭇잎을 치는 '타닥' (소음만, 음높이 없음) */
  function hit(sc,f0,f1,q,pk,dec){
    if(!ctx||sc.dead) return;
    const t=ctx.currentTime, s=ctx.createBufferSource(); s.buffer=noiseW;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=rnd(f0,f1); bp.Q.value=q;
    const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(pk,t+.002); g.gain.exponentialRampToValueAtTime(.0001,t+dec);
    s.connect(bp); bp.connect(g);
    let out=g; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=rnd(-.95,.95); g.connect(p); out=p; }
    out.connect(sc.bus); s.start(t,rnd(0,3)); s.stop(t+dec+.05);
  }
  /* 연못에 물방울이 떨어지는 소리: 위로 솟는 '똑/퐁' (큰 방울은 낮고 길게) */
  function pondDrop(sc,big){
    const f=big?rnd(380,720):rnd(700,1500);
    tone(sc,f,f*(big?1.8:1.7),big?rnd(.1,.16):rnd(.05,.09),big?rnd(.03,.06):rnd(.012,.03),'sine',big?.7:.45,rnd(-.9,.9));
    if(big) setTimeout(()=>tone(sc,f*.5,f*.62,.18,.025,'sine',.6,0),40);
  }

  function thunder(sc){
    if(!ctx||sc.dead) return;
    const t=ctx.currentTime, s=ctx.createBufferSource(); s.buffer=noiseB; s.loop=true;
    const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=rnd(110,180);
    const g=ctx.createGain(); g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(rnd(.18,.3),t+rnd(1.2,2.2));
    g.gain.exponentialRampToValueAtTime(.0001,t+rnd(7,10));
    s.connect(f); f.connect(g); g.connect(sc.bus);
    const w=ctx.createGain(); w.gain.value=.5; g.connect(w); w.connect(sc.wet);
    s.start(t,rnd(0,2)); s.stop(t+11);
  }

  const builders={
    hub(sc){
      [174.61,261.63,349.23,440].forEach((f,i)=>{
        const o=mk.osc(sc,'sine',f), g=mk.gain(.022);
        o.connect(g); g.connect(sc.bus);
        mk.lfo(sc,.05+i*.013,.01,g.gain);
      });
    },
    sea(sc){
      const a=mk.bed(sc,noiseB,[mk.filt('lowpass',650,.5)],.42);
      mk.lfo(sc,.085,.3,a.gain);
      const b=mk.bed(sc,noiseB,[mk.filt('lowpass',380)],.28);
      mk.lfo(sc,.057,.2,b.gain);
      const c=mk.bed(sc,noiseW,[mk.filt('highpass',2200),mk.filt('lowpass',7500)],.05);
      mk.lfo(sc,.085,.04,c.gain);
      /* 갈매기: 멀리서 가끔, 이따금 가까이서 서로 부른다 */
      mk.every(sc,5,13,()=>{
        gullCry(sc,Math.random()<.3);
        if(Math.random()<.45) sc.timers.push(setTimeout(()=>gullCry(sc,false),rnd(900,1800)));
      });
    },
    forest(sc){
      const w=mk.bed(sc,noiseB,[mk.filt('bandpass',420,.5)],.32);
      mk.lfo(sc,.06,.14,w.gain);
      const l=mk.bed(sc,noiseW,[mk.filt('highpass',3800)],.014);
      mk.lfo(sc,.11,.01,l.gain);
      mk.every(sc,7,16,()=>{
        if(!ctx||sc.dead) return;
        const t=ctx.currentTime, s=ctx.createBufferSource(); s.buffer=noiseW;
        const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=rnd(500,900); f.Q.value=.6;
        const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(rnd(.05,.09),t+.06); g.gain.exponentialRampToValueAtTime(.0001,t+rnd(.5,.9));
        const pn=ctx.createStereoPanner?ctx.createStereoPanner():null; if(pn) pn.pan.value=rnd(-.8,.8);
        s.connect(f); f.connect(g); if(pn){ g.connect(pn); pn.connect(sc.bus); } else g.connect(sc.bus);
        const w2=ctx.createGain(); w2.gain.value=.5; g.connect(w2); w2.connect(sc.wet);
        s.start(t,rnd(0,2)); s.stop(t+1.2);
      });
      mk.every(sc,22,45,()=>{ const p=rnd(-.7,.7); tone(sc,rnd(340,400),rnd(300,330),.55,.022,'sine',.9,p); setTimeout(()=>tone(sc,rnd(330,380),rnd(290,320),.7,.02,'sine',.9,p),700); });
    },
    lake(sc){
      const a=mk.bed(sc,noiseB,[mk.filt('lowpass',520)],.24);
      mk.lfo(sc,.33,.1,a.gain);
      const b=mk.bed(sc,noiseW,[mk.filt('bandpass',1700,.8)],.018);
      mk.lfo(sc,.33,.012,b.gain);
      [[4300,7],[4650,6.1]].forEach(([f,r])=>{
        const o=mk.osc(sc,'triangle',f), g=mk.gain(.006), gate=mk.gain(.5);
        mk.lfo(sc,r,.006,g.gain);
        mk.lfo(sc,.12+r*.01,.5,gate.gain);
        o.connect(g); g.connect(gate); gate.connect(sc.bus);
      });
    },
    mountain(sc){
      const bp=mk.filt('bandpass',520,1.1);
      const w=mk.bed(sc,noiseB,[bp],.14);
      mk.lfo(sc,.05,.06,w.gain); mk.lfo(sc,.043,260,bp.frequency);
      const bp2=mk.filt('bandpass',1500,7);
      const h=mk.bed(sc,noiseW,[bp2],.005);
      mk.lfo(sc,.07,.004,h.gain); mk.lfo(sc,.05,380,bp2.frequency);
      sc.timers.push(setTimeout(()=>bell(sc),3000));
      mk.every(sc,16,30,()=>bell(sc));
    },
    /* 소나기: 숲 위로 '쏴아아' 하고 쉬지 않고 쏟아지는 굵은 비. 가끔 더 세게 몰아친다 */
    rain(sc){
      /* 실제 장대비 녹음(사용자 제공). 받기 전·실패 시에는 합성 빗소리가 대신 내린다 */
      const realBus=sc.bus, syn=ctx.createGain(); syn.gain.value=1; syn.connect(realBus); sc.bus=syn;
      const hiss=mk.bed(sc,noiseW,[mk.filt('highpass',600),mk.filt('lowpass',9500)],.26);
      mk.lfo(sc,.08,.025,hiss.gain); mk.lfo(sc,.27,.015,hiss.gain);
      const sheet=mk.bed(sc,noiseW,[mk.filt('bandpass',2300,.35)],.2);
      mk.lfo(sc,.11,.03,sheet.gain);
      const leafy=mk.bed(sc,noiseW,[mk.filt('bandpass',4200,.5)],.09);
      mk.lfo(sc,.19,.02,leafy.gain);
      const rum=mk.bed(sc,noiseB,[mk.filt('lowpass',520)],.28);
      mk.lfo(sc,.06,.05,rum.gain);
      const beds=[[hiss,.26],[sheet,.2],[leafy,.09],[rum,.28]];
      const surge=()=>{
        if(sc.dead) return;
        const t0=ctx.currentTime; beds.forEach(([g,v])=>g.gain.setTargetAtTime(v*1.35,t0,1.6));
        sc.timers.push(setTimeout(()=>{ if(sc.dead) return; const t1=ctx.currentTime; beds.forEach(([g,v])=>g.gain.setTargetAtTime(v,t1,2.4)); },rnd(4000,8000)));
      };
      sc.timers.push(setTimeout(surge,5000));
      mk.every(sc,16,28,surge);
      /* 연잎에 부딪는 소리는 낮고 은은하게(톡 소리만, 뽁뽁거리는 소리는 없음) */
      sc.bus=realBus; let real=false;
      sampleLoop(sc,'snd/rain.m4a',4.2,()=>{ real=true; syn.gain.setTargetAtTime(0,ctx.currentTime,.8); });
      const hitSyn=(...a)=>{ if(real) return; const b=sc.bus; sc.bus=syn; hit(sc,...a); sc.bus=b; };
      mk.every(sc,.012,.04,()=>hitSyn(700,1600,1.1,rnd(.02,.06),rnd(.025,.06)));   /* 바닥 탁탁탁 */
      mk.every(sc,.01,.035,()=>hitSyn(2600,6500,1.4,rnd(.012,.04),rnd(.02,.05)));  /* 나뭇잎 타닥 */
      mk.every(sc,.15,.5,()=>hitSyn(300,700,.8,rnd(.05,.1),rnd(.06,.12)));         /* 굵은 빗방울이 지붕·바닥을 칠 때 */
      sc.timers.push(setTimeout(()=>thunder(sc),9000));
      mk.every(sc,35,80,()=>thunder(sc));
    },
    valley(sc){
      /* 실제 계곡 녹음(사용자 제공). 받기 전·실패 시에는 합성한 물소리가 대신 흐른다 */
      const realBus=sc.bus, syn=ctx.createGain(); syn.gain.value=1; syn.connect(realBus); sc.bus=syn;
      const rush=mk.bed(sc,noiseW,[mk.filt('bandpass',1300,.45)],.08);
      mk.lfo(sc,.13,.02,rush.gain);
      const hiss=mk.bed(sc,noiseW,[mk.filt('highpass',4200)],.028);
      mk.lfo(sc,.09,.008,hiss.gain);
      mk.bed(sc,noiseB,[mk.filt('lowpass',320)],.14);
      [[620,3,.6,240,.05],[930,4,.9,330,.035],[1500,5,.45,420,.025]].forEach(([f,q,lf,dep,gn])=>{
        const b=mk.filt('bandpass',f,q), o=mk.bed(sc,noiseW,[b],gn);
        mk.lfo(sc,lf,dep,b.frequency); mk.lfo(sc,lf*.7,gn*.6,o.gain);
      });
      sc.bus=realBus;
      sampleLoop(sc,'snd/valley.m4a',5.2,()=>syn.gain.setTargetAtTime(0,ctx.currentTime,.8));
      mk.every(sc,5,12,()=>bird(sc));
    },
    cave(sc){
      [55,82.4,110.3].forEach((f,i)=>{
        const o=mk.osc(sc,'sine',f), g=mk.gain(.045);
        o.connect(g); g.connect(sc.bus);
        mk.lfo(sc,.04+i*.017,.02,g.gain);
      });
      const a=mk.bed(sc,noiseB,[mk.filt('lowpass',160)],.3);
      mk.lfo(sc,.07,.1,a.gain);
      mk.bed(sc,noiseW,[mk.filt('bandpass',900,.3)],.01);
    }
  };

  const level=()=>cur&&cur.name==='hub'?1:(seated?1:.55);

  function fadeOut(sc){
    sc.dead=true;
    sc.timers.forEach(clearTimeout);
    sc.bus.gain.setTargetAtTime(0,ctx.currentTime,.45);
    setTimeout(()=>{
      sc.srcs.forEach(s=>{ try{ s.stop(); }catch(e){} });
      try{ sc.bus.disconnect(); }catch(e){}
    },2800);
  }
  function enter(name){
    if(!ctx) return;
    if(cur) fadeOut(cur);
    const bus=ctx.createGain(); bus.gain.value=0; bus.connect(master);
    const wet=ctx.createGain(); wet.gain.value=.6;
    const conv=ctx.createConvolver(); conv.buffer=impulse;
    wet.connect(conv); conv.connect(bus);
    const sc={name,bus,wet,srcs:[],timers:[],dead:false};
    if(builders[name]) builders[name](sc);
    cur=sc;
    bus.gain.setTargetAtTime(level(),ctx.currentTime,1.4);
  }
  function setSeated(v){
    seated=v;
    if(ctx&&cur) cur.bus.gain.setTargetAtTime(level(),ctx.currentTime,1.6);
  }
  function event(kind,amt){
    if(!ctx||!cur) return;
    if(kind==='drip'&&cur.name==='cave'){
      tone(cur,rnd(1100,1700),rnd(700,900),.22,.16,'sine',1.1,rnd(-.3,.3));
    }
    if(kind==='splash'&&(cur.name==='valley'||cur.name==='sea')){
      const t=ctx.currentTime, s=ctx.createBufferSource(); s.buffer=noiseW;
      const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=rnd(1400,2600); f.Q.value=.7;
      const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(rnd(.05,.1)*(amt||1),t+.03); g.gain.exponentialRampToValueAtTime(.0001,t+rnd(.25,.45));
      s.connect(f); f.connect(g); g.connect(cur.bus); s.start(t,rnd(0,2)); s.stop(t+.6);
    }
    if(kind==='plip'&&cur.name==='lake'){
      tone(cur,rnd(520,780),rnd(300,400),.16,.12,'sine',.5,rnd(-.4,.4));
    }
  }
  return {
    init, enter, setSeated, event,
    setVolume(v){ vol=v; applyMaster(); },
    setMuted(m){ muted=m; applyMaster(); },
    get ok(){ return !!ctx; }
  };
})();
