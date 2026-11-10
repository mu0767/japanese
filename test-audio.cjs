const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({setTimeout,clearTimeout,setInterval,clearInterval,URL,Blob,location:{href:'https://mu0767.github.io/japanese/'}});
for(const file of ['data.js','audio-data.js','audio.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
const words=vm.runInContext('WORDS',ctx),audio=ctx.KotobaAudio;
const seven=words.find(w=>w.word==='七'&&w.reading==='しち'),zero=words.find(w=>w.word==='ゼロ');
assert(seven&&zero);assert.equal(words.length,7811);
const urls=new Set();
for(const word of words){const expected='https://mu0767.github.io/japanese/pronunciation/'+word.level+'/'+word.id+'.mp3';assert.equal(audio.assetSource(word),expected);assert.equal(audio.archiveSource(word),expected);urls.add(expected);assert(audio.readingText(word))}
assert.equal(urls.size,7811);assert.equal(audio.readingText(seven),'しち');assert.equal(audio.readingText(zero),'ぜろ');
assert.equal(audio.assetSource({...seven,reading:'でぃ'}),null,'An ID must not silently select a clip for a different reading');
ctx.location.href='https://example.test/nested/site/index.html';assert.equal(audio.assetSource(seven),'https://example.test/nested/site/pronunciation/N5/'+seven.id+'.mp3');ctx.location.href='https://mu0767.github.io/japanese/';
let made=[],loaded=[],spoken=[],notifications=[],voices=[{lang:'ko-KR'},{lang:'ja-JP'}],events=new Map();
const goodBlob=()=>new Blob([new Uint8Array([0x49,0x44,0x33,...Array(157).fill(1)])],{type:'audio/mpeg'});
ctx.Audio=class{constructor(src){this.src=src;this.readyState=2;made.push(this)}load(){loaded.push(this.src)}play(){return Promise.resolve()}pause(){}};
ctx.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
ctx.speechSynthesis={getVoices:()=>voices,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name)},speak(u){spoken.push(u);queueMicrotask(()=>u.onstart?.())},cancel(){}};
(async()=>{
 for(const word of words){const before=made.length;assert.equal(await audio.play(word),true);assert.equal(made[before].src,audio.assetSource(word),'Every word must start at its own verified MP3')}
 assert.equal(spoken.length,0);made=[];
 assert.equal(audio.prepare([seven,zero,...words.slice(0,2)]),4);assert.equal(loaded.length,4);
 const before=made.length;assert.equal(await audio.play(seven),true);assert.equal(made.length,before);assert.equal(made[0].playbackRate,1.0);
 audio.stop();audio.clearPrepared();
 let revoked=[];class LocalURL extends URL{};LocalURL.createObjectURL=()=> 'blob:verified-mp3';LocalURL.revokeObjectURL=url=>revoked.push(url);ctx.URL=LocalURL;
 ctx.fetch=async()=>({ok:true,blob:async()=>goodBlob()});made=[];audio.prepare([seven]);await new Promise(resolve=>setImmediate(resolve));assert.equal(made[0].src,'blob:verified-mp3');assert.equal(await audio.play(seven),true);assert.equal(made.length,1);audio.stop();audio.clearPrepared();assert.deepEqual(revoked,['blob:verified-mp3']);delete ctx.fetch;ctx.URL=URL;
 await assert.rejects(audio.validateBlob(new Blob(['<html>not audio</html>'.repeat(3)],{type:'text/html'})),/content type/);
 await assert.rejects(audio.validateBlob(new Blob([new Uint8Array(160)],{type:'audio/mpeg'})),/signature/);
 await audio.validateBlob(goodBlob());
 const wani=words.find(w=>audio.sources(w).some(url=>url.includes('raw.githubusercontent.com/tofugu/')));
 made=[];ctx.Audio=class{constructor(src){this.src=src;made.push(src)}play(){return this.src.includes('/pronunciation/')?Promise.reject(Error('404')):Promise.resolve()}pause(){}};
 assert.equal(await audio.play(wani),true);assert.equal(made.length,2);assert(made[0].includes('/pronunciation/'));assert(made[1].includes('raw.githubusercontent.com/tofugu/'));assert(!made.some(url=>/kotoba-audio|kanjialive/.test(url)));
 ctx.Audio=class{constructor(src){this.src=src}play(){return Promise.reject(Error('offline'))}pause(){}};
 assert.equal(await audio.play(seven),true);assert.equal(spoken.at(-1).text,'しち');assert.equal(spoken.at(-1).lang,'ja-JP');assert.equal(spoken.at(-1).voice.lang,'ja-JP');
 const count=spoken.length;voices=[{lang:'ko-KR'}];assert.equal(await audio.play(seven,{notify:x=>notifications.push(x)}),false);assert.equal(spoken.length,count,'Missing Japanese voice must never use the Korean/default engine');assert.equal(notifications.length,1);
 voices=[];const delayed=audio.play(zero);setTimeout(()=>{voices=[{lang:'ja_JP'}];events.get('voiceschanged')?.()},15);assert.equal(await delayed,true);assert.equal(spoken.at(-1).voice.lang,'ja_JP');assert.equal(spoken.at(-1).text,'ぜろ');
 voices=[];const canceled=audio.play(seven);await new Promise(resolve=>setImmediate(resolve));audio.stop();assert.equal(await canceled,false);voices=[{lang:'ja-JP'}];events.get('voiceschanged')?.();assert.equal(events.size,0);
 let resolveOld;ctx.Audio=class{constructor(src){this.src=src}play(){return this.src.includes(seven.id)?new Promise(resolve=>resolveOld=resolve):Promise.resolve()}pause(){}};
 const old=audio.play(seven),latest=audio.play(zero);assert.equal(await old,false);assert.equal(await latest,true);resolveOld();audio.stop();
 console.log('PASS: all 7,811 MP3 bindings; しち/ゼロ; preload+Blob reuse; MIME/signature rejection; exact Wani backup; no retired Melo/character fallback; Japanese voice loading; Korean voice refusal; cancellation races');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
