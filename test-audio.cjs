const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({setTimeout,clearTimeout});
for(const filename of ['data.js','audio-data.js','audio.js'])
 vm.runInContext(fs.readFileSync(filename,'utf8'),ctx,{filename});
const words=vm.runInContext('WORDS',ctx),audio=ctx.KotobaAudio;
assert.equal(words.length,7811);
assert.equal(new Set(words.map(w=>w.id)).size,7811);
assert(words.every(w=>typeof w.reading==='string'&&w.reading.trim()));
const recorded=words.filter(w=>audio.hasRecording(w));
const missing=words.filter(w=>!audio.hasRecording(w));
assert.equal(recorded.length,4199);
assert.equal(missing.length,3612);
const hashiru=words.find(w=>w.word==='走る'&&w.reading==='はしる');
const utau=words.find(w=>w.word==='歌う'&&w.reading==='うたう');
const zero=words.find(w=>w.word==='ゼロ'&&w.reading==='ゼロ');
assert(hashiru&&utau&&zero);
const groups={g:0,n:0},archives=new Set();
for(const word of words){
 const prefix=audio.hasRecording(word)?'n':'g';
 const group=Math.floor(groups[prefix]++/12);
 const expected='https://kotoba-audio.union-raid.workers.dev/v1/audio/'+prefix+'/'+group+'/'+word.id;
 assert.equal(audio.archiveSource(word),expected,'Archive mapping changed: '+word.word);
 archives.add(expected);
}
assert.equal(groups.g,3612);
assert.equal(groups.n,4199);
assert.equal(archives.size,7811);
assert.equal(audio.readingText(zero),'ぜろ');
let made=[],loaded=[],spoken=[],notifications=[];
ctx.Audio=class{
 constructor(url){this.src=url;this.readyState=2;made.push(this)}
 load(){loaded.push(this.src)}
 play(){return Promise.resolve()}
 pause(){}
};
ctx.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
ctx.speechSynthesis={
 getVoices:()=>[{lang:'ko-KR'},{lang:'ja-JP'}],
 speak(u){spoken.push(u);queueMicrotask(()=>u.onstart?.())},
 cancel(){}
};
(async()=>{
 // Prepare four (or more) options before the user taps; loaded Audio elements are reused.
 const options=[zero,hashiru,utau,missing[0]];
 assert.equal(audio.prepare(options),4);
 assert.equal(loaded.length,4);
 assert(loaded.every(url=>url.includes('kotoba-audio.union-raid.workers.dev')));
 const before=made.length;
 assert.equal(await audio.play(zero),true);
 assert.equal(made.length,before,'Click must reuse the already-preloaded audio element');
 assert.equal(made.at(-1).playbackRate,1.1,'Playback rate should be faster');
 assert.equal(spoken.length,0,'Preloaded recorded audio must not use device TTS');
 audio.clearPrepared();
 // On mobile Safari preloading may be ignored: explicit fetch -> Blob URL is used.
 ctx.fetch=async()=>({ok:true,blob:async()=>({size:123,type:'audio/wav'})});
 let revoked=[];
 ctx.URL={createObjectURL:()=> 'blob:cached-japanese-wav',revokeObjectURL:url=>revoked.push(url)};
 made=[];
 const blobWord=missing.find(w=>w.id!==zero.id);
 assert.equal(audio.prepare([blobWord]),1);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(made.length,1,'Blob-backed audio element should be created after fetch');
 assert.equal(made[0].src,'blob:cached-japanese-wav');
 assert.equal(await audio.play(blobWord),true);
 assert.equal(made.length,1,'Tap should reuse in-memory Blob instead of requesting the server again');
 audio.stop();
 audio.clearPrepared();
 assert.deepEqual(revoked,['blob:cached-japanese-wav']);
 delete ctx.fetch;
 delete ctx.URL;
 // Playback starts with own faster server, not two slow third-party lookups.
 made=[];
 assert.equal(await audio.play(hashiru),true);
 assert.equal(made.length,1);
 assert.match(made[0].src,/kotoba-audio.union-raid.workers.dev/);

 // If first-party server is unavailable, fall back to verified original recording.
 audio.clearPrepared();
 made=[];
 ctx.Audio=class{
  constructor(url){this.src=url;made.push(url)}
  play(){return this.src.includes('kotoba-audio.')?Promise.reject(new Error('HTTP 404')):Promise.resolve()}
  pause(){}
 };
 assert.equal(await audio.play(hashiru),true);
 assert.equal(made.length,2,'Archive failure must immediately try original Kanji alive MP3');
 assert.match(made[0],/kotoba-audio/);
 assert.match(made[1],/media.kanjialive.com/);

 // If network audio is unavailable, Japanese TTS still works.
 audio.clearPrepared();
 ctx.Audio=class{constructor(url){this.src=url}play(){return Promise.reject(new Error('failed'))}pause(){}};
 assert.equal(await audio.play(zero),true);
 assert.equal(spoken.at(-1).text,'ぜろ');
 assert.equal(spoken.at(-1).lang,'ja-JP');
 assert.equal(spoken.at(-1).voice.lang,'ja-JP');
 assert.equal(spoken.at(-1).rate,1.08);

 // If no Japanese voice is advertised, only the explicit Japanese locale is used.
 ctx.speechSynthesis.getVoices=()=>[{lang:'ko-KR'}];
 assert.equal(await audio.play(utau),true);
 assert.equal(spoken.at(-1).text,'うたう');
 assert.equal(spoken.at(-1).lang,'ja-JP');
 assert.equal(spoken.at(-1).voice,undefined);

 // With neither network nor a voice engine the user sees a useful error.
 ctx.speechSynthesis=null;
 assert.equal(await audio.play(zero,{notify:x=>notifications.push(x)}),false);
 assert.equal(notifications.length,1);
 assert.match(notifications[0],/음성/);
 const app=fs.readFileSync('app.js','utf8');
 assert(app.includes("KotobaAudio.prepare(mode==='reading'?s.q.optionWords:[w])"));
 assert(app.includes('KotobaAudio.prepare(list.slice(page*30,page*30+3))'));
 audio.stop();
 console.log('PASS: 7,811 archived URLs; 4-choice audio preload, prepared player reuse, 1.1x speed, archive-first fallback, Japanese TTS and visible errors');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
