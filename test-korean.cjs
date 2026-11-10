const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({});
for(const file of ['data.js','core.js','kanji-data.js','korean-kengdic.js','korean-data.js','kanji.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const words=vm.runInContext('WORDS',context),meanings=vm.runInContext('KOREAN_BY_ID',context),details=context.KanjiDetails;
assert.equal(words.length,7811);assert.equal(Object.keys(meanings).length,words.length);
const provenance={...JSON.parse(fs.readFileSync('korean-kengdic-provenance.json','utf8')),...JSON.parse(fs.readFileSync('korean-provenance.json','utf8'))};
for(const w of words){
  const meaning=details.korean(w);
  assert.equal(typeof meaning,'string',`${w.id} ${w.word}: no Korean meaning`);
  assert(/\p{Script=Hangul}/u.test(meaning),`${w.id}: not a Korean gloss`);
  assert(!/어간의 하나|좆같|^낼$|^머$/.test(meaning),`${w.id}: unrelated dictionary fragment or unsuitable learning gloss`);
  assert(!/한국어 뜻 (미등록|확인 필요)/.test(details.render(w)));
  assert.equal(provenance[w.id].reading,w.reading);assert.equal(provenance[w.id].word,w.word);
  assert.equal(provenance[w.id].meaning,meaning);assert(provenance[w.id].source&&provenance[w.id].url);
}
const get=(word,reading)=>words.find(w=>w.word===word&&w.reading===reading);
assert.match(details.korean(get('大切','たいせつ')),/소중|중요/);
assert.match(details.korean(get('散歩','さんぽ')),/산[보책]/);
assert.match(details.korean(get('辛い','からい')),/맵/);assert.match(details.korean(get('辛い','つらい')),/괴롭|고통|쓰라/);
assert.equal(details.korean('辛い'),null);assert.notEqual(details.korean(get('方','かた')),details.korean(get('方','ほう')));
for(const level of ['N5','N4','N3','N2','N1']){
  const pool=words.filter(w=>w.level===level);
  for(const w of pool)for(const mode of ['meaning','listening']){const q=context.Kotoba.question(w,pool,mode,details.korean);assert.equal(q.options.length,4,`${w.word} ${mode}`);assert.equal(new Set(q.options).size,4);assert(q.options.includes(details.korean(w)));assert(q.options.every(x=>/\p{Script=Hangul}/u.test(x)));assert.deepEqual(q.options.map((_,i)=>details.korean(q.optionWords[i])),q.options);assert.equal(q.answer,details.korean(w))}
  console.log(`PASS ${level}: ${pool.length}/${pool.length} Korean meanings and question options`);
}
for(const [word,reading,expected]of [['インキ','インキ',/잉크/],['オイル','オイル',/오일|기름/],['はし','はし',/젓가락/],['致す','いたす',/하다/],['払う','はらう',/지불|납입/],['嫌らしい','いやらしい',/불쾌|추잡/]])assert.match(details.korean(get(word,reading)),expected);
assert(!details.render(get('大切','たいせつ')).includes('word-meaning'),'Keep latest upstream removal of duplicate word gloss');
console.log('PASS: 7,811 meaning quiz and 7,811 listening-meaning tests, Korean-only choices, one answer each; existing word IDs unchanged');
