const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const store=new Map(),calls=[],opened=[],deleted=[];let storeDisabled=false,bad=false;
const cache={async match(url){return store.get(String(url))?.clone()},async put(url,response){if(storeDisabled)throw Object.assign(Error('Storage quota exceeded'),{name:'QuotaExceededError'});store.set(String(url),response.clone())},async delete(url){return store.delete(String(url))},async keys(){return [...store.keys()].map(url=>({url}))}};
const caches={async open(name){opened.push(name);return cache},async delete(name){deleted.push(name);return true}};
class Audio{constructor(src){this.src=src;this.readyState=3}load(){}play(){return Promise.resolve()}pause(){}}
class LocalURL extends URL{};LocalURL.createObjectURL=()=> 'blob:verified-offline-mp3';LocalURL.revokeObjectURL=()=>{};
const ctx=vm.createContext({setTimeout,clearTimeout,setInterval,clearInterval,AbortController,URL:LocalURL,Audio,caches,Blob,Response,location:{href:'https://mu0767.github.io/japanese/'},async fetch(url,{signal}={}){if(signal?.aborted)throw Object.assign(Error('Abort'),{name:'AbortError'});calls.push(url);return bad?new Response('<html>missing audio</html>',{headers:{'content-type':'text/html'}}):new Response(new Uint8Array([0x49,0x44,0x33,...Array(157).fill(1)]),{headers:{'content-type':'audio/mpeg','content-length':'160'}})}});
for(const file of ['data.js','audio-data.js','audio.js','audio-offline.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const words=vm.runInContext('WORDS',ctx),offline=ctx.KotobaOfflineAudio,audio=ctx.KotobaAudio;
(async()=>{
 assert.equal(offline.supported(),true);assert.equal((await offline.status(words)).stored,0);assert.deepEqual(deleted,['kotoba-wav-v1']);assert(opened.every(name=>name==='kotoba-phonetic-mp3-v1'));
 const sample=words.filter(w=>w.level==='N5').slice(0,8);let progress;
 const result=await offline.download(sample,p=>progress=p);assert.equal(result.downloaded,8);assert.equal(result.failed,0);assert.equal(progress.done,8);assert.equal((await offline.status(words)).stored,8);
 const before=calls.length;assert.equal((await offline.download(sample)).downloaded,0);assert.equal(calls.length,before);assert.equal((await offline.getBlob(audio.assetSource(sample[0]))).size,160);assert.equal(calls.length,before);
 audio.prepare([sample[0]]);await new Promise(resolve=>setImmediate(resolve));assert.equal(await audio.play(sample[0]),true);audio.stop();audio.clearPrepared();
 await assert.rejects(offline.getBlob('https://kotoba-audio.union-raid.workers.dev/v1/audio/g/0/old'),/잘못/);
 await assert.rejects(offline.getBlob('https://evil.test/pronunciation/N5/id.mp3'),/잘못/);
 const more=words.filter(w=>w.level==='N4').slice(0,10);const partial=await offline.download(more,p=>{if(p.done>=8)offline.stop()});assert(partial.paused);assert.equal(offline.active(),false);assert.equal((await offline.download(more)).failed,0);assert.equal((await offline.status(words)).stored,18);
 storeDisabled=true;const other=words.filter(w=>w.level==='N3').slice(0,6);const full=await offline.download(other);assert(full.quotaError);assert(full.paused);storeDisabled=false;assert.equal((await offline.download(other)).downloaded,6);
 const failedWord=words.find(w=>w.level==='N2');bad=true;const failed=await offline.download([failedWord]);assert.equal(failed.failed,1);assert.equal(store.has(audio.assetSource(failedWord)),false,'HTML must not poison persistent cache');bad=false;
 const corrupt=audio.assetSource(sample[0]);store.set(corrupt,new Response('<html>cached 404</html>',{headers:{'content-type':'text/html'}}));const requests=calls.length;assert.equal((await offline.getBlob(corrupt)).type,'audio/mpeg');assert.equal(calls.length,requests+1,'Corrupt cached clip must be deleted and replaced');
 assert(words.every(w=>audio.assetSource(w)?.startsWith('https://mu0767.github.io/japanese/pronunciation/')));
 console.log('PASS: retired-cache purge without progress mutation; MP3-only allowlist; persisted playback; level download; pause/resume; quota stop; reject HTML/signatures and repair poisoned cache');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
