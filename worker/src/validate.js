/* 중계 서버가 받는 값 검사: 모양이 틀리면 버린다 */
export const SCENES=['hub','sea','forest','lake','valley','mountain','cave','rain','field','thunder','bolt','spout','hail','avalanche'];
const num=(v,lo,hi)=>typeof v==='number'&&isFinite(v)?Math.max(lo,Math.min(hi,v)):null;
export function sanitize(d){
  if(!d||typeof d!=='object'||Array.isArray(d)) return null;
  if(typeof d.s!=='string'||!SCENES.includes(d.s)) return null;
  const x=num(d.x,-200,200), z=num(d.z,-200,200), h=num(d.h,-10,10);
  if(x===null||z===null||h===null) return null;
  let n=typeof d.n==='string'?d.n.replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,12):'';
  if(!n) n='나그네';
  return {n,s:d.s,x,z,h,i:d.i?1:0,l:d.l?1:0};
}
/* 초당 8개, 한꺼번에 16개까지 */
export function allow(bucket,now){
  const rate=8, cap=16;
  bucket.tokens=Math.min(cap,(bucket.tokens??cap)+((now-(bucket.t??now))/1000)*rate); bucket.t=now;
  if(bucket.tokens<1) return false; bucket.tokens-=1; return true;
}
