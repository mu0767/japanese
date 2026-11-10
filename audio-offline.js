(function(root){
'use strict';
// An opt-in, persistent device cache. Never silently download the entire 585 MiB library.
// CacheStorage is device-local and independent of the synced learning progress.
const CACHE_NAME='kotoba-wav-v1';
const PREFIX='https://kotoba-audio.union-raid.workers.dev/v1/audio/';
const CONCURRENCY=4;
let task=null;
function supported(){
 return !!(root.caches&&typeof root.caches.open==='function'&&typeof root.fetch==='function');
}
function urlFor(word){
 return root.KotobaAudio?.archiveSource(word)||null;
}
function allowed(url){return typeof url==='string'&&url.startsWith(PREFIX);}
async function openCache(){
 if(!supported())throw new Error('이 브라우저에서는 음원 저장을 지원하지 않습니다.');
 return root.caches.open(CACHE_NAME);
}
async function getBlob(url){
 if(!allowed(url))throw new Error('잘못된 음원 주소입니다.');
 const cache=supported()?await openCache().catch(()=>null):null;
 if(cache){
  try{
   const match=await cache.match(url);
   if(match)return await match.blob();
  }catch{}
 }
 const response=await root.fetch(url,{mode:'cors',cache:'force-cache'});
 if(!response.ok)throw new Error('음원 다운로드 실패 ('+response.status+')');
 if(cache){
  // Do not make click-to-speech wait for slow disk writes.
  try{cache.put(url,response.clone()).catch(()=>{})}catch{}
 }
 return response.blob();
}
async function status(words){
 if(!supported())return {supported:false,stored:0,total:words.length,levelCounts:{}};
 const cache=await openCache();
 const keys=await cache.keys();
 const storedUrls=new Set(keys.map(request=>request.url).filter(allowed));
 let stored=0;
 const levelCounts={};
 for(const word of words){
  const level=word.level;
  if(!levelCounts[level])levelCounts[level]={stored:0,total:0};
  levelCounts[level].total++;
  if(storedUrls.has(urlFor(word))){stored++;levelCounts[level].stored++}
 }
 return {supported:true,stored,total:words.length,levelCounts};
}
function active(){return !!task}
function stop(){
 if(!task)return false;
 task.controller.abort();
 return true;
}
async function download(words,onProgress=()=>{}){
 if(task)throw new Error('이미 음원을 저장하는 중입니다.');
 const cache=await openCache();
 const targets=Array.from(new Map(words.map(word=>[urlFor(word),word]).filter(([url])=>allowed(url))).keys());
 const controller=new AbortController();
 const local={controller};
 task=local;
 let cursor=0,done=0,downloaded=0,existing=0,failed=0,bytes=0,quotaError=false;
 const failures=[];
 const emit=()=>{
  if(task===local)onProgress({done,total:targets.length,downloaded,existing,failed,bytes,paused:controller.signal.aborted,quotaError});
 };
 const worker=async()=>{
  while(cursor<targets.length&&!controller.signal.aborted){
   const url=targets[cursor++];
   try{
    const hit=await cache.match(url);
    if(hit){existing++}
    else{
     const response=await root.fetch(url,{mode:'cors',cache:'force-cache',signal:controller.signal});
     if(!response.ok)throw new Error('HTTP '+response.status);
     const size=Number(response.headers?.get('content-length'))||0;
     await cache.put(url,response);
     bytes+=size;
     downloaded++;
    }
   }catch(error){
    if(controller.signal.aborted)break;
    failed++;
    if(failures.length<20)failures.push({url,error:String(error?.message||error)});
    if(/QuotaExceeded|quota|storage/i.test(String(error?.name||'')+' '+String(error?.message||''))){
     quotaError=true;
     controller.abort();
    }
   }finally{
    done++;
    if(done%8===0||done===targets.length||controller.signal.aborted)emit();
   }
  }
 };
 try{
  emit();
  await Promise.all(Array.from({length:Math.min(CONCURRENCY,targets.length)},()=>worker()));
  return {done,total:targets.length,downloaded,existing,failed,bytes,paused:controller.signal.aborted,quotaError,failures};
 }finally{
  if(task===local)task=null;
 }
}
root.KotobaOfflineAudio={CACHE_NAME,supported,getBlob,status,download,stop,active};
if(typeof module!=='undefined'&&module.exports)module.exports=root.KotobaOfflineAudio;
})(typeof window!=='undefined'?window:globalThis);
