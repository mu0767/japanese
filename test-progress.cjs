const assert=require('node:assert/strict'),Progress=require('./progress.js');
class MemoryStorage{
 constructor(initial={}){this.data=new Map(Object.entries(initial));this.writes=0;this.failAt=null}
 getItem(k){return this.data.has(k)?this.data.get(k):null}
 setItem(k,v){this.writes++;if(this.writes===this.failAt)throw Error('Quota exceeded');this.data.set(k,String(v))}
 removeItem(k){this.data.delete(k)}
 snapshot(){return [...this.data.entries()].sort(([a],[b])=>a.localeCompare(b))}
}
const day='2026-11-09',id='N5-ada066edfd',other='N5-second';
const original={total:3,correct:2,days:{[day]:3},words:{[id]:{right:1,wrong:1,missed:true},[other]:{right:1,wrong:0,missed:false}}};
const memory=new MemoryStorage({[Progress.keys.state]:JSON.stringify(original)}),store=Progress.createStore(memory,{makeId:()=> 'device-PC',now:()=>100});
assert.deepEqual(store.load(),original);assert.deepEqual(JSON.parse(memory.getItem(Progress.keys.state)),original);assert.equal(JSON.parse(store.exportData()).sourceDeviceId,'device-PC');
assert.equal(Progress.createStore(memory,{makeId:()=>{throw Error('Migration repeated')}}).load().total,3);
assert.deepEqual(store.summary(),{total:3,correct:2,incorrect:1,words:2,learned:1,missed:1,days:1,devices:1});

// Previewing a foreign export, including before first migration, must not write storage.
const phoneStorage=new MemoryStorage({[Progress.keys.state]:JSON.stringify({total:2,correct:2,days:{[day]:2},words:{[id]:{right:2,wrong:0,missed:false}}})});
const phone=Progress.createStore(phoneStorage,{makeId:()=> 'device-phone',now:()=>101}),phoneExport=phone.exportData();
const oldSnapshot=memory.snapshot(),writesBefore=memory.writes,preview=store.previewImport(phoneExport);assert.deepEqual(memory.snapshot(),oldSnapshot);assert.equal(memory.writes,writesBefore);assert.equal(preview.after.total,5);assert.equal(preview.added.total,2);assert.equal(preview.after.missed,1);assert(preview.warnings.length);
const emptyStorage=new MemoryStorage(),empty=Progress.createStore(emptyStorage,{makeId:()=> 'device-edge',now:()=>102});empty.previewImport(phoneExport);assert.equal(emptyStorage.writes,0);assert.equal(emptyStorage.data.size,0);

// Device components are summed once; old outcome conflict remains missed conservatively.
const result=store.importData(phoneExport);assert.equal(result.state.total,5);assert.equal(result.state.correct,4);assert.equal(result.state.words[id].right,3);assert.equal(result.state.words[id].wrong,1);assert.equal(result.state.words[id].missed,true);assert(store.hasBackup());
const beforeRepeat=memory.snapshot(),repeatWrites=memory.writes;assert(store.previewImport(phoneExport).alreadyIncluded);assert.equal(store.importData(phoneExport).state.total,5);assert.equal(memory.writes,repeatWrites);assert.deepEqual(memory.snapshot(),beforeRepeat);

// Exchanging a union back to its source does not duplicate already included history.
phone.importData(store.exportData());assert.equal(phone.load().total,5);store.importData(phone.exportData());assert.equal(store.load().total,5);
phone.record(id,true,day);assert.equal(phone.load().words[id].missed,false);store.importData(phone.exportData());assert.equal(store.load().total,6);assert.equal(store.load().correct,5);assert.equal(store.load().words[id].missed,false);
store.record(other,false,'2026-11-10');phone.importData(store.exportData());assert.equal(phone.load().total,7);assert.equal(phone.load().words[other].missed,true);
store.importData(phone.exportData());assert.equal(store.load().total,7);assert.equal(store.load().words[id].right,4);
assert.equal(JSON.parse(store.exportData()).sourceDeviceId,'device-PC','Import must not adopt the phone device identifier');

// Same timestamp is resolved deterministically, and new local answers after a merge win causally.
const edgeStorage=new MemoryStorage(),edge=Progress.createStore(edgeStorage,{makeId:()=> 'device-edge',now:()=>1});edge.importData(store.exportData());edge.record(id,false,day);assert.equal(edge.load().total,8);store.importData(edge.exportData());assert(store.load().words[id].missed);store.record(id,true,day);assert.equal(store.load().total,9);assert(!store.load().words[id].missed);

