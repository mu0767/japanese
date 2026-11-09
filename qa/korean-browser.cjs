const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{localStorage.setItem('kotoba-v1',JSON.stringify({total:23,correct:17,days:{'2026-11-08':23},words:{'N5-ada066edfd':{right:2,wrong:1,missed:true}}}));window.__spoken=[];Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return []},speak(u){window.__spoken.push(u.text)}}})});
await page.goto(process.argv[2]||pathToFileURL(path.resolve(__dirname,'../index.html')).href);
await page.waitForFunction(()=>typeof KOREAN_BY_ID!=='undefined');
assert.equal(await page.evaluate(()=>state.total),23);assert.equal(await page.evaluate(()=>state.words['N5-ada066edfd'].wrong),1);
for(const level of ['N5','N4','N3','N2','N1']){
  await page.evaluate(l=>{level=l;mode='meaning';size=10;start(false)},level);
  await page.waitForSelector('#confirm');assert.equal(await page.locator('.option').count(),4);
  for(const text of await page.locator('.option').allInnerTexts())assert(/\p{Script=Hangul}/u.test(text));
  assert.equal(await page.locator('#feedback').innerText(),'');
  const correct=await page.evaluate(()=>session.q.options.indexOf(session.q.answer));
  await page.locator(`[data-option="${correct}"]`).click();assert.equal(await page.evaluate(()=>session.answered),false);
  await page.locator('#confirm').click();assert.equal(await page.evaluate(()=>session.answered),true);
  assert(!/한국어 뜻 (미등록|확인 필요)/.test(await page.locator('#feedback').innerText()));
  await page.locator('#next').click();assert.equal(await page.evaluate(()=>session.index),1);
}
async function showWord(word,reading){await page.evaluate(({word,reading})=>{const w=WORDS.find(x=>x.word===word&&x.reading===reading);if(!w)throw Error('No fixture');mode='reading';session={list:[w],index:0,correct:0,review:false,answers:[],answered:false,selected:null,q:null};quiz()}, {word,reading})}
async function confirmCorrect(){const i=await page.evaluate(()=>session.q.options.indexOf(session.q.answer));await page.locator(`[data-option="${i}"]`).click();await page.locator('#confirm').click()}
await showWord('大切','たいせつ');assert.equal(await page.locator('.option-gloss').count(),0);await confirmCorrect();
assert.match(await page.locator('.option.correct .option-gloss').innerText(),/소중|중요/);assert(!(await page.locator('#app').innerText()).includes('important'));assert.equal(await page.locator('.word-meaning').count(),0);
const gradedTotal=await page.evaluate(()=>state.total);await page.locator('.option.correct').click();assert.equal(await page.evaluate(()=>state.total),gradedTotal);assert.equal(await page.evaluate(()=>__spoken.at(-1)),'たいせつ');
for(const text of await page.locator('.option-gloss').allInnerTexts())assert(/\p{Script=Hangul}/u.test(text));
await page.locator('#next').click();assert.match(await page.locator('.result-score').innerText(),/100/);assert(!(await page.locator('.meaning').innerText()).includes('important'));
await showWord('辛い','からい');await confirmCorrect();assert.match(await page.locator('.option.correct .option-gloss').innerText(),/맵/);
await showWord('辛い','つらい');await confirmCorrect();assert.match(await page.locator('.option.correct .option-gloss').innerText(),/괴롭|고통|쓰라/);
await showWord('大切','たいせつ');const wrong=await page.evaluate(()=>session.q.options.findIndex(x=>x!==session.q.answer));await page.locator(`[data-option="${wrong}"]`).click();await page.locator('#confirm').click();assert.equal(await page.locator('.option.wrong').count(),1);assert.equal(await page.locator('.option.correct').count(),1);
const injected=await page.evaluate(()=>{const w=WORDS.find(x=>x.word==='大切');const old=KOREAN_BY_ID[w.id];KOREAN_BY_ID[w.id]='소중함 <img src=x onerror=alert(1)>';return {id:w.id,old}});await showWord('大切','たいせつ');await confirmCorrect();assert.equal(await page.locator('.option img').count(),0);assert((await page.locator('.option.correct .option-gloss').innerText()).includes('<img'));await page.evaluate(x=>KOREAN_BY_ID[x.id]=x.old,injected);
await page.setViewportSize({width:390,height:844});await showWord('暖かい','あたたかい');await confirmCorrect();assert.match(await page.locator('#feedback').innerText(),/따뜻할 난/);
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(__dirname,'korean-mobile.png'),fullPage:true});
await page.locator('nav a[href="#words"]').click();await page.locator('#search').fill('소중');await page.waitForFunction(()=>document.querySelector('#word-results').innerText.includes('大切'));assert(!/미등록|확인 필요|important/.test(await page.locator('#word-results').innerText()));
assert.deepEqual(errors,[]);console.log('PASS: all five levels, Korean choices/explanations/results/search, confirm flow, homographs, hanja, localStorage, 390px layout, no browser errors');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
