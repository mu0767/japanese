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
 const actual=audio.archiveSource(word);
 assert.equal(actual,expected,'Archive mapping changed: '+word.word);
 archives.add(actual);
}
assert.equal(groups.g,3612);
assert.equal(groups.n,4199);
assert.equal(archives.size,7811,'All entries must have independently accessible audio');
assert.equal(audio.readingText(zero),'ぜろ');
let made=[],spoken=[],notifications=[];
ctx.Audio=class{
 constructor(url){this.src=url;made.push(url)}
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
 // Licensed recordings are preferred. All 3,612 missing originals use first-party WAV.
 assert.equal(await audio.play(hashiru),true);
 assert.match(made.at(-1),/media.kanjialive.com/);
 assert.equal(await audio.play(zero),true);
 assert.match(made.at(-1),/kotoba-audio.union-raid.workers.dev/);
 assert.match(made.at(-1),/\/g\/7\/N5-434707d737$/);
 assert.equal(spoken.length,0,'First-party audio should avoid device TTS');

 // Native original endpoints can fail; next attempt must serve archived WAV.
 made=[];
 ctx.Audio=class{
  constructor(url){this.src=url;made.push(url)}
  play(){return this.src.includes('kotoba-audio.')?Promise.resolve():Promise.reject(new Error('HTTP 404'))}
  pause(){}
 };
 assert.equal(await audio.play(hashiru),true);
 assert.equal(made.length,3,'Kanji alive, WaniKani, then archive');
 assert(made.at(-1).includes('/v1/audio/n/'));
 assert.equal(spoken.length,0);

 // Even if all internet audio endpoints fail, Japanese reading TTS remains last.
 ctx.Audio=class{constructor(url){this.src=url}play(){return Promise.reject(new Error('failed'))}pause(){}};
 assert.equal(await audio.play(zero),true);
 assert.equal(spoken.at(-1).text,'ぜろ');
 assert.equal(spoken.at(-1).lang,'ja-JP');
 assert.equal(spoken.at(-1).voice.lang,'ja-JP');

 // No Japanese system voice: we still set ja-JP rather than selecting a wrong locale.
 ctx.speechSynthesis.getVoices=()=>[{lang:'ko-KR'}];
 assert.equal(await audio.play(utau),true);
 assert.equal(spoken.at(-1).text,'うたう');
 assert.equal(spoken.at(-1).lang,'ja-JP');
 assert.equal(spoken.at(-1).voice,undefined);

 // With neither internet nor any speech engine, there is an explicit error.
 ctx.speechSynthesis=null;
 assert.equal(await audio.play(zero,{notify:x=>notifications.push(x)}),false);
 assert.equal(notifications.length,1);
 assert.match(notifications[0],/음성/);
 audio.stop();
 console.log('PASS: 7,811/7,811 archive URLs; 651 groups; original MP3 > self-hosted WAV > Japanese TTS; errors surfaced');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
