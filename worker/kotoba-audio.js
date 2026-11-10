// Serves pre-generated Japanese WAV, independent of the listener's installed TTS voices.
// KV keys: g0..g300 (no original recording), n0..n349 (with original recording).
export default {
 async fetch(request,env){
  const cors={'Access-Control-Allow-Origin':'*','Cross-Origin-Resource-Policy':'cross-origin','X-Content-Type-Options':'nosniff'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Methods':'GET,HEAD,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Range','Access-Control-Expose-Headers':'Accept-Ranges,Content-Range,Content-Length','Access-Control-Max-Age':'86400'}});
  const url=new URL(request.url);
  if(url.pathname==='/health')return new Response(JSON.stringify({service:'kotoba-audio',version:1}),{headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:cors});
  const match=/^\/v1\/audio\/([gn])\/(\d{1,3})\/([A-Za-z0-9-]+)$/.exec(url.pathname);
  if(!match)return new Response('Not Found',{status:404,headers:cors});
  const prefix=match[1],group=Number(match[2]),id=match[3];
  if(group<0||group>=(prefix==='g'?301:350))return new Response('Not Found',{status:404,headers:cors});
  try{
   const files=await env.AUDIO.get(prefix+group,'json');
   const encoded=files?.[id];
   if(typeof encoded!=='string')return new Response('Not Found',{status:404,headers:cors});
   const raw=atob(encoded),bytes=new Uint8Array(raw.length);
   for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   if(bytes.length<44||raw.slice(0,4)!=='RIFF'||raw.slice(8,12)!=='WAVE')throw Error('Corrupt audio');
   const headers={...cors,'Content-Type':'audio/wav','Accept-Ranges':'bytes','Access-Control-Expose-Headers':'Accept-Ranges,Content-Range,Content-Length','Cache-Control':'public, max-age=86400','X-Audio-Source':'kotoba-archive'};
   const range=request.headers.get('Range');
   if(range){
    const m=/^bytes=(\\d*)-(\\d*)$/.exec(range);
    let start,end;
    if(m&&(m[1]||m[2])){
     if(m[1]){
      start=Number(m[1]);end=m[2]?Number(m[2]):bytes.length-1;
     }else{
      const suffix=Number(m[2]);start=Math.max(0,bytes.length-suffix);end=bytes.length-1;
     }
    }
    if(start===undefined||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=bytes.length||start>end||end<0){
     return new Response(null,{status:416,headers:{...headers,'Content-Range':'bytes */'+bytes.length}});
    }
    end=Math.min(end,bytes.length-1);
    headers['Content-Range']='bytes '+start+'-'+end+'/'+bytes.length;
    headers['Content-Length']=String(end-start+1);
    return new Response(request.method==='HEAD'?null:bytes.subarray(start,end+1),{status:206,headers});
   }
   headers['Content-Length']=String(bytes.length);
   return new Response(request.method==='HEAD'?null:bytes,{status:200,headers});
  }catch{
   return new Response('Audio unavailable',{status:503,headers:{...cors,'Cache-Control':'no-store'}});
  }
 }
};