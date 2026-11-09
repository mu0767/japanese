(function(root){
'use strict';
const API='https://union-raid-records.mu0767.chatgpt.site/api/kotoba-progress';
const SITE='https://mu0767.github.io/japanese/';
const SETTINGS='kotoba-cloud-sync-v1';
const KEY=/^[A-Za-z0-9_-]{43,128}$/;
const MAX_RESPONSE=2*1024*1024+8192;
const canonical=value=>value&&typeof value==='object'?(Array.isArray(value)?value.map(canonical):Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]))):value;
function same(a,b){return JSON.stringify(canonical(a.components))===JSON.stringify(canonical(b.components))}
function keyValid(key){return typeof key==='string'&&KEY.test(key)}
function newKey(){if(!root.crypto?.getRandomValues)throw new Error('이 브라우저에서 안전한 연결 정보를 만들 수 없습니다.');const bytes=root.crypto.getRandomValues(new Uint8Array(32));let binary='';for(const n of bytes)binary+=String.fromCharCode(n);return root.btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function createClient(options){
 const {store,storage,onChange=()=>{},onStatus=()=>{}}=options||{};
 if(!store||!storage)throw new Error('동기화에 필요한 기록 저장소가 없습니다.');
 if(options.apiUrl&&options.apiUrl!==API)throw new Error('지원하지 않는 동기화 서버입니다.');
 const fetcher=options.fetchImpl||root.fetch?.bind(root);if(typeof fetcher!=='function')throw new Error('동기화를 지원하지 않는 브라우저입니다.');
 let key=null,started=false,generation=0,run=null,timer=null,poll=null,retryDelay=5000,lastSyncedAt=null,error=null,attached=false;
 const listeners=new Set();
 const visible=()=>!root.document||root.document.visibilityState!=='hidden';
 function status(){return {connected:!!key,syncing:!!run,lastSyncedAt,error,offline:root.navigator?.onLine===false}}
 function emit(){const s=status();try{onStatus(s)}catch{}for(const f of listeners)try{f(s)}catch{}}
 function subscribe(fn){if(typeof fn!=='function')return ()=>{};listeners.add(fn);try{fn(status())}catch{}return ()=>listeners.delete(fn)}
 function clearTimer(){if(timer!==null){clearTimeout(timer);timer=null}}
 function safeError(code){const messages={401:'동기화 연결 정보가 유효하지 않습니다. 연결 링크를 확인해주세요.',403:'현재 사이트에서 동기화 서버에 연결할 수 없습니다.',413:'기록이 동기화 용량을 초과했습니다. 내보내기 파일을 보관해주세요.',429:'저장 요청이 많아 잠시 후 다시 연결합니다.'};const e=new Error(messages[code]||'동기화 서버에 연결하지 못했습니다. 이 기기의 기록은 보관되며 다시 연결되면 합칩니다.');e.safe=true;return e}
 const current=r=>{if(!started||key!==r.key||generation!==r.generation)return false;try{return JSON.parse(storage.getItem(SETTINGS)||'null')?.key===r.key}catch{return false}};
 function later(delay){if(!started||!key)return;clearTimer();timer=setTimeout(()=>{timer=null;if(visible())sync().catch(()=>{})},delay);timer.unref?.()}
 function schedule(delay=2000){if(!started||!key)return;if(run){run.again=true;return}later(delay)}
 function changed(state){try{onChange(state)}catch{}}
 function importRemote(progress){if(!progress)return;let preview;try{preview=store.previewImport(JSON.stringify(progress))}catch{throw new Error('서버의 기록 형식이 올바르지 않습니다. 이 기기의 기록은 변경하지 않았습니다.')}if(!preview.alreadyIncluded)changed(store.importData(JSON.stringify(progress)).state)}
 async function request(r,method,body){
  if(!current(r))throw safeError();
  const timeout=setTimeout(()=>r.controller.abort(),20000);timeout.unref?.();
  try{
   const response=await fetcher(API,{method,headers:{Authorization:'Bearer '+r.key,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body}:{}),mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',signal:r.controller.signal});
   if(!response.ok)throw safeError(response.status);
   const text=await response.text();if(text.length>MAX_RESPONSE)throw new Error('서버의 기록이 너무 큽니다. 이 기기의 기록은 보관했습니다.');
   let data;try{data=JSON.parse(text)}catch{throw safeError()}
   if(!data||!Number.isSafeInteger(data.version)||data.version<0||!Object.hasOwn(data,'progress')||method==='POST'&&!data.progress)throw safeError();
   return data;
  }finally{clearTimeout(timeout)}
 }
 function sync(){
  if(!started||!key)return Promise.resolve(status());
  if(run){run.again=true;return run.promise}
  clearTimer();const r={key,generation,again:false,controller:new AbortController(),promise:null};run=r;error=null;emit();
  r.promise=(async()=>{
   let remote=await request(r,'GET');if(!current(r))return status();
   importRemote(remote.progress);if(!current(r))return status();
   const local=store.exportData(),localDoc=JSON.parse(local);
   if(!remote.progress||!same(localDoc,remote.progress)){
    remote=await request(r,'POST',local);if(!current(r))return status();
    importRemote(remote.progress);if(!current(r))return status();
    if(!same(JSON.parse(store.exportData()),remote.progress))r.again=true;
   }
   lastSyncedAt=Date.now();error=null;retryDelay=5000;return status();
  })().catch(cause=>{
   if(!current(r))return status();
   error=cause&&typeof cause.message==='string'&&(cause.safe||['서버의 기록 형식이 올바르지 않습니다. 이 기기의 기록은 변경하지 않았습니다.','서버의 기록이 너무 큽니다. 이 기기의 기록은 보관했습니다.'].includes(cause.message))?cause.message:safeError().message;
   const out=new Error(error);out.code='SYNC_FAILED';r.retry=true;throw out;
  }).finally(()=>{
   if(run===r)run=null;
   if(current(r)){emit();if(r.retry){later(retryDelay);retryDelay=Math.min(retryDelay*2,60000)}else if(r.again)later(250)}
  });
  return r.promise;
 }
 function wake(){if(started&&key&&visible())schedule(0)}
 function storageChanged(event){if(!started||event.storageArea&&event.storageArea!==storage)return;if(event.key===SETTINGS||event.key===null){cancel();key=null;lastSyncedAt=null;error=null;retryDelay=5000;try{const value=JSON.parse(storage.getItem(SETTINGS)||'null');if(value?.version===1&&keyValid(value.key))key=value.key}catch{error='이 기기의 동기화 연결 정보를 읽지 못했습니다.'}emit();if(key)schedule(0)}else if(event.key==='kotoba-progress-v2'){try{changed(store.load())}catch{}schedule()}}
 function attach(){if(attached)return;attached=true;root.addEventListener?.('online',wake);root.addEventListener?.('focus',wake);root.addEventListener?.('pageshow',wake);root.addEventListener?.('storage',storageChanged);root.document?.addEventListener?.('visibilitychange',wake);poll=setInterval(()=>{if(visible())schedule(0)},30000);poll.unref?.()}
 function detach(){if(!attached)return;attached=false;root.removeEventListener?.('online',wake);root.removeEventListener?.('focus',wake);root.removeEventListener?.('pageshow',wake);root.removeEventListener?.('storage',storageChanged);root.document?.removeEventListener?.('visibilitychange',wake);if(poll!==null)clearInterval(poll);poll=null}
 function cancel(){generation++;clearTimer();const old=run;run=null;old?.controller.abort()}
 function start(){if(started)return status();started=true;key=null;error=null;try{const value=JSON.parse(storage.getItem(SETTINGS)||'null');if(value?.version===1&&keyValid(value.key))key=value.key}catch{error='이 기기의 동기화 연결 정보를 읽지 못했습니다.'}attach();if(key)schedule(0);emit();return status()}
 async function connect(candidate){const next=candidate===undefined?newKey():String(candidate).trim();if(!keyValid(next))throw new Error('코토바 연결 링크가 올바르지 않습니다.');try{storage.setItem(SETTINGS,JSON.stringify({version:1,key:next}))}catch{throw new Error('연결 정보를 저장하지 못했습니다. 브라우저의 사이트 데이터 설정을 확인해주세요.')}cancel();key=next;started=true;lastSyncedAt=null;error=null;retryDelay=5000;attach();emit();return sync()}
 function disconnect(){try{storage.removeItem(SETTINGS)}catch{throw new Error('연결 정보를 삭제하지 못했습니다. 사이트 데이터 설정을 확인해주세요.')}cancel();key=null;started=false;lastSyncedAt=null;error=null;detach();emit()}
 function stop(){cancel();started=false;detach();emit()}
 function link(){return key?SITE+'#records?connect='+encodeURIComponent(key):''}
 return {start,connect,sync,schedule,disconnect,status,link,subscribe,stop,dispose:stop};
}
const api={createClient,apiUrl:API,settingsKey:SETTINGS,keyValid};root.KotobaCloud=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
