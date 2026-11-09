const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({});
for(const filename of ['data.js','audio-data.js','audio.js'])vm.runInContext(fs.readFileSync(filename,'utf8'),ctx,{filename});
const words=vm.runInContext('WORDS',ctx),audio=ctx.KotobaAudio;
assert.equal(words.length,7811);
const available=words.filter(w=>audio.hasRecording(w));
assert.equal(available.length,4199,'Native audio coverage changed unexpectedly');
const hashiru=words.find(w=>w.word==='走る'&&w.reading==='はしる');
const utau=words.find(w=>w.word==='歌う'&&w.reading==='うたう');
for(const word of [hashiru,utau]){
 assert(word);
 const links=audio.sources(word);
 assert(links.length>=1,'No recording for '+word.word);
 assert(links.every(u=>u.startsWith('https://')&&u.endsWith('.mp3')));
 assert(links.some(u=>u.includes('media.kanjialive.com')));
 assert(links.some(u=>u.includes('raw.githubusercontent.com')));
}
const missing=words.find(w=>!audio.hasRecording(w));
assert.equal(audio.sources(missing).length,0);
let notifications=[],created=[],paused=[];
ctx.Audio=class{
 constructor(url){this.src=url;created.push(url)}
 play(){return Promise.resolve()}
 pause(){paused.push(this.src)}
};
(async()=>{
 assert.equal(await audio.play(hashiru),true);
 assert.equal(created.length,1);
 assert(created[0].includes('sou-hashi(ru)_06_f.mp3'));
 assert.equal(await audio.play(utau),true);
 assert.equal(created.length,2);
 assert.equal(paused.length,1);
 assert.equal(await audio.play(missing,{silent:false,notify:x=>notifications.push(x)}),false);
 assert.equal(notifications.length,1);
 assert.equal(created.length,2,'Missing recording must NEVER fallback to synthetic browser voice');
 audio.stop();
 console.log('PASS: 4,199/7,811 verified native Japanese recordings, 走る, 歌う, audio switching, silent missing source, no browser TTS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
