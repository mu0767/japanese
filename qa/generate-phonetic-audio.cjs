// Build: node qa/generate-phonetic-audio.cjs [--sample]. Every MP3 is tied to
// its kana, actual HTS phoneme labels, PCM statistics and SHA-256.
// Open JTalk / NAIST / NIT ATR503 M001: https://open-jtalk.sourceforge.net/
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),crypto=require('node:crypto');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile),ROOT=path.resolve('pronunciation');
const VOICE=process.env.JTALK_VOICE||'/usr/share/hts-voice/nitech-jp-atr503-m001/nitech_jp_atr503_m001.htsvoice';
const DIC=process.env.JTALK_DICT||'/var/lib/mecab/dic/open-jtalk/naist-jdic';
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const normalizedReading=s=>String(s).normalize('NFKC').trim().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96));
// These nine greetings/expressions contain the written particle は, pronounced
// /wa/. Lexical 歯/葉/刃/派/特派/爆破 retain /ha/. Preserve every visible reading.
const spokenOverrides={'こんにちは':'コンニチワ','こんばんは':'コンバンワ','それでは':'ソレデワ','では':'デワ','または':'マタワ','あるいは':'アルイワ','じつは':'ジツワ','ひいては':'ヒイテワ','もしくは':'モシクワ'};
const synthesisReading=word=>spokenOverrides[word.reading]||normalizedReading(word.reading);
// Kana-to-phoneme facts, independent of the dictionary's word segmentation.
const mora=new Map();
for(const [kana,phones] of [
 ['アイウエオ','a i u e o'],['カキクケコ','ka ki ku ke ko'],['ガギグゲゴ','ga gi gu ge go'],
 ['サシスセソ','sa shi su se so'],['ザジズゼゾ','za ji zu ze zo'],['タチツテト','ta chi tsu te to'],
 ['ダヂヅデド','da ji zu de do'],['ナニヌネノ','na ni nu ne no'],['ハヒフヘホ','ha hi fu he ho'],
 ['バビブベボ','ba bi bu be bo'],['パピプペポ','pa pi pu pe po'],['マミムメモ','ma mi mu me mo'],
 ['ヤユヨ','ya yu yo'],['ラリルレロ','ra ri ru re ro'],['ワヲンッ','wa o N cl']
]){const tokens=phones.split(' ');[...kana].forEach((k,i)=>{const p=tokens[i];mora.set(k,p==='N'||p==='cl'?[p]:p.match(/^(.*?)([aiueo])$/).slice(1).filter(Boolean))})}
for(const [stem,consonant] of [['キ','ky'],['ギ','gy'],['シ','sh'],['ジ','j'],['チ','ch'],['ニ','ny'],['ヒ','hy'],['ビ','by'],['ピ','py'],['ミ','my'],['リ','ry']])for(const [small,vowel]of[['ャ','a'],['ュ','u'],['ョ','o'],['ェ','e']])mora.set(stem+small,[consonant,vowel]);
for(const [kana,phones]of Object.entries({'ウェ':['w','e'],'ウィ':['w','i'],'ウォ':['w','o'],'ティ':['t','i'],'ディ':['d','i'],'トゥ':['t','u'],'ドゥ':['d','u'],'ファ':['f','a'],'フィ':['f','i'],'フェ':['f','e'],'フォ':['f','o'],'ヴ':['v','u'],'ァ':['a'],'ィ':['i'],'ゥ':['u'],'ェ':['e'],'ォ':['o']}))mora.set(kana,phones);
function expectedPhonemes(reading){const text=normalizedReading(reading),out=[];for(let i=0;i<text.length;){if(text[i]==='ー'){if(!/^[aiueo]$/.test(out.at(-1)||''))throw Error('Long vowel without vowel');out.push(out.at(-1));i++;continue}const pair=text.slice(i,i+2),key=mora.has(pair)?pair:text[i],phones=mora.get(key);if(!phones)throw Error('Unsupported reading mora: '+key);out.push(...phones);i+=key.length}return out}
function canonicalPhones(phones){const out=phones.map(p=>/^[AIUEO]$/.test(p)?p.toLowerCase():p).filter(p=>!['sil','pau'].includes(p));for(let i=1;i<out.length;i++)if(out[i-1]==='e'&&out[i]==='i')out[i]='e';else if(out[i-1]==='o'&&out[i]==='u')out[i]='o';return out}
function tracePhonemes(trace){
 const match=trace.match(/\[Output label\]([\s\S]*?)(?=\r?\n\[[^\]]+\]|$)/);if(!match)throw Error('Open JTalk trace has no output labels');
 const labels=match[1].split(/\r?\n/).map(line=>line.match(/(?:^|\s)[^\s^]+\^[^\s-]+-([^+\s]+)\+[^\s]+/)).filter(Boolean).map(m=>m[1]);
 const speech=labels.filter(p=>!['sil','pau'].includes(p));if(!speech.length||speech.some(p=>!/^([a-z]+|[AIUEON])$/.test(p)))throw Error('Invalid or empty HTS phoneme labels');return speech;
}
function pcmInfo(wav){
 if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('Invalid WAV header');let format=null,data=null;
 for(let offset=12;offset+8<=wav.length;){const tag=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);if(offset+8+size>wav.length)throw Error('Truncated WAV chunk');if(tag==='fmt ')format=wav.subarray(offset+8,offset+8+size);if(tag==='data')data=wav.subarray(offset+8,offset+8+size);offset+=8+size+(size%2)}
 if(!format||!data||format.readUInt16LE(0)!==1||format.readUInt16LE(14)!==16)throw Error('Expected PCM16 WAV');
 const channels=format.readUInt16LE(2),sampleRate=format.readUInt32LE(4),samples=data.length/2;let squares=0,peak=0;for(let i=0;i<data.length;i+=2){const value=data.readInt16LE(i);squares+=value*value;peak=Math.max(peak,Math.abs(value))}
 const durationSeconds=samples/channels/sampleRate,rms=Math.sqrt(squares/samples)/32768;
 if(!Number.isFinite(durationSeconds)||durationSeconds<0.1||durationSeconds>20||peak<100||rms<0.0001)throw Error('Silent or invalid PCM audio');
 return {durationSeconds:+durationSeconds.toFixed(5),rms:+rms.toFixed(7),peak:+(peak/32768).toFixed(7),sampleRate,channels};
}
async function main(){
 const words=vm.runInNewContext(fs.readFileSync('data.js','utf8')+';WORDS'),sample=process.argv.includes('--sample');
 const samples=new Set(['七','絵','胃','料理','階段','歌う','ゼロ','歯','葉','を']),target=sample?words.filter(w=>samples.has(w.word)||w.reading.length===1||Object.hasOwn(spokenOverrides,w.reading)):words;
 if(!fs.existsSync(path.join(DIC,'sys.dic'))||!fs.existsSync(VOICE))throw Error('Missing Open JTalk dictionary/voice');
 for(const w of words){if(!/^N[1-5]-[a-f\d]+$/.test(w.id)||!/^N[1-5]$/.test(w.level))throw Error('Invalid vocabulary ID');expectedPhonemes(w.reading)}
 fs.mkdirSync(ROOT,{recursive:true});let cursor=0,processed=0,bytes=0;const failures=[],items=[];
 const concurrency=Math.max(1,Math.min(8,Number(process.env.AUDIO_CONCURRENCY)||4)),options={timeout:30000,maxBuffer:4*1024*1024,windowsHide:true};
 async function worker(){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kotoba-speech-')),input=path.join(tmp,'input.txt'),wav=path.join(tmp,'word.wav'),trace=path.join(tmp,'trace.txt');
  try{while(cursor<target.length){
   const word=target[cursor++],relativePath='pronunciation/'+word.level+'/'+word.id+'.mp3',output=path.resolve(relativePath);fs.mkdirSync(path.dirname(output),{recursive:true});
   try{
    // Katakana specifies phonetic input; standalone は/へ must not become particles.
    const text=synthesisReading(word)+'。';fs.writeFileSync(input,text,'utf8');
    await run('open_jtalk',['-x',DIC,'-m',VOICE,'-r','1.0','-ot',trace,'-ow',wav,input],options);
    const phonemes=tracePhonemes(fs.readFileSync(trace,'utf8')),expected=expectedPhonemes(synthesisReading(word));
    if(JSON.stringify(canonicalPhones(phonemes))!==JSON.stringify(canonicalPhones(expected)))throw Error('PHONEME_MISMATCH expected='+expected.join(' ')+' actual='+phonemes.join(' '));
    if(word.word==='七'&&word.reading==='しち'&&canonicalPhones(phonemes).join(' ')!=='sh i ch i')throw Error('Seven pronunciation regression');
    const pcm=pcmInfo(fs.readFileSync(wav));
    await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',wav,'-ar','22050','-ac','1','-codec:a','libmp3lame','-qscale:a','5',output],options);
    const probe=JSON.parse((await run('ffprobe',['-v','error','-select_streams','a:0','-show_entries','format=duration:stream=codec_name,sample_rate,channels','-of','json',output],options)).stdout);
    if(probe.streams?.[0]?.codec_name!=='mp3'||Number(probe.format?.duration)<0.1)throw Error('Invalid encoded MP3 stream');
    const encoded=fs.readFileSync(output);if(encoded.length<256||encoded.length>500000)throw Error('Invalid MP3 asset size');bytes+=encoded.length;
    items.push({id:word.id,word:word.word,reading:word.reading,input:text,...(spokenOverrides[word.reading]?{inputOverride:'The written particle は is pronounced wa in this expression; the visible vocabulary reading is retained.'}:{}),inputSha256:sha(text),path:relativePath,sha256:sha(encoded),bytes:encoded.length,phonemes,expectedPhonemes:expected,...pcm});
   }catch(err){failures.push({id:word.id,word:word.word,reading:word.reading,error:String(err.message||err).slice(0,400)});try{fs.unlinkSync(output)}catch{}}
   processed++;if(processed%200===0||processed===target.length)console.log('GENERATED_PROGRESS',JSON.stringify({processed,total:target.length,generated:items.length,failures:failures.length,bytes}));
  }}finally{fs.rmSync(tmp,{recursive:true,force:true})}
 }
 await Promise.all(Array.from({length:concurrency},worker));
 const report={totalWords:words.length,targets:target.length,generated:items.length,failures:failures.length,bytes,errors:failures};fs.writeFileSync(path.join(ROOT,sample?'sample-build-report.json':'build-report.json'),JSON.stringify(report,null,2)+'\n');console.log('PHONETIC_BUILD_RESULT',JSON.stringify(report));
 if(failures.length||items.length!==target.length){process.exitCode=1;return}
 const manifest={version:2,engine:'Open JTalk 1.11 / NIT ATR503 M001',voiceAttribution:'HTS Working Group / Nagoya Institute of Technology, NIT ATR503 M001 voice; see VOICE-LICENSE.txt',dictionary:'NAIST Japanese dictionary',source:'https://open-jtalk.sourceforge.net/',generatedAt:new Date().toISOString(),totalWords:words.length,total:items.length,voiceLicenseFile:'VOICE-LICENSE.txt',validation:'Exact kana-to-phoneme comparison (vowel devoicing and ei/ou long-vowel equivalence), PCM energy/duration, encoded MP3 stream, SHA-256. This is not human listening verification.',items:items.sort((a,b)=>a.id.localeCompare(b.id))};
 fs.writeFileSync(path.join(ROOT,sample?'sample-manifest.json':'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
module.exports={normalizedReading,synthesisReading,expectedPhonemes,canonicalPhones,tracePhonemes,pcmInfo};
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
