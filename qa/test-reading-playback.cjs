// Regression suite for all 7,811 vocabulary bindings and preferred audio routes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({setTimeout,clearTimeout,setInterval,clearInterval,URL,Blob,
 location:{href:'https://mu0767.github.io/japanese/'}});
for(const f of ['data.js','audio-data.js','audio.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const words=vm.runInContext('WORDS',ctx),audio=ctx.KotobaAudio;
assert.equal(words.length,7811);
const sources=new Set();
for(const w of words){
 assert.equal(audio.readingText(w),w.reading.normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)));
 const src=audio.assetSource(w);
 assert(src&&src.includes('/'+w.level+'/'+w.id+'.mp3'));
 assert(!sources.has(src));sources.add(src);
 assert.equal(audio.assetSource({...w,reading:w.reading+'あ'}),null);
}
const audioPlayed=[],spoken=[],voices=[{lang:'ja-JP'}];
ctx.Audio=class{
 constructor(src){this.src=src;this.readyState=2}
 play(){audioPlayed.push(this.src);return Promise.resolve()}
 pause(){}
};
ctx.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
ctx.speechSynthesis={getVoices:()=>voices,addEventListener(){},removeEventListener(){},
 speak(u){spoken.push(u);queueMicrotask(()=>u.onstart?.())},cancel(){}};
(async()=>{
 // Exercise the real selection path for every vocabulary entry (not only URL generation).
 for(const word of words){
  const beforeAudio=audioPlayed.length,beforeSpeech=spoken.length;
  assert.equal(await audio.play(word),true,'Playback dispatch failed for '+word.id);
  const original=audio.sources(word).find(src=>src.includes('raw.githubusercontent.com/tofugu/'));
  if(original){
   assert.equal(audioPlayed.length,beforeAudio+1,'Exact human recording skipped for '+word.id);
   assert.equal(audioPlayed.at(-1),original,'Incorrect human recording for '+word.id);
   assert.equal(spoken.length,beforeSpeech,'TTS incorrectly superseded native audio for '+word.id);
  }else{
   assert.equal(spoken.length,beforeSpeech+1,'Japanese TTS not dispatched for '+word.id);
   assert.equal(spoken.at(-1).text,audio.readingText(word),'Wrong TTS reading for '+word.id);
   assert.equal(spoken.at(-1).lang,'ja-JP');
  }
 }
 console.log('PASS: dispatched all 7811 vocabulary audio routes.');
 const native=words.find(w=>audio.sources(w).some(s=>s.includes('raw.githubusercontent.com/tofugu/')));
 const synthesized=words.find(w=>!audio.sources(w).some(s=>s.includes('raw.githubusercontent.com/tofugu/')));
 assert(native&&synthesized);
 assert.equal(await audio.play(native),true);
 assert(audioPlayed.at(-1).includes('raw.githubusercontent.com/tofugu/'),'Exact original recording must win');
 assert.equal(spoken.length,0);
 assert.equal(await audio.play(synthesized),true);
 assert.equal(spoken.length,1,'Japanese TTS must precede synthesized MP3');
 assert.equal(spoken[0].text,audio.readingText(synthesized));
 assert.equal(spoken[0].lang,'ja-JP');
 assert.equal(spoken[0].voice.lang,'ja-JP');
 assert.equal(await audio.play({...synthesized,word:'different'}),true);
 assert.equal(spoken.at(-1).text,audio.readingText(synthesized),'Playback cannot derive a pronunciation from kanji');
 // If the device lacks Japanese speech, the verified MP3 remains accessible.
 voices.length=0;
 assert.equal(await audio.play(synthesized),true);
 assert(audioPlayed.at(-1).includes('/pronunciation/'));
 const seven=words.find(w=>w.word==='七'&&w.reading==='しち');
 assert(seven);
 voices.push({lang:'ja-JP'});
 assert.equal(await audio.play(seven),true);
 assert.equal(spoken.at(-1).text,'しち');
 console.log('PASS: 7811 precise audio IDs; native recording before TTS; dictionary reading TTS before MP3; no kanji guessing; Japanese voice fallback.');
})().catch(e=>{console.error(e);process.exitCode=1});