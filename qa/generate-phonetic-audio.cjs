// Deterministic dictionary-reading audio. No generative model guesses the kana.
// Requires open-jtalk + NAIST Japanese dictionary + NIT ATR503 M001 HTS voice + ffmpeg.
// Reproducible build: node qa/generate-phonetic-audio.cjs [--sample] [--force]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const words=vm.runInNewContext(fs.readFileSync('data.js','utf8')+';WORDS');
const ROOT=path.resolve('pronunciation');
const VOICE=process.env.JTALK_VOICE||'/usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice';
const DIC=process.env.JTALK_DICT||'/var/lib/mecab/dic/open-jtalk/naist-jdic';
const force=process.argv.includes('--force'),sample=process.argv.includes('--sample');
const normalize=s=>String(s).normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const invalid=words.filter(w=>!w.id||!w.reading||!normalize(w.reading).trim()||!/^[ぁ-ゖー・、。ゔ]+$/u.test(normalize(w.reading)));
if(invalid.length){console.error('Invalid reading input',invalid.slice(0,30));process.exit(1)}
if(!fs.existsSync(DIC)||!fs.existsSync(VOICE))throw Error('Missing OpenJTalk dictionary/voice');
fs.mkdirSync(ROOT,{recursive:true});
const target=sample?words.filter(w=>['料理','階段','歌う','ゼロ'].includes(w.word)):words;
let cursor=0,done=0,skipped=0,failures=[],bytes=0;
const concurrent=sample?2:6;
async function worker(workerIndex){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kotoba-speech-'));
 const input=path.join(tmp,'input.txt'),wav=path.join(tmp,'word.wav');
 try{
  while(cursor<target.length){
   const word=target[cursor++],dir=path.join(ROOT,word.level),output=path.join(dir,word.id+'.mp3');
   if(!force&&fs.existsSync(output)&&fs.statSync(output).size>2000){skipped++;continue}
   fs.mkdirSync(dir,{recursive:true});
   try{
    const reading=normalize(word.reading);
    // Punctuation gives the engine a clear utterance boundary for short kana.
    fs.writeFileSync(input,reading+'。','utf8');
    execFileSync('open_jtalk',['-x',DIC,'-m',VOICE,'-r','1.07','-ow',wav,input],{stdio:'pipe',timeout:30000});
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',wav,
      '-ar','22050','-ac','1','-codec:a','libmp3lame','-qscale:a','7',output],{stdio:'pipe',timeout:30000});
    const stat=fs.statSync(output);
    if(stat.size<1800||stat.size>500000)throw Error('Suspicious MP3 size: '+stat.size);
    bytes+=stat.size;done++;
   }catch(err){
    failures.push({id:word.id,word:word.word,reading:word.reading,error:String(err?.message||err).slice(0,280)});
    try{fs.unlinkSync(output)}catch{}
   }
   if((done+skipped)%200===0)console.log('GENERATED_PROGRESS',JSON.stringify({processed:done+skipped,total:target.length,done,skipped,failures:failures.length,bytes}));
   await new Promise(resolve=>setImmediate(resolve));
  }
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
(async()=>{
 await Promise.all(Array.from({length:concurrent},(_,i)=>worker(i)));
 const report={totalWords:words.length,targets:target.length,generated:done,skipped,failures:failures.length,bytes,errors:failures.slice(0,100)};
 console.log('PHONETIC_BUILD_RESULT',JSON.stringify(report));
 if(failures.length||done+skipped!==target.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
