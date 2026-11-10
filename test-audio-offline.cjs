const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const WAV='https://kotoba-audio.union-raid.workers.dev/v1/audio/';
const store=new Map();
const calls=[];
let storeDisabled=false;
const cache={
 async match(url){const res=store.get(String(url));return res?res.clone():undefined},
 async put(url,response){
  if(storeDisabled)throw Object.assign(new Error('Storage quota exceeded'),{name:'QuotaExceededError'});
  store.set(String(url),response.clone());
 },
 async keys(){return [...store.keys()].map(url=>({url}))}
};
const caches={async open(){return cache}};
class Audio {
 constructor(src){this.src=src;this.playbackRate=1;this.readyState=3}
 load(){}
 play(){return Promise.resolve()}
 pause(){}
}
const ctx=vm.createContext({
 setTimeout,clearTimeout,AbortController,URL:{
  createObjectURL(){return 'blob:test-cached-japanese-wav'},
  revokeObjectURL(){}
 },
 Audio,caches,Blob,Response,
 async fetch(url,{signal}={}){
  if(signal?.aborted)throw Object.assign(new Error('Abort'),{name:'AbortError'});
  calls.push(url);
  return new Response(new Uint8Array(160).fill(1),{
   status:200,headers:{'content-type':'audio/wav','content-length':'160'}
  });
 },
 speechSynthesis:{getVoices:()=>[],speak(){},cancel(){}}
});
for(const file of ['data.js','audio-data.js','audio.js','audio-offline.js']){
 vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
}
const words=vm.runInContext('WORDS',ctx);
const offline=ctx.KotobaOfflineAudio;
const audio=ctx.KotobaAudio;
const zero=words.find(w=>w.word==='ゼロ');
(async()=>{
 assert.equal(offline.supported(),true);
 assert.equal((await offline.status(words)).stored,0);
 const sample=words.filter(w=>w.level==='N5').slice(0,8);
 let progress=null;
 const result=await offline.download(sample,p=>progress=p);
 assert.equal(result.total,8);
 assert.equal(result.downloaded,8);
 assert.equal(result.existing,0);
 assert.equal(result.failed,0);
 assert.equal(progress.done,8);
 assert.equal((await offline.status(words)).stored,8);
 const before=calls.length;
 assert.equal((await offline.download(sample)).downloaded,0);
 assert.equal(calls.length,before,'Resuming must not request cached audio again');
 const item=await offline.getBlob(audio.archiveSource(sample[0]));
 assert.equal(item.size,160);
 assert.equal(calls.length,before,'Playing a saved audio clip must avoid network');

 // On a cache hit, prepare() creates a playable local Blob URL, not an external URL.
 audio.prepare([sample[0]]);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(offline.active(),false);

 // Downloaded words are indexed by their original URL.
 const more=words.filter(w=>w.level==='N4').slice(0,10);
 const partial=await offline.download(more,p=>{if(p.done>=8)offline.stop()});
 assert(partial.paused);
 assert.equal(offline.active(),false);
 const resumed=await offline.download(more);
 assert.equal(resumed.failed,0);
 assert.equal((await offline.status(words)).stored,18);

 // A storage quota error must stop the batch instead of endlessly fetching.
 storeDisabled=true;
 const other=words.filter(w=>w.level==='N3').slice(0,6);
 const full=await offline.download(other);
 assert.equal(full.quotaError,true);
 assert.equal(full.paused,true);
 storeDisabled=false;
 assert.equal((await offline.download(other)).downloaded,6);

 // Distinct from D1 progression: audio is stored only in this browser's CacheStorage.
 assert.equal((await offline.status(words)).stored,24);
 assert(words.every(w=>audio.archiveSource(w)?.startsWith(WAV)));
 console.log('PASS: persisted audio, level downloads, full-library URL map, resume/pause, low-storage handling, cache playback without re-fetching');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
