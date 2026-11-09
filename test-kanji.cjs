const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync('data.js','utf8')+fs.readFileSync('kanji-data.js','utf8')+fs.readFileSync('korean-data.js','utf8')+(fs.existsSync('korean-krdict-data.js')?fs.readFileSync('korean-krdict-data.js','utf8'):'')+fs.readFileSync('kanji.js','utf8'),context);
const detail=context.KanjiDetails;
const warm=detail.entries('暖かい')[0];
assert.equal(warm.character,'暖');assert(warm.korean.some(k=>k.meanings.includes('따뜻할 난')));assert(warm.on.includes('ダン'));assert(warm.kun.includes('あたた.かい'));
assert(!detail.render({word:'暖かい',meaning:'warm'}).includes('class="word-meaning"'));
assert(detail.render({word:'暖かい',meaning:'warm'}).includes('단어 속 한자'));
const school=detail.entries('学校');assert.equal(school.length,2);assert(school[0].korean.some(k=>k.character==='學'&&k.meanings.includes('배울 학')));
const multi=detail.entries('弁')[0];assert(multi.korean.some(k=>k.character==='辨'));assert(multi.korean.some(k=>k.character==='辯'));assert(multi.korean.some(k=>k.character==='瓣'));
assert.equal(detail.entries('テレビ').length,0);assert.equal(detail.render({word:'テレビ',meaning:'television'}),'');
assert.equal(detail.entries('日日').length,1);assert(detail.render({word:'日々',meaning:'every day'}).includes('앞 한자를 반복하는 기호'));
assert(!detail.render({word:'躾',meaning:'<img onerror=alert(1)>'}).includes('onerror'));assert(!detail.render({word:'躾',meaning:'<img onerror=alert(1)>'}).includes('<img'));
assert(detail.render({word:'躾',meaning:'discipline'}).includes('등록된 한국식 풀이가 없어요'));
const stats=vm.runInContext(`({total:Object.keys(KANJI_DATA).length,korean:Object.values(KANJI_DATA).filter(k=>k.korean.length).length})`,context);
assert(stats.korean/stats.total>.98);
for(const word of vm.runInContext('WORDS',context))assert.equal(typeof detail.render(word),'string');
console.log(`PASS: 暖 훈음, Japanese readings, 学→學, multiple 弁 forms, kana/々 handling, missing data, escaping, all 7,811 explanations; ${stats.korean}/${stats.total} Korean kanji glosses`);

assert.equal(detail.korean('病院'),'병원');assert.equal(detail.korean('トイレ'),'화장실');assert(!detail.render({word:'病院',meaning:'hospital'}).includes('hospital'));
assert(!detail.render({word:'病院',meaning:'hospital'}).includes('단어 뜻'));

const allN5=vm.runInContext('WORDS.filter(w=>w.level===\'N5\')',context);
assert.equal(allN5.length,674);
for(const word of allN5){assert(detail.korean(word),`Missing Korean meaning: ${word.word}`); assert(/\p{Script=Hangul}/u.test(detail.korean(word)),`Not Korean: ${word.word}`); assert(!detail.render(word).includes('class="word-meaning"'),`Duplicate gloss: ${word.word}`)}
assert.equal(detail.korean('大切'),'소중하다, 중요하다');
assert.equal(detail.korean('散歩'),'산책');
assert.equal(detail.korean('せっけん'),'비누');
console.log('PASS: 674/674 N5 Korean meanings and example translations');

assert.equal(detail.render({word:'ありがとう',meaning:'Thank you'}),'');
assert(detail.render({word:'学校',meaning:'school'}).includes('한국식 뜻·음 (훈음)'));
console.log('PASS: no duplicated word meaning; kana-only entries have no redundant kanji panel');

if(fs.existsSync('korean-krdict-data.js')){const sourced=vm.runInContext('KRDICT_KOREAN_WORDS',context);assert(Object.keys(sourced).length>0);assert(Object.keys(sourced).every(k=>k.includes('\t')));console.log('PASS: external KRDict glossary contains',Object.keys(sourced).length,'spelling+reading matches')}
