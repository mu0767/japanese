'use strict';
const assert=require('node:assert/strict');
const P=require('./progress.js');
const browserEvents=new EventTarget();globalThis.addEventListener=browserEvents.addEventListener.bind(browserEvents);globalThis.removeEventListener=browserEvents.removeEventListener.bind(browserEvents);
const Cloud=require('./cloud-sync.js');
class Memory{constructor(){this.m=new Map}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const rooms=new Map, requests=[];
let before=null, networkError=false;
async function mockFetch(url,options){
 assert.equal(url,Cloud.apiUrl);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
 assert(!url.includes('Bearer'));requests.push({method:options.method,url});
 if(networkError)throw new Error('secret from adapter '+options.headers.Authorization);
 const key=options.headers.Authorization.slice(7);if(before)await before(options,key);
 let room=rooms.get(key);
 if(options.method==='POST'){
  const incoming=JSON.parse(options.body);
  if(!room){const mem=new Memory;mem.setItem(P.keys.meta,JSON.stringify({version:2,deviceId:incoming.sourceDeviceId,components:incoming.components}));room={store:P.createStore(mem),version:0};rooms.set(key,room)}
  else room.store.importData(options.body);
  room.version++;
 }
 return new Response(JSON.stringify({version:room?.version||0,progress:room?JSON.parse(room.store.exportData()):null}),{status:200});
}
function device(id){const storage=new Memory;const store=P.createStore(storage,{makeId:()=>id});store.load();let changes=0;const client=Cloud.createClient({store,storage,fetchImpl:mockFetch,onChange:()=>changes++});return {storage,store,client,changes:()=>changes}}
(async()=>{
 const key='A'.repeat(43),other='B'.repeat(43);
 const a=device('device-a'),b=device('device-b');
 a.client.start();await wait(20);assert.equal(requests.length,0,'start must not create a room');
 a.store.record('n5-warm',true,'2026-11-09');await a.client.connect(key);
 assert.equal(rooms.get(key).store.load().total,1);
 b.store.record('n5-hat',false,'2026-11-09');await b.client.connect(key);
 assert.equal(b.store.load().total,2);assert.equal(b.store.load().correct,1);
 await a.client.sync();assert.equal(a.store.load().total,2);
 const posts=requests.filter(x=>x.method==='POST').length;
 await a.client.sync();assert.equal(requests.filter(x=>x.method==='POST').length,posts,'unchanged data should skip POST');
 assert(!a.store.exportData().includes(key),'backup must never include connection key');
 assert(a.client.link().endsWith('#records?connect='+key));
 const saved=JSON.parse(a.storage.getItem(Cloud.settingsKey));assert.equal(saved.key,key);
 // A new answer while POST is in flight must remain locally and reach the room.
 a.store.record('n5-important',true,'2026-11-09');
 const gate=deferred(),entered=deferred();before=async o=>{if(o.method==='POST'){entered.resolve();await gate.promise}};
 const updating=a.client.sync();await entered.promise;
 a.store.record('n5-new',false,'2026-11-09');a.client.schedule();gate.resolve();await updating;before=null;
 assert.equal(a.store.load().total,4);await wait(400);assert.equal(rooms.get(key).store.load().total,4);
 // Network errors leave both local progress and the connection intact; sensitive errors are replaced.
 networkError=true;a.store.record('n5-offline',true,'2026-11-09');
 await assert.rejects(a.client.sync(),e=>!e.message.includes(key)&&!e.message.includes('Bearer'));
 assert.equal(a.store.load().total,5);assert(a.client.status().connected);networkError=false;
 await a.client.sync();assert.equal(rooms.get(key).store.load().total,5);
 // Ignore old room responses even if a mock transport does not implement AbortSignal.
 const stalled=deferred(),stalledEntered=deferred();before=async(o,k)=>{if(k===key&&o.method==='GET'){stalledEntered.resolve();await stalled.promise}};
 const old=a.client.sync();await stalledEntered.promise;
 await a.client.connect(other);const afterSwitch=a.store.exportData();
 rooms.get(key).store.record('n5-stale-room',false,'2026-11-09');stalled.resolve();await old;before=null;
 assert.equal(a.store.load().total,5);assert(!a.store.exportData().includes('n5-stale-room'));
 a.client.disconnect();assert.equal(a.storage.getItem(Cloud.settingsKey),null);assert.equal(a.store.load().total,5);assert(!a.client.status().connected);
 assert.equal(afterSwitch.includes(key),false);
 // Another tab changing/removing shared settings cancels an in-flight old-room GET.
 const tabGate=deferred(),tabEntered=deferred();before=async(o,k)=>{if(k===key&&o.method==='GET'){tabEntered.resolve();await tabGate.promise}};
 const tabOld=b.client.sync();await tabEntered.promise;
 b.storage.setItem(Cloud.settingsKey,JSON.stringify({version:1,key:other}));
 const settingsEvent=new Event('storage');Object.defineProperties(settingsEvent,{key:{value:Cloud.settingsKey},storageArea:{value:b.storage}});browserEvents.dispatchEvent(settingsEvent);
 assert(b.client.link().endsWith(other));tabGate.resolve();await tabOld;before=null;
 assert(!b.store.exportData().includes('n5-stale-room'),'late old-room response must not import after another tab joins');
 b.storage.removeItem(Cloud.settingsKey);browserEvents.dispatchEvent(settingsEvent);assert(!b.client.status().connected);
 // Resume only a saved connection, and stop/start must not keep removed settings.
 b.client.stop();b.storage.removeItem(Cloud.settingsKey);b.client.start();assert(!b.client.status().connected);
 await assert.rejects(b.client.connect('bad'));
 assert.throws(()=>Cloud.createClient({store:b.store,storage:b.storage,fetchImpl:mockFetch,apiUrl:'https://elsewhere.invalid'}));
 const c=device('device-c');await c.client.connect();assert(Cloud.keyValid(JSON.parse(c.storage.getItem(Cloud.settingsKey)).key));
 for(const d of [a,b,c])d.client.dispose();
 console.log('PASS: cloud client start/resume, two-device union, idempotency, offline retention, concurrent answers, stale room cancellation, endpoint confinement, key hygiene.');
})().catch(e=>{console.error(e);process.exitCode=1});
