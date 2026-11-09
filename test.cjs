const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const k=require('./core.js');const words=vm.runInNewContext(fs.readFileSync('data.js','utf8')+';WORDS');assert.equal(words.length,7811);assert.equal(new Set(words.map(w=>w.id)).size,words.length);
for(const level of ['N5','N4','N3','N2','N1']){const pool=words.filter(w=>w.level===level);assert(pool.length>500);for(const mode of ['reading','meaning'])for(const w of pool){let q=k.question(w,pool,mode);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert(q.options.includes(q.answer));assert.equal(q.optionWords.length,4);for(let i=0;i<4;i++)assert.equal(mode==='meaning'?q.optionWords[i].meaning:q.optionWords[i].reading,q.options[i]);assert.equal(q.options.filter(o=>k.normalize(o)===k.normalize(q.answer)).length,1)}}
assert.equal(k.normalize('ガク セイ'),'がくせい');let state={total:0,correct:0,days:{},words:{}};k.record(state,words[0],false,'2026-11-08');assert(state.words[words[0].id].missed);k.record(state,words[0],true,'2026-11-08');assert(!state.words[words[0].id].missed);assert.equal(state.total,2);assert.equal(state.correct,1);assert.equal(state.days['2026-11-08'],2);console.log('PASS: all 7,811 entries, 15,622 question sets, grading and review persistence');

// Default study pool includes only unseen and currently missed words; all mode reopens learned words.
const [unseen,wrong,learned,wrongAgain]=words.slice(100,104);
const progress={words:{[wrong.id]:{right:0,wrong:1,missed:true},[learned.id]:{right:1,wrong:0,missed:false},[wrongAgain.id]:{right:2,wrong:1,missed:true}}};
assert.deepEqual(k.studyPool([unseen,wrong,learned,wrongAgain],progress).map(w=>w.id),[unseen.id,wrong.id,wrongAgain.id]);
assert.equal(k.studyPool([unseen,wrong,learned,wrongAgain],progress,'all').length,4);
k.record(progress,wrongAgain,true,'2026-11-09');
assert.deepEqual(k.studyPool([unseen,wrong,learned,wrongAgain],progress).map(w=>w.id),[unseen.id,wrong.id]);
console.log('PASS: default excludes learned words; missed words remain until answered correctly');
