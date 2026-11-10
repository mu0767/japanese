// Exhaustive structural/phonetic audit. This does not claim human listening.
// node qa/audit-pronunciation.cjs [--verify-native] [--require-assets]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),requireAssets=process.argv.includes('--require-assets'),verifyNative=process.argv.includes('--verify-native');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8'),sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const words=vm.runInNewContext(read('data.js')+';WORDS');
const recordings=vm.runInNewContext(read('audio-data.js')+';KOTOBA_AUDIO_RECORDINGS');
const core=require('../core.js');
const kana=s=>String(s).normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const katakana=s=>kana(s).replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96));
const ids=new Map(words.map(w=>[w.id,w])),errors=[];
function problem(scope,id,detail){errors.push({scope,id,detail})}
const levels=Object.fromEntries(['N5','N4','N3','N2','N1'].map(level=>[level,words.filter(w=>w.level===level)]));
const report={version:1,generatedAt:new Date().toISOString(),scope:{words:words.length,levels:Object.fromEntries(Object.entries(levels).map(([l,w])=>[l,w.length])),humanListening:'not performed; this report verifies data, routing, phonemes and files only'},inputs:{dataSha256:sha(read('data.js')),recordingIndexSha256:sha(read('audio-data.js'))},readings:{checked:0,invalid:0,shorterThanThreeKana:0},quizBindings:{questionSets:0,options:0,mismatches:0},nativeRecordings:{indexed:Object.keys(recordings).length,waniIndexed:0,kanjiIndexed:0,waniExactSourceAudit:'not requested'},assets:{status:'pending',expected:words.length,present:0,manifestChecked:0,missing:0,bytes:0},reportedWord:words.filter(w=>w.word==='七'&&w.reading==='しち').map(w=>({id:w.id,word:w.word,reading:w.reading,nativeIndexPresent:Object.hasOwn(recordings,w.id),expectedPhonemes:['sh','i','ch','i']}))};
if(words.length!==7811||ids.size!==words.length)problem('dataset',null,'Expected 7,811 unique vocabulary IDs');
const counts={N5:674,N4:630,N3:1659,N2:1778,N1:3070};
for(const [level,count]of Object.entries(counts))if(levels[level].length!==count)problem('dataset',level,'Unexpected level count');
for(const word of words){
 report.readings.checked++;
 if(!/^N[1-5]-[a-f0-9]{10}$/.test(word.id)||!Object.hasOwn(counts,word.level))problem('dataset',word.id,'Unsafe audio path ID or unknown level');
 const reading=kana(word.reading);
 if(!reading||reading!==reading.trim()||!/^[ぁ-ゖー・、。]+$/u.test(reading)){report.readings.invalid++;problem('reading',word.id,'Reading is empty or contains unsupported non-kana input')}
 if(reading.length<3)report.readings.shorterThanThreeKana++;
 const q=core.question(word,levels[word.level],'reading');report.quizBindings.questionSets++;
 if(q.word.id!==word.id||q.answer!==word.reading||q.options.length!==4||q.options.length!==q.optionWords.length||!q.optionWords.some(w=>w.id===word.id)||new Set(q.options.map(core.normalize)).size!==4)problem('quiz',word.id,'Question/answer source mismatch or duplicate/missing choices');
 for(let i=0;i<q.options.length;i++){
  report.quizBindings.options++;const choice=q.optionWords[i],source=ids.get(choice?.id);
  if(!source||q.options[i]!==choice.reading||choice.word!==source.word||choice.reading!==source.reading){report.quizBindings.mismatches++;problem('quiz',word.id,'Selected audio source is not the displayed option reading')}
 }
 const entry=recordings[word.id];if(entry){
  if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||![0,1].includes(entry[1]))problem('native-index',word.id,'Unexpected recording entry');
  if(entry[0]){report.nativeRecordings.kanjiIndexed++;if(!/^[^/\\]+\.mp3$/.test(entry[0]))problem('native-index',word.id,'Invalid Kanji alive filename')}
  if(entry[1])report.nativeRecordings.waniIndexed++;
 }
}
for(const id of Object.keys(recordings))if(!ids.has(id))problem('native-index',id,'Recording refers to a missing vocabulary entry');
// Ensure the runtime handlers select the exact source object, including post-grade replay.
const app=read('app.js');
if(!app.includes('speak(s.q.optionWords[index])')||!app.includes('speak(s.q.optionWords[i])'))problem('runtime',null,'Choice playback no longer uses its exact optionWords object');
function phonemes(values){return values.filter(p=>!['sil','pau'].includes(p)).map(p=>p==='I'?'i':p==='U'?'u':p)}
function equivalent(actual,expected){
 const a=phonemes(actual),e=phonemes(expected);if(JSON.stringify(a)===JSON.stringify(e))return true;
 // Japanese dictionary phonology may realize written ei/ou as long ee/oo.
 for(let i=1;i<e.length;i++){if(e[i-1]==='e'&&e[i]==='i')e[i]='e';else if(e[i-1]==='o'&&e[i]==='u')e[i]='o'}
 return JSON.stringify(a)===JSON.stringify(e);
}
const manifestPath=path.join(ROOT,'pronunciation/manifest.json');
let manifest=null;
if(fs.existsSync(manifestPath)){
 try{manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))}catch{problem('manifest',null,'Invalid manifest JSON')}
 if(manifest){
  report.assets.manifestSha256=sha(fs.readFileSync(manifestPath));report.assets.engine=manifest.engine;
  if(manifest.version!==2||manifest.totalWords!==words.length||!Array.isArray(manifest.items)||manifest.items.length!==words.length)problem('manifest',null,'Expected v2 manifest for every vocabulary entry');
  const seen=new Set();
  for(const item of manifest.items||[]){
   const word=ids.get(item.id);if(!word||seen.has(item.id)){problem('manifest',item.id,'Unknown or duplicate entry');continue}seen.add(item.id);report.assets.manifestChecked++;
   const expectedPath='pronunciation/'+word.level+'/'+word.id+'.mp3',input=katakana(word.reading)+'。';
   if(item.word!==word.word||item.reading!==word.reading||item.path!==expectedPath||item.input!==input||item.inputSha256!==sha(input))problem('manifest',item.id,'Audio provenance does not match its exact vocabulary and kana input');
   if(!Array.isArray(item.phonemes)||!item.phonemes.length||!Array.isArray(item.expectedPhonemes)||!equivalent(item.phonemes,item.expectedPhonemes))problem('phonemes',item.id,'Generated phoneme sequence differs from kana expectation');
   if(word.word==='七'&&word.reading==='しち'&&JSON.stringify(phonemes(item.phonemes||[]))!==JSON.stringify(['sh','i','ch','i']))problem('phonemes',item.id,'七（しち） must contain sh i ch i');
   if(!(item.durationSeconds>0.08&&item.durationSeconds<30)||!(item.rms>0)||!(item.peak>0&&item.peak<=1))problem('signal',item.id,'Missing or invalid duration/audio signal metrics');
   const filename=path.join(ROOT,expectedPath);if(!fs.existsSync(filename))continue;
   const bytes=fs.readFileSync(filename);if(item.sha256!==sha(bytes)||item.bytes!==bytes.length)problem('asset',item.id,'MP3 hash or length differs from manifest');
  }
 }
}
for(const word of words){
 const file=path.join(ROOT,'pronunciation',word.level,word.id+'.mp3');
 if(!fs.existsSync(file)){report.assets.missing++;continue}
 report.assets.present++;const bytes=fs.readFileSync(file);report.assets.bytes+=bytes.length;
 if(bytes.length<1800||bytes.length>500000)problem('asset',word.id,'Suspicious MP3 length');
 if(bytes.subarray(0,3).toString()!=='ID3'&&!((bytes[0]===255)&&(bytes[1]&224)===224))problem('asset',word.id,'File does not begin with an MP3 header');
}
report.assets.status=manifest&&report.assets.present===words.length&&report.assets.manifestChecked===words.length?'audited':'pending';
if(requireAssets&&report.assets.status!=='audited')problem('assets',null,'Complete generated assets and provenance manifest are required');
(async()=>{
 if(verifyNative){
  const url='https://api.github.com/repos/tofugu/japanese-vocabulary-pronunciation-audio/git/trees/master?recursive=1';
  const response=await fetch(url);if(!response.ok)throw Error('Native source tree request failed: '+response.status);
  const tree=await response.json();if(tree.truncated)throw Error('Native source tree was truncated');
  const files=new Set(tree.tree.filter(x=>x.type==='blob').map(x=>x.path));let checked=0,missing=0;
  for(const word of words)if(recordings[word.id]?.[1]){checked++;if(!files.has('lib/mp3/'+word.word+'【'+word.reading+'】.mp3')){missing++;problem('native-source',word.id,'Advertised WaniKani word+reading file does not exist')}}
  report.nativeRecordings.waniExactSourceAudit={source:url,treeSha:tree.sha,checked,missing};
  report.nativeRecordings.sevenEvidence={shichi:files.has('lib/mp3/七【しち】.mp3'),nana:files.has('lib/mp3/七【なな】.mp3'),note:'Different readings must not be substituted.'};
 }
 report.errors={count:errors.length,details:errors.slice(0,100)};
 fs.writeFileSync(path.join(ROOT,'qa/pronunciation-audit.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({words:report.scope.words,levels:report.scope.levels,readings:report.readings,quizBindings:report.quizBindings,nativeRecordings:report.nativeRecordings,assets:report.assets,reportedWord:report.reportedWord,errors:report.errors.count,humanListening:report.scope.humanListening},null,2));
 if(errors.length)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1});
