(function(root){
'use strict';
// Prefer native-speaker recordings; all 7,811 words also have a stored first-party
// Japanese WAV file, independent of the device's TTS language packs.
// Browser Japanese speech synthesis remains the final emergency fallback.
// Source attribution: AUDIO-SOURCES.md
const KANJI='https://media.kanjialive.com/examples_audio/audio-mp3/';
const WANI='https://raw.githubusercontent.com/tofugu/japanese-vocabulary-pronunciation-audio/master/lib/mp3/';
const ARCHIVE='https://kotoba-audio.union-raid.workers.dev/v1/audio/';
let archiveGroups=null;
function archiveSource(word){
 if(!word?.id||typeof WORDS==='undefined'||typeof KOTOBA_AUDIO_RECORDINGS==='undefined')return null;
 if(!archiveGroups){
  archiveGroups=new Map();
  const counts={g:0,n:0};
  for(const w of WORDS){
   const prefix=Object.hasOwn(KOTOBA_AUDIO_RECORDINGS,w.id)?'n':'g';
   const group=Math.floor(counts[prefix]++/12);
   archiveGroups.set(w.id,prefix+'/'+group+'/'+encodeURIComponent(w.id));
  }
 }
 const path=archiveGroups.get(word.id);
 return path?ARCHIVE+path:null;
}
let active=null,speaking=null,request=0,watchdog=null;
const prepared=new Map();
const MAX_PREPARED=12;
const PLAYBACK_RATE=1.1;
function prepare(words){
 if(typeof root.Audio!=='function')return 0;
 let count=0;
 for(const word of words||[]){
  const url=archiveSource(word);
  if(!url||prepared.has(word.id))continue;
  try{
   const audio=new root.Audio(url);
   audio.preload='auto';
   audio.playbackRate=PLAYBACK_RATE;
   // Download and decode while the user reads the question, BEFORE tapping an option.
   if(typeof audio.load==='function')audio.load();
   prepared.set(word.id,{audio,url});
   count++;
   while(prepared.size>MAX_PREPARED){
    const oldest=prepared.keys().next().value;
    if(prepared.get(oldest)?.audio===active)break;
    prepared.delete(oldest);
   }
  }catch{}
 }
 return count;
}
function sources(word){
 if(!word||!word.id||!word.word||!word.reading||typeof KOTOBA_AUDIO_RECORDINGS==='undefined')return [];
 const data=Object.hasOwn(KOTOBA_AUDIO_RECORDINGS,word.id)?KOTOBA_AUDIO_RECORDINGS[word.id]:null;
 if(!data)return [];
 const result=[];
 if(data[0])result.push(KANJI+encodeURIComponent(data[0]));
 if(data[1])result.push(WANI+encodeURIComponent(word.word+'【'+word.reading+'】.mp3'));
 return result;
}
function readingText(word){
 // Never ask the speech engine to guess a kanji reading from its spelling.
 // Convert katakana to hiragana to avoid non-Japanese voice heuristics.
 return String(word?.reading||word?.word||'').trim().replace(/[ァ-ヶ]/g,
  c=>String.fromCharCode(c.charCodeAt(0)-96));
}
function japaneseVoice(synth){
 if(typeof synth.getVoices!=='function')return null;
 const voices=synth.getVoices()||[];
 return voices.find(v=>/^ja(?:[-_]|$)/i.test(v.lang||''))||null;
}
function clearWatchdog(){
 if(watchdog!==null){root.clearTimeout(watchdog);watchdog=null}
}
function stop(){
 request++;
 clearWatchdog();
 if(active){
  const old=active;active=null;old.onerror=null;
  try{old.pause()}catch{}
 }
 if(speaking){
  speaking.onstart=null;speaking.onerror=null;speaking.onend=null;speaking=null;
  try{root.speechSynthesis?.cancel()}catch{}
 }
}
function play(word,options={}){
 const {silent=false,notify=()=>{}}=options;
 stop();
 // The archived server is consistently available and avoids slow third-party hops.
 // Keep native recordings as secondary sources, then device TTS as final fallback.
 const token=request,urls=[archiveSource(word),...sources(word)].filter(Boolean);
 let resolved=false,next=0;
 return new Promise(resolve=>{
  const finish=value=>{if(!resolved){resolved=true;resolve(value)}};
  const fail=message=>{if(token===request&&!silent)notify(message);finish(false)};
  function synthesize(){
   if(token!==request){finish(false);return}
   const text=readingText(word);
   const synth=root.speechSynthesis,Utterance=root.SpeechSynthesisUtterance;
   if(!text||!synth||typeof synth.speak!=='function'||typeof Utterance!=='function'){
    fail('일본어 음성을 재생할 수 없습니다. 브라우저의 일본어 음성 지원을 확인해주세요.');
    return;
   }
   let utterance;
   try{
    utterance=new Utterance(text);
    utterance.lang='ja-JP';
    utterance.rate=1.08;
    const voice=japaneseVoice(synth);
    if(voice)utterance.voice=voice;
    speaking=utterance;
    utterance.onstart=()=>{
     if(token!==request||speaking!==utterance)return;
     clearWatchdog();finish(true);
    };
    utterance.onend=()=>{
     if(speaking!==utterance)return;
     speaking=null;clearWatchdog();
     // Some engines report end without start for a blocked/failed utterance.
     if(!resolved)fail('일본어 음성 재생이 완료되지 않았습니다. 일본어 음성팩을 확인해주세요.');
    };
    utterance.onerror=()=>{
     if(speaking!==utterance)return;
     speaking=null;clearWatchdog();
     fail('일본어 음성 재생에 실패했습니다. 기기의 일본어 음성팩과 음량을 확인해주세요.');
    };
    synth.speak(utterance);
    watchdog=root.setTimeout(()=>{
     if(token!==request||speaking!==utterance||resolved)return;
     try{synth.cancel()}catch{}
     speaking=null;
     fail('일본어 음성 엔진이 응답하지 않습니다. 일본어 음성팩을 확인해주세요.');
    },7000);
   }catch{
    speaking=null;
    fail('일본어 음성 합성을 시작하지 못했습니다. 브라우저의 음성 설정을 확인해주세요.');
   }
  }
  function attempt(){
   if(token!==request){finish(false);return}
   clearWatchdog();
   const url=urls[next++];
   if(!url||typeof root.Audio!=='function'){active=null;synthesize();return}
   let audio;
   try{
    const cached=prepared.get(word?.id);
    audio=cached?.url===url?cached.audio:new root.Audio(url);
   }catch{attempt();return}
   active=audio;
   audio.preload='auto';
   audio.playbackRate=PLAYBACK_RATE;
   if(typeof audio.readyState==='number'&&audio.readyState>=1){
    try{audio.currentTime=0}catch{}
   }
   audio.onended=()=>{if(active===audio)active=null};
   audio.onerror=()=>{if(active!==audio)return;active=null;attempt()};
   const failed=()=>{
    if(active!==audio||token!==request){finish(false);return}
    active=null;
    try{audio.pause()}catch{}
    attempt();
   };
   try{
    const promise=audio.play();
    watchdog=root.setTimeout(()=>{
     if(active===audio&&token===request&&!resolved)failed();
    },url.startsWith(ARCHIVE)?3200:2500);
    if(promise&&typeof promise.then==='function'){
     promise.then(()=>{
      if(active!==audio||token!==request){finish(false);return}
      clearWatchdog();finish(true);
     }).catch(failed);
    }else{clearWatchdog();finish(true)}
   }catch{failed()}
  }
  if(!readingText(word)){fail('읽기 데이터가 없어 발음을 생성할 수 없습니다.');return}
  attempt();
 });
}
root.KotobaAudio={
 sources,archiveSource,prepare,play,stop,readingText,japaneseVoice,
 hasRecording:word=>sources(word).length>0
};
if(typeof module!=='undefined'&&module.exports)module.exports=root.KotobaAudio;
})(typeof window!=='undefined'?window:globalThis);
