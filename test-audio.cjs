const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({setTimeout,clearTimeout});
for(const filename of ['data.js','audio-data.js','audio.js'])
 vm.runInContext(fs.readFileSync(filename,'utf8'),ctx,{filename});
const words=vm.runInContext('WORDS',ctx),audio=ctx.KotobaAudio;
assert.equal(words.length,7811);
assert(words.every(w=>typeof w.reading==='string'&&w.reading.trim()),'Every word must have a readable pronunciation');
const available=words.filter(w=>audio.hasRecording(w)),missing=words.filter(w=>!audio.hasRecording(w));
assert.equal(available.length,4199,'Native audio coverage changed unexpectedly');
assert.equal(missing.length,3612);
const hashiru=words.find(w=>w.word==='走る'&&w.reading==='はしる');
const utau=words.find(w=>w.word==='歌う'&&w.reading==='うたう');
const zero=words.find(w=>w.word==='ゼロ'&&w.reading==='ゼロ');
for(const word of [hashiru,utau]){
 assert(word);
 const links=audio.sources(word);
 assert(links.length>=1);
 assert(links.every(u=>u.startsWith('https://')&&u.endsWith('.mp3')));
 assert(links.some(u=>u.includes('media.kanjialive.com')));
 assert(links.some(u=>u.includes('raw.githubusercontent.com')));
}
assert(zero&&!audio.hasRecording(zero));
assert.equal(audio.readingText(zero),'ぜろ');
let notifications=[],created=[],paused=[],spoken=[],cancelled=0;
ctx.Audio=class{
 constructor(url){this.src=url;created.push(url)}
 play(){return Promise.resolve()}
 pause(){paused.push(this.src)}
};
ctx.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
ctx.speechSynthesis={
 getVoices:()=>[{name:'English',lang:'en-US'},{name:'Japanese',lang:'ja-JP'}],
 speak(u){spoken.push(u);queueMicrotask(()=>u.onstart?.())},
 cancel(){cancelled++}
};
(async()=>{
 // Valid native recordings always take precedence over TTS.
 assert.equal(await audio.play(hashiru),true);
 assert.equal(created.length,1);
 assert(created[0].includes('sou-hashi(ru)_06_f.mp3'));
 assert.equal(await audio.play(utau),true);
 assert.equal(created.length,2);
 assert.equal(paused.length,1);
 assert.equal(spoken.length,0);

 // Unrecorded katakana options must never be silent.
 assert.equal(await audio.play(zero),true);
 assert.equal(spoken.at(-1).text,'ぜろ');
 assert.equal(spoken.at(-1).lang,'ja-JP');
 assert.equal(spoken.at(-1).voice.lang,'ja-JP');

 // A missing/blocked media source must cascade into Japanese speech synthesis.
 ctx.Audio=class{
 constructor(url){this.src=url}
 play(){return Promise.reject(new Error('HTTP 404'))}
 pause(){}
 };
 const before=spoken.length;
 assert.equal(await audio.play(hashiru),true);
 assert.equal(spoken.length,before+1);
 assert.equal(spoken.at(-1).text,'はしる');

 // Even when a device lists no Japanese voice, request ja-JP explicitly,
 // never choose a known English/Korean voice.
 ctx.speechSynthesis.getVoices=()=>[{name:'Korean',lang:'ko-KR'}];
 assert.equal(await audio.play(zero),true);
 assert.equal(spoken.at(-1).lang,'ja-JP');
 assert.equal(spoken.at(-1).voice,undefined);

 // End-to-end data coverage: all 3,612 native-audio gaps are eligible for TTS.
 // Exercise the actual play() method, not just a count of metadata entries.
 for(const word of missing){
  assert.equal(await audio.play(word,{silent:true}),true,word.word+' ('+word.reading+')');
  assert(audio.readingText(word).length>0);
 }
 assert(spoken.length>=missing.length);

 // If speech synthesis is not supported at all, inform the user instead of silence.
 ctx.speechSynthesis=null;
 const result=await audio.play(zero,{notify:x=>notifications.push(x)});
 assert.equal(result,false);
 assert.equal(notifications.length,1);
 assert.match(notifications[0],/음성/);
 audio.stop();
 console.log('PASS: 7,811/7,811 words have a pronunciation path; 4,199 native recordings; 3,612 synthesized fallbacks; Japanese voice, kana reading, failed MP3 recovery, visible errors, stopping');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
