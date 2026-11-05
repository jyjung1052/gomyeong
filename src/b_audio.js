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
  const bufCache={}, bufReady={};
  function loadBuf(url){
    if(!bufCache[url]) bufCache[url]=fetch(url).then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab=>new Promise((ok,no)=>ctx.decodeAudioData(ab,ok,no)));
    bufCache[url].then(b=>{ bufReady[url]=b; }).catch(()=>{ delete bufCache[url]; });
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
  /* 녹음 조각을 한 번만 재생(새 한 마리 울음 등) */
  function sampleOnce(sc,url,g,pan){
    if(typeof fetch!=='function') return;
    loadBuf(url).then(buf=>{
      if(sc.dead) return;
      const s=ctx.createBufferSource(); s.buffer=buf; const out=ctx.createGain(); out.gain.value=g;
      s.connect(out); let o=out; if(ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=pan||0; out.connect(p); o=p; }
      o.connect(sc.bus); s.start();
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
      /* 산: 아주 작고 잔잔한 바람 + 1분 뒤 사용자 영상 소리 한 번 + 가끔 먼 종소리 */
      const bp=mk.filt('bandpass',480,1.0);
      const w=mk.bed(sc,noiseB,[bp],.03);
      mk.lfo(sc,.045,.012,w.gain); mk.lfo(sc,.037,180,bp.frequency);
      if(typeof fetch==='function') loadBuf('snd/mtclip.m4a').catch(()=>{});
      sc.timers.push(setTimeout(()=>{ if(!sc.dead) sampleOnce(sc,'snd/mtclip.m4a',1.0,0); },60000));
      /* 가끔 울리는 먼 종소리 */
      sc.timers.push(setTimeout(()=>bell(sc),25000));
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
      sampleLoop(sc,'snd/rain4.m4a',4.6,()=>{ real=true; syn.gain.setTargetAtTime(0,ctx.currentTime,.8); });
      /* 받기 전에는 합성 빗방울, 녹음이 흐르면 듬성듬성 또렷한 '탁'만 얹는다(촘촘하면 바람소리처럼 뭉친다) */
      const synHit=(...a)=>{ if(real) return; const b=sc.bus; sc.bus=syn; hit(sc,...a); sc.bus=b; };
      mk.every(sc,.012,.04,()=>synHit(700,1600,1.1,rnd(.02,.06),rnd(.025,.06)));
      mk.every(sc,.01,.035,()=>synHit(2600,6500,1.4,rnd(.012,.04),rnd(.02,.05)));
      mk.every(sc,.03,.1,()=>{ if(real) hit(sc,1000,2800,1.3,rnd(.03,.07),rnd(.008,.02)); });   /* 바닥 탁, 타닥 */
      mk.every(sc,.25,.7,()=>{ if(real) hit(sc,600,1300,1.0,rnd(.04,.07),rnd(.012,.025)); });        /* 굵은 빗방울 툭 */
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
    field(sc){
      /* 들녘: 바람이 밀려올 때마다 풀숲이 '사그락' 스치고, 잦아들면 조용해진다 */
      const gust=mk.gain(.3); gust.connect(sc.bus);                       // 바람 세기(0~1)
      const real=sc.bus; sc.bus=gust;
      const bp=mk.filt('bandpass',650,.6);
      const w=mk.bed(sc,noiseB,[bp],.2); mk.lfo(sc,.05,220,bp.frequency);  // 낮은 바람
      const air=mk.bed(sc,noiseW,[mk.filt('bandpass',1500,.5),mk.filt('lowpass',3200)],.06);
      const rus=mk.bed(sc,noiseW,[mk.filt('highpass',3200),mk.filt('lowpass',8000)],.022);  // 풀잎 스치는 결
      mk.lfo(sc,.9,.008,rus.gain);
      sc.bus=real;
      let gustOn=false;
      const blow=()=>{
        if(sc.dead) return;
        const t0=ctx.currentTime, peak=rnd(.5,.7), up=rnd(2,3.5), hold=rnd(2,5);
        gust.gain.setTargetAtTime(peak,t0,up/3); gustOn=true;
        sc.timers.push(setTimeout(()=>{ if(sc.dead) return; gust.gain.setTargetAtTime(rnd(.25,.35),ctx.currentTime,rnd(1.5,2.5)); gustOn=false; },(up+hold)*1000));
        sc.timers.push(setTimeout(blow,(up+hold+rnd(4,10))*1000));
      };
      sc.timers.push(setTimeout(blow,2500));
      /* 사그락: 마른 풀잎끼리 부딪는 아주 짧고 바삭한 소리 알갱이. 바람이 셀 때 촘촘해진다 */
      const grain=()=>hit(sc,2600,7500,.9,rnd(.006,.02)*(gustOn?1.3:.8),rnd(.012,.035));
      const tick=()=>{
        if(sc.dead) return;
        const n=gustOn?Math.floor(rnd(1,4)):(Math.random()<.35?1:0);
        for(let i=0;i<n;i++) sc.timers.push(setTimeout(grain,rnd(0,40)));
        sc.timers.push(setTimeout(tick,rnd(25,60)));
      };
      tick();
    },
    thunder(sc){
      /* 대숲: 바람이 대나무 사이를 지나며 잎끼리 사사삭 스치고, 가끔 줄기끼리 '톡' 부딪힌다 */
      const gust=mk.gain(.35); gust.connect(sc.bus);
      const real=sc.bus; sc.bus=gust;
      const bp=mk.filt('bandpass',520,.6);
      mk.bed(sc,noiseB,[bp],.22); mk.lfo(sc,.04,160,bp.frequency);
      const leaves=mk.bed(sc,noiseW,[mk.filt('bandpass',4200,.7),mk.filt('lowpass',9000)],.06);
      mk.lfo(sc,.6,.02,leaves.gain);
      mk.bed(sc,noiseW,[mk.filt('bandpass',1800,.6)],.03);
      sc.bus=real;
      let on=false;
      const blow=()=>{
        if(sc.dead) return;
        const t0=ctx.currentTime, up=rnd(1.8,3);
        gust.gain.setTargetAtTime(rnd(.7,.95),t0,up/3); on=true;
        sc.timers.push(setTimeout(()=>{ if(sc.dead) return; gust.gain.setTargetAtTime(rnd(.28,.4),ctx.currentTime,rnd(1.4,2.4)); on=false; },(up+rnd(2,5))*1000));
        sc.timers.push(setTimeout(blow,(up+rnd(7,14))*1000));
      };
      sc.timers.push(setTimeout(blow,2000));
      const tick=()=>{
        if(sc.dead) return;
        const n=on?Math.floor(rnd(1,3)):(Math.random()<.3?1:0);
        for(let i=0;i<n;i++) sc.timers.push(setTimeout(()=>hit(sc,3000,8000,1,rnd(.008,.022),rnd(.01,.03)),rnd(0,40)));
        sc.timers.push(setTimeout(tick,rnd(30,70)));
      };
      tick();
      /* 줄기끼리 부딪는 마른 '톡, 토독' */
      mk.every(sc,3,9,()=>{ const k=Math.random()<.5?2:1; for(let i=0;i<k;i++) sc.timers.push(setTimeout(()=>hit(sc,700,1200,2.2,rnd(.03,.06),rnd(.03,.06)),i*rnd(90,160))); });
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
    if(name==='thunder') YELL_S.concat(YELL_G).forEach(u=>loadBuf(u).catch(()=>{}));   // 고함 녹음을 미리 받아 둔다
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
  /* ---- 고함: 목소리를 흉내 낸 소리(톱니파 성대 + 모음 공명 + 거친 찢어짐 + 숨소리). 매번 다르게 ---- */
  const VOW={eu:[340,1350,2500],a:[850,1250,2650],ya:[300,2100,2900],o:[520,900,2500],i:[300,2250,3000]};
  function rasp(k){ const n=1024, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/n*2-1; c[i]=Math.tanh(x*k); } const w=ctx.createWaveShaper(); w.curve=c; return w; }
  function voice(sc,t0,dur,o){
    const out=ctx.createGain(); out.gain.value=0;
    const sh=rasp(o.grit), pre=ctx.createGain(); pre.gain.value=o.drive;
    const o1=ctx.createOscillator(), o2=ctx.createOscillator(); o1.type='sawtooth'; o2.type='square'; o2.detune.value=rnd(10,25);
    const f=o.f0, F=o1.frequency, F2=o2.frequency;
    [F,F2].forEach(q=>{ q.setValueAtTime(f*o.start,t0); q.linearRampToValueAtTime(f*o.peak,t0+dur*o.rise); q.setValueAtTime(f*o.peak,t0+dur*.7); q.linearRampToValueAtTime(f*o.end,t0+dur); });
    const vib=ctx.createOscillator(), vg=ctx.createGain(); vib.frequency.value=rnd(5,7.5); vg.gain.value=f*o.vib; vib.connect(vg); vg.connect(F); vg.connect(F2);
    const jit=ctx.createOscillator(), jg=ctx.createGain(); jit.type='triangle'; jit.frequency.value=rnd(11,17); jg.gain.value=f*.025; jit.connect(jg); jg.connect(F);
    const m2=ctx.createGain(); m2.gain.value=.45; o1.connect(pre); o2.connect(m2); m2.connect(pre); pre.connect(sh);
    const nb=ctx.createBufferSource(); nb.buffer=noiseW; nb.loop=true; const nf=ctx.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=3200; nf.Q.value=.6; const ng=ctx.createGain(); ng.gain.value=o.breath;
    nb.connect(nf); nf.connect(ng);
    const mix=ctx.createGain(); sh.connect(mix); ng.connect(mix);
    /* 모음 공명 셋: 모음 흐름을 따라 옮겨 간다 */
    o.vow.forEach(([vk,at])=>{});
    [0,1,2].forEach(k=>{
      const b=ctx.createBiquadFilter(); b.type='bandpass'; b.Q.value=[6,9,12][k];
      o.vow.forEach(([vk,at],j)=>{ const fr=VOW[vk][k]*(o.formK||1); if(j===0) b.frequency.setValueAtTime(fr,t0); else b.frequency.setTargetAtTime(fr,t0+dur*at,.06); });
      const g=ctx.createGain(); g.gain.value=[1,.75,.4][k]*3;
      mix.connect(b); b.connect(g); g.connect(out);
    });
    const lowBody=ctx.createBiquadFilter(); lowBody.type='lowpass'; lowBody.frequency.value=900; const lb=ctx.createGain(); lb.gain.value=.5; mix.connect(lowBody); lowBody.connect(lb); lb.connect(out);
    const G=out.gain, pk=o.gain;
    G.setValueAtTime(0,t0); G.linearRampToValueAtTime(pk,t0+o.att); G.setTargetAtTime(pk*.85,t0+dur*.5,.4);
    if(o.cut){ G.setValueAtTime(pk*.8,t0+dur-.05); G.linearRampToValueAtTime(0,t0+dur); }       // '악!' 하고 끊긴다
    else G.setTargetAtTime(0,t0+dur-.25,.12);
    out.connect(sc.bus); const w=ctx.createGain(); w.gain.value=o.echo; out.connect(w); w.connect(sc.wet);
    [o1,o2,vib,jit,nb].forEach(n=>{ n.start(t0); n.stop(t0+dur+.3); });
  }
  /* 이를 악물고 부르르 떠는 '으으으': 낮고 거칠게 떨리며 점점 커진다 */
  function growl(sc,t0,dur){
    const o1=ctx.createOscillator(); o1.type='sawtooth'; o1.frequency.setValueAtTime(rnd(95,130),t0); o1.frequency.linearRampToValueAtTime(rnd(150,200),t0+dur);
    const sh=rasp(5), lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=700;
    const f1=ctx.createBiquadFilter(); f1.type='bandpass'; f1.frequency.value=350; f1.Q.value=5;
    const trem=ctx.createGain(); trem.gain.value=.6; const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=rnd(11,16); lg.gain.value=.4; lfo.connect(lg); lg.connect(trem.gain);
    const out=ctx.createGain(); out.gain.setValueAtTime(0,t0); out.gain.linearRampToValueAtTime(.26,t0+dur*.85); out.gain.linearRampToValueAtTime(.05,t0+dur);
    o1.connect(sh); sh.connect(lp); lp.connect(f1); f1.connect(trem); trem.connect(out); lp.connect(out); out.connect(sc.bus);
    [o1,lfo].forEach(n=>{ n.start(t0); n.stop(t0+dur+.1); });
  }
  /* 미리 만들어 둔 사람 목소리 고함(거칠게 찢어지는 '아악!', 대숲 울림 포함)과 이를 악문 '으으읍' */
  const YELL_S=['snd/yell/yell.m4a'],   // 직접 녹음한 고함
         YELL_G=[0,1,2].map(i=>'snd/yell/strain'+i+'.m4a');
  const YELL_TAIL=1.6;                                   // 파일 끝의 울림 길이
  let lastYell=-1;
  function playBuf(sc,buf,when,gain,rate,fadeAt){
    const s=ctx.createBufferSource(); s.buffer=buf; s.playbackRate.value=rate||1;
    const o=ctx.createGain(); o.gain.setValueAtTime(gain,when);
    if(fadeAt){ o.gain.setValueAtTime(gain,fadeAt-.12); o.gain.linearRampToValueAtTime(0,fadeAt); }
    s.connect(o); o.connect(sc.bus); s.start(when,.04); if(fadeAt) s.stop(fadeAt+.05);
  }
  /* 고함: 녹음이 준비돼 있으면 녹음으로, 아니면 흉내 낸 목소리로. 실제 고함 길이(초)를 돌려준다 */
  function shout(buildDur,dur,soft){
    if(!ctx||!cur) return null;
    const sc=cur, t0=ctx.currentTime;
    YELL_S.concat(YELL_G).forEach(u=>{ if(!bufReady[u]) loadBuf(u).catch(()=>{}); });
    let k=Math.floor(Math.random()*YELL_S.length); if(k===lastYell) k=(k+1)%YELL_S.length;
    const sb=bufReady[YELL_S[k]], gb=bufReady[YELL_G[Math.floor(Math.random()*YELL_G.length)]];
    if(sb&&gb){
      lastYell=k; const rate=rnd(.96,1.04);
      playBuf(sc,gb,t0,soft?.5:.85,rnd(.94,1.06),t0+buildDur+.05);
      playBuf(sc,sb,t0+buildDur,soft?.4:1.0,rate);
      return (sb.duration-YELL_TAIL)/rate;
    }
    growl(sc,t0,buildDur);
    const pats=[[['eu',0],['a',.18]],[['a',0]],[['eu',0],['a',.12],['o',.85]],[['ya',0],['a',.2]],[['i',0],['a',.25]]];
    const parts=Math.random()<.45?1:(Math.random()<.6?2:3);
    let at=t0+buildDur;
    const base=rnd(250,380), lens=parts===1?[dur]:parts===2?[dur*.32,dur*.68]:[dur*.22,dur*.25,dur*.53];
    lens.forEach((d,i)=>{
      voice(sc,at,d,{f0:base*rnd(.92,1.12)*(i===parts-1?1.08:1),start:rnd(.7,.85),peak:rnd(1.15,1.35),rise:rnd(.15,.35),end:rnd(.65,.9),vib:rnd(.02,.05),
        grit:rnd(3,9),drive:rnd(.8,1.6),breath:rnd(.08,.2),vow:pats[Math.floor(Math.random()*pats.length)],formK:rnd(.92,1.1),
        att:rnd(.04,.12),cut:Math.random()<.6,gain:(soft?.2:.4)*rnd(.85,1.15),echo:rnd(.5,.9)});
      at+=d+rnd(.08,.22);
    });
    return null;
  }
  return {
    init, enter, setSeated, event, shout,
    setVolume(v){ vol=v; applyMaster(); },
    setMuted(m){ muted=m; applyMaster(); },
    get ok(){ return !!ctx; }
  };
})();
