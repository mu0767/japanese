(function(root){
'use strict';
// Licensed native-speaker recordings, matched by BOTH exact spelling and reading.
// Source attribution and licenses: AUDIO-SOURCES.md
const KANJI='https://media.kanjialive.com/examples_audio/audio-mp3/';
const WANI='https://raw.githubusercontent.com/tofugu/japanese-vocabulary-pronunciation-audio/master/lib/mp3/';
let active=null,request=0;
function sources(word){
 if(!word||!word.id||!word.word||!word.reading||typeof KOTOBA_AUDIO_RECORDINGS==='undefined')return [];
 const data=Object.hasOwn(KOTOBA_AUDIO_RECORDINGS,word.id)?KOTOBA_AUDIO_RECORDINGS[word.id]:null;
 if(!data)return [];
 const result=[];
 if(data[0])result.push(KANJI+encodeURIComponent(data[0]));
 if(data[1])result.push(WANI+encodeURIComponent(word.word+'【'+word.reading+'】.mp3'));
 return result;
}
function stop(){
 request++;
 if(active){const old=active;active=null;old.onerror=null;try{old.pause()}catch{}}
}
function play(word,options={}){
 const {silent=false,notify=()=>{}}=options;
 stop();
 const token=request;
 const urls=sources(word);
 if(!urls.length){
  if(!silent)notify('이 단어는 아직 검증된 원어민 녹음 음원이 없습니다. 잘못된 TTS 발음은 재생하지 않습니다.');
  return Promise.resolve(false);
 }
 if(typeof root.Audio!=='function'){
  if(!silent)notify('이 브라우저에서 MP3 재생을 지원하지 않습니다.');
  return Promise.resolve(false);
 }
 return new Promise(resolve=>{
  let next=0,resolved=false;
  const finish=value=>{if(!resolved){resolved=true;resolve(value)}};
  function attempt(){
   if(token!==request){finish(false);return}
   const url=urls[next++];
   if(!url){
    active=null;
    if(!silent)notify('원어민 발음 음원을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
    finish(false);return;
   }
   const audio=new root.Audio(url);active=audio;
   audio.preload='auto';
   audio.onended=()=>{if(active===audio)active=null};
   audio.onerror=()=>{if(active===audio)attempt()};
   try{
    const promise=audio.play();
    if(promise&&typeof promise.then==='function')promise.then(()=>{if(token===request)finish(true);else finish(false)}).catch(error=>{
     if(active!==audio){finish(false);return}
     if(error&&error.name==='NotAllowedError'){
      if(!silent)notify('브라우저에서 자동 재생을 차단했습니다. 발음 듣기 버튼을 직접 눌러주세요.');
      finish(false);return;
     }
     attempt();
    });
    else finish(true);
   }catch{attempt()}
  }
  attempt();
 });
}
root.KotobaAudio={sources,play,stop,hasRecording:word=>sources(word).length>0};
if(typeof module!=='undefined'&&module.exports)module.exports=root.KotobaAudio;
})(typeof window!=='undefined'?window:globalThis);
