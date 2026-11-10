(function(root){
'use strict';
// The published, kana-derived MP3 is the only first-party playback source.
// Old MeloTTS WAVs must never re-enter playback through fallback or device cache.
const KANJI='https://media.kanjialive.com/examples_audio/audio-mp3/';
const WANI='https://raw.githubusercontent.com/tofugu/japanese-vocabulary-pronunciation-audio/master/lib/mp3/';
let wordIndex=null;
function assetSource(word){
 if(!word?.id||typeof WORDS==='undefined')return null;
 if(!wordIndex)wordIndex=new Map(WORDS.map(w=>[w.id,w]));
 const entry=wordIndex.get(word.id);
 if(!entry||entry.word!==word.word||entry.reading!==word.reading)return null;
 const relative='pronunciation/'+entry.level+'/'+encodeURIComponent(entry.id)+'.mp3';
 return new root.URL(relative,root.document?.baseURI||root.location?.href||'https://mu0767.github.io/japanese/').href;
}
// Retain the method used by existing UI callers, with the corrected source.
const archiveSource=assetSource;
let active=null,speaking=null,request=0,watchdog=null,pendingFinish=null,voiceWaitCancel=null;
const prepared=new Map(),MAX_PREPARED=12,PLAYBACK_RATE=1.0;
async function validateBlob(blob){
 if(!blob||typeof blob.arrayBuffer!=='function'||blob.size<32||blob.size>2000000)throw Error('Invalid MP3 size');
 const type=String(blob.type||'').toLowerCase().split(';')[0].trim();
 if(!['audio/mpeg','audio/mp3','application/octet-stream'].includes(type))throw Error('Invalid MP3 content type');
 const bytes=new Uint8Array(await blob.slice(0,12).arrayBuffer());
 const id3=bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33;
 const frame=bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0;
 if(!id3&&!frame)throw Error('Invalid MP3 signature');
 return blob;
}
function releasePrepared(entry){if(entry?.objectUrl)try{root.URL.revokeObjectURL(entry.objectUrl)}catch{}}
function primeElement(entry,url){const audio=new root.Audio(url);audio.preload='auto';audio.playbackRate=PLAYBACK_RATE;audio.load?.();entry.audio=audio}
function prepare(words){
 if(typeof root.Audio!=='function')return 0;
 let count=0;
 for(const word of words||[]){
  const url=assetSource(word);
  if(!url||prepared.has(word.id))continue;
  const id=word.id,entry={url,audio:null,objectUrl:null};prepared.set(id,entry);count++;
  if(typeof root.fetch==='function'&&typeof root.URL?.createObjectURL==='function'){
   const blobPromise=root.KotobaOfflineAudio?.getBlob?root.KotobaOfflineAudio.getBlob(url):root.fetch(url,{mode:'cors',cache:'force-cache'}).then(response=>{if(!response.ok)throw Error('Audio prefetch failed');return response.blob()}).then(validateBlob);
   Promise.resolve(blobPromise).then(blob=>{if(prepared.get(id)!==entry)return;entry.objectUrl=root.URL.createObjectURL(blob);primeElement(entry,entry.objectUrl)}).catch(()=>{if(prepared.get(id)===entry)try{primeElement(entry,url)}catch{}});
  }else try{primeElement(entry,url)}catch{prepared.delete(id);count--}
  while(prepared.size>MAX_PREPARED){const oldest=prepared.keys().next().value;if(prepared.get(oldest)?.audio===active)break;releasePrepared(prepared.get(oldest));prepared.delete(oldest)}
 }
 return count;
}
function sources(word){
 if(!word?.id||!word.word||!word.reading||typeof KOTOBA_AUDIO_RECORDINGS==='undefined')return [];
 const data=Object.hasOwn(KOTOBA_AUDIO_RECORDINGS,word.id)?KOTOBA_AUDIO_RECORDINGS[word.id]:null;
 if(!data)return [];
 const result=[];
 if(data[0])result.push(KANJI+encodeURIComponent(data[0]));
 if(data[1])result.push(WANI+encodeURIComponent(word.word+'【'+word.reading+'】.mp3'));
 return result;
}
function clearPrepared(){for(const entry of prepared.values())releasePrepared(entry);prepared.clear()}
function readingText(word){return String(word?.reading||'').normalize('NFKC').trim().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96))}
function japaneseVoice(synth){let voices=[];try{voices=typeof synth?.getVoices==='function'?synth.getVoices()||[]:[]}catch{return null}return voices.find(v=>/^ja(?:[-_]|$)/i.test(v.lang||''))||null}
function waitForJapaneseVoice(synth,token){
 const current=japaneseVoice(synth);if(current)return Promise.resolve(current);
 return new Promise(resolve=>{
  let finished=false,timer,poll;
  const finish=voice=>{if(finished)return;finished=true;root.clearTimeout(timer);root.clearInterval(poll);synth.removeEventListener?.('voiceschanged',check);if(voiceWaitCancel===cancel)voiceWaitCancel=null;resolve(voice)};
  const check=()=>{if(token!==request){finish(null);return}const voice=japaneseVoice(synth);if(voice)finish(voice)};
  const cancel=()=>finish(null);voiceWaitCancel=cancel;
  synth.addEventListener?.('voiceschanged',check);
  poll=root.setInterval(check,100);timer=root.setTimeout(()=>finish(null),1200);check();
 });
}
function clearWatchdog(){if(watchdog!==null){root.clearTimeout(watchdog);watchdog=null}}
function stop(){
 request++;clearWatchdog();voiceWaitCancel?.();voiceWaitCancel=null;pendingFinish?.(false);pendingFinish=null;
 if(active){const old=active;active=null;old.onerror=null;try{old.pause()}catch{}}
 if(speaking){speaking.onstart=null;speaking.onerror=null;speaking.onend=null;speaking=null;try{root.speechSynthesis?.cancel()}catch{}}
}
// Exact human recordings take precedence. Synthesized speech receives an
// explicit dictionary reading, never unverified kanji text.
const spokenOverrides=Object.freeze({'こんにちは':'こんにちわ','こんばんは':'こんばんわ','それでは':'それでわ','では':'でわ','または':'またわ','あるいは':'あるいわ','じつは':'じつわ','ひいては':'ひいてわ','もしくは':'もしくわ'});
function spokenText(word){const reading=readingText(word);return spokenOverrides[reading]||reading}
function play(word,options={}){
 const {silent=false,notify=()=>{}}=options;stop();
 const token=request,urls=[...sources(word).filter(u=>u.startsWith(WANI)),assetSource(word)].filter(Boolean);
 let resolved=false,next=0,ttsAttempted=false;
 return new Promise(resolve=>{
  const finish=value=>{if(!resolved){resolved=true;if(pendingFinish===finish)pendingFinish=null;resolve(value)}};
  pendingFinish=finish;
  const fail=message=>{if(token===request&&!silent)notify(message);finish(false)};
  async function synthesize(){
   ttsAttempted=true;
   if(token!==request){finish(false);return}
   const text=spokenText(word),synth=root.speechSynthesis,Utterance=root.SpeechSynthesisUtterance;
   if(!text||!synth||typeof synth.speak!=='function'||typeof Utterance!=='function'){attempt();return}
   const voice=await waitForJapaneseVoice(synth,token);
   if(token!==request){finish(false);return}
   if(!voice){attempt();return}
   try{
    const utterance=new Utterance(text);utterance.lang='ja-JP';utterance.voice=voice;utterance.rate=1.0;speaking=utterance;
    utterance.onstart=()=>{if(token===request&&speaking===utterance){clearWatchdog();finish(true)}};
    utterance.onend=()=>{if(speaking!==utterance)return;speaking=null;clearWatchdog();if(!resolved)attempt()};
    utterance.onerror=()=>{if(speaking!==utterance)return;speaking=null;clearWatchdog();if(!resolved)attempt()};
    watchdog=root.setTimeout(()=>{if(token!==request||speaking!==utterance||resolved)return;try{synth.cancel()}catch{}speaking=null;attempt()},3500);
    synth.speak(utterance);
   }catch{speaking=null;clearWatchdog();attempt()}
  }
  function attempt(){
   if(token!==request){finish(false);return}clearWatchdog();
   // After an exact native clip fails, try Japanese TTS before the generated MP3.
   if(next===1&&!ttsAttempted&&urls.length===2){synthesize();return}
   if(next===0&&!urls.some(u=>u.startsWith(WANI))&&!ttsAttempted){synthesize();return}
   const url=urls[next++];if(!url||typeof root.Audio!=='function'){active=null;fail('일본어 발음을 재생할 수 없습니다. 일본어 음성 설정 또는 인터넷 연결을 확인해주세요.');return}
   let audio;try{const cached=prepared.get(word?.id);audio=cached?.url===url&&cached.audio?cached.audio:new root.Audio(url)}catch{attempt();return}
   active=audio;audio.preload='auto';audio.playbackRate=PLAYBACK_RATE;if(typeof audio.readyState==='number'&&audio.readyState>=1)try{audio.currentTime=0}catch{}
   audio.onended=()=>{if(active===audio)active=null};
   const failed=()=>{if(active!==audio||token!==request){finish(false);return}active=null;audio.onerror=null;try{audio.pause()}catch{}attempt()};audio.onerror=failed;
   try{
    const promise=audio.play();watchdog=root.setTimeout(()=>{if(active===audio&&token===request&&!resolved)failed()},3200);
    if(promise&&typeof promise.then==='function')promise.then(()=>{if(active!==audio||token!==request){finish(false);return}clearWatchdog();finish(true)}).catch(failed);
    else{clearWatchdog();finish(true)}
   }catch{failed()}
  }
  if(!readingText(word)){fail('읽기 데이터가 없어 발음을 재생할 수 없습니다.');return}
  attempt();
 });
}

root.KotobaAudio={sources,assetSource,archiveSource,prepare,clearPrepared,play,stop,readingText,japaneseVoice,validateBlob,hasRecording:word=>sources(word).length>0};
if(typeof module!=='undefined'&&module.exports)module.exports=root.KotobaAudio;
})(typeof window!=='undefined'?window:globalThis);