// A fresh store reads shared-storage changes rather than using stale tab aggregates.
const secondTab=Progress.createStore(memory,{now:()=>102});assert.equal(secondTab.load().total,9);secondTab.record(id,false,day);assert.equal(store.load().total,10);store.record(id,true,day);assert.equal(secondTab.load().total,11);

// Backup restores the complete pre-import metadata and old v1 aggregate.
const backupStorage=new MemoryStorage({[Progress.keys.state]:JSON.stringify(original)}),backupStore=Progress.createStore(backupStorage,{makeId:()=> 'device-backup',now:()=>500});backupStore.load();backupStore.importData(phoneExport);assert.equal(backupStore.load().total,5);assert.deepEqual(backupStore.restoreBackup(),original);assert.equal(backupStore.load().total,3);

// Reject malformed, oversized, unsafe and inconsistent files without modifying anything.
const valid=JSON.parse(phoneExport);
for(const text of ['no json',JSON.stringify(original),'x'.repeat(Progress.maxBytes+1),'{"format":"kotoba-progress","version":2,"exportedAt":0,"sourceDeviceId":"device-a","components":{"__proto__":{}}}']){const before=memory.snapshot();assert.throws(()=>store.previewImport(text));assert.throws(()=>store.importData(text));assert.deepEqual(memory.snapshot(),before)}
for(const mutate of [x=>x.version=99,x=>x.components['device-phone'].correct=99,x=>x.components['device-phone'].total=-1,x=>x.components['device-phone'].words[id].right=NaN,x=>x.components['device-phone'].words[id].last.correct='false',x=>x.components['device-phone'].words[id].last.at=-1,x=>x.components['device-phone'].days['2026-02-30']=1,x=>x.components['device-phone'].words.toString={right:1,wrong:0,last:{at:0,seq:0,correct:true}}]){const value=JSON.parse(phoneExport);mutate(value);const before=memory.snapshot();assert.throws(()=>store.importData(JSON.stringify(value)));assert.deepEqual(memory.snapshot(),before)}
const knownStore=Progress.createStore(new MemoryStorage(),{makeId:()=> 'known-device',knownWordIds:[other]});assert.throws(()=>knownStore.previewImport(phoneExport));

// Quota errors at every write step roll back both old v1 and v2 state.
for(const offset of [1,2,3]){const s=new MemoryStorage({[Progress.keys.state]:JSON.stringify(original)}),p=Progress.createStore(s,{makeId:()=> 'device-failure',now:()=>100});p.load();const before=s.snapshot();s.failAt=s.writes+offset;assert.throws(()=>p.importData(phoneExport),e=>e.code==='STORAGE_WRITE_FAILED'&&!e.rollbackFailed);assert.deepEqual(s.snapshot(),before)}
for(const offset of [1,2,3]){const s=new MemoryStorage({[Progress.keys.state]:JSON.stringify(original)}),p=Progress.createStore(s,{makeId:()=> 'device-existing-backup',now:()=>100});p.load();p.importData(phoneExport);const before=s.snapshot();s.failAt=s.writes+offset;assert.throws(()=>p.importData(edge.exportData()),e=>e.code==='STORAGE_WRITE_FAILED'&&!e.rollbackFailed);assert.deepEqual(s.snapshot(),before,'A failed second merge must retain its existing backup too')}
for(const offset of [1,2]){const s=new MemoryStorage({[Progress.keys.state]:JSON.stringify(original)}),p=Progress.createStore(s,{makeId:()=> 'device-record-failure',now:()=>100});p.load();const before=s.snapshot();s.failAt=s.writes+offset;assert.throws(()=>p.record(id,true,day),e=>e.code==='STORAGE_WRITE_FAILED');assert.deepEqual(s.snapshot(),before)}
const corruptStorage=new MemoryStorage({[Progress.keys.state]:'broken json'});assert.throws(()=>Progress.createStore(corruptStorage).load());assert.equal(corruptStorage.getItem(Progress.keys.state),'broken json');
assert.throws(()=>store.record(id,true,'2026-02-30'));assert.throws(()=>store.record(id,1,day));
console.log('PASS: legacy preservation, preview read-only, idempotent imports, round-trip union, later answers, old missed conflicts, shared-storage reload, backup restore, validation and rollback');
