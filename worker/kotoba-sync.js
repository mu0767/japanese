const ORIGIN='https://mu0767.github.io';
const HASH='7ef6fa9e2a8dac57c299aecce777b4b074fe6155b9b24a4fa7ec31e63d61f8c2';
const MAX=2097152;
const now=()=>Date.now();
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
const safeId=x=>typeof x==='string'&&/^[-A-Za-z0-9_.:]{1,120}$/.test(x)&&!['__proto__','constructor','prototype'].includes(x);
function headers(request){
 const origin=request.headers.get('Origin');
 return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type,Accept'}:{})};
}
function reply(request,body,status=200){return new Response(JSON.stringify(body),{status,headers:headers(request)})}
function last(a,b){
 if(!a)return {...b};if(!b)return {...a};
 if(!a.at&&!b.at)return {at:0,seq:Math.max(a.seq,b.seq),correct:a.correct&&b.correct};
 if(a.at!==b.at)return {...(a.at>b.at?a:b)};
 if(a.seq!==b.seq)return {...(a.seq>b.seq?a:b)};
 return {at:a.at,seq:a.seq,correct:a.correct&&b.correct};
}
function combine(a,b){
 const c={total:Math.max(a.total,b.total),correct:Math.max(a.correct,b.correct),seq:Math.max(a.seq,b.seq),days:{},words:{}};
 for(const date of new Set([...Object.keys(a.days),...Object.keys(b.days)]))c.days[date]=Math.max(a.days[date]||0,b.days[date]||0);
 for(const id of new Set([...Object.keys(a.words),...Object.keys(b.words)])){
  const x=a.words[id],y=b.words[id];
  c.words[id]={right:Math.max(x?.right||0,y?.right||0),wrong:Math.max(x?.wrong||0,y?.wrong||0),last:last(x?.last,y?.last)};
 }
 let right=0,wrong=0,days=0;
 for(const w of Object.values(c.words)){right+=w.right;wrong+=w.wrong}
 for(const n of Object.values(c.days))days+=n;
 c.correct=Math.max(c.correct,right);c.total=Math.max(c.total,c.correct,right+wrong,days);
 return c;
}
function merge(a,b){
 const next={format:'kotoba-progress',version:2,exportedAt:Math.max(a?.exportedAt||0,b.exportedAt),sourceDeviceId:a?.sourceDeviceId||b.sourceDeviceId,components:{}};
 for(const [id,c]of Object.entries(a?.components||{}))next.components[id]=c;
 for(const [id,c]of Object.entries(b.components))next.components[id]=next.components[id]?combine(next.components[id],c):c;
 return next;
}
function validate(doc){
 if(!plain(doc)||doc.format!=='kotoba-progress'||doc.version!==2||!safeId(doc.sourceDeviceId)||!plain(doc.components))throw Error('Invalid format');
 const entries=Object.entries(doc.components);
 if(!entries.length||entries.length>100||!doc.components[doc.sourceDeviceId])throw Error('Invalid devices');
 const n=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000000;const ts=x=>Number.isSafeInteger(x)&&x>=0&&x<=8000000000000000;
 if(!ts(doc.exportedAt))throw Error('Invalid export time');
 for(const [device,c] of entries){
  if(!safeId(device)||!plain(c)||!n(c.total)||!n(c.correct)||c.correct>c.total||!n(c.seq)||!plain(c.days)||!plain(c.words))throw Error('Invalid component');
  if(Object.keys(c.days).length>10000||Object.keys(c.words).length>20000)throw Error('Excessive records');
  let daily=0,right=0,wrong=0;
  for(const [d,count]of Object.entries(c.days)){if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!n(count))throw Error('Invalid date');daily+=count}
  for(const [id,w]of Object.entries(c.words)){
   if(!safeId(id)||!plain(w)||!n(w.right)||!n(w.wrong)||!plain(w.last)||!n(w.last.seq)||w.last.seq>c.seq||!ts(w.last.at)||typeof w.last.correct!=='boolean')throw Error('Invalid word');
   right+=w.right;wrong+=w.wrong;
  }
  if(daily>c.total||right>c.correct||right+wrong>c.total)throw Error('Inconsistent counts');
 }
}
async function authenticate(request){
 const auth=request.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9_-]{43,128}$/.test(auth))return false;
 const bytes=new TextEncoder().encode(auth.slice(7));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const value=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 return value===HASH;
}
export default {
 async fetch(request,env){
  const method=request.method;
  if(method==='OPTIONS'){
   if(request.headers.get('Origin')!==ORIGIN)return reply(request,{error:'Origin not allowed'},403);
   return new Response(null,{status:204,headers:headers(request)});
  }
  if(new URL(request.url).pathname!=='/api/kotoba-progress')return reply(request,{error:'Not found'},404);
  if(method!=='GET'&&method!=='POST')return reply(request,{error:'Method not allowed'},405);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==ORIGIN)return reply(request,{error:'Origin not allowed'},403);
  if(!await authenticate(request))return reply(request,{error:'Invalid connection'},401);
  if(!env.DB)return reply(request,{error:'Database not available'},503);
  try{
   const load=()=>env.DB.prepare('SELECT version,data FROM kotoba_progress WHERE key_hash=?').bind(HASH).first();
   const existing=await load();
   if(!existing)return reply(request,{error:'Connection not provisioned'},404);
   if(method==='GET')return reply(request,{version:existing.version,progress:JSON.parse(existing.data)});
   const limit=Number(request.headers.get('Content-Length')||0);
   if(limit>MAX)return reply(request,{error:'Record too large'},413);
   const input=await request.text();if(new TextEncoder().encode(input).length>MAX)return reply(request,{error:'Record too large'},413);
   let incoming;
   try{incoming=JSON.parse(input);validate(incoming)}catch{return reply(request,{error:'Invalid learning record'},400)}
   for(let attempt=0;attempt<12;attempt++){
    const row=attempt===0?existing:await load();
    const remote=JSON.parse(row.data);
    const combined=merge(remote,incoming);
    validate(combined);
    const encoded=JSON.stringify(combined);
    if(encoded.length>MAX)return reply(request,{error:'Merged record too large'},413);
    if(encoded===row.data)return reply(request,{version:row.version,progress:combined});
    const saved=await env.DB.prepare('UPDATE kotoba_progress SET version=?, data=?,updated_at=unixepoch() WHERE key_hash=? AND version=?').bind(row.version+1,encoded,HASH,row.version).run();
    if(saved.meta.changes===1)return reply(request,{version:row.version+1,progress:combined});
   }
   return reply(request,{error:'Concurrent update, retry'},409);
  }catch(error){console.error('Kotoba sync error',String(error));return reply(request,{error:'Server error'},500)}
 }
};