// Verify the actual GitHub Pages HTML and JavaScript, not the GitHub branch.
const assert=require('node:assert/strict');
const base=(process.argv[2]||'https://mu0767.github.io/japanese/').replace(/\/?$/,'/');
async function read(file){
  const u=new URL(file,base);u.searchParams.set('verify',String(Date.now()));
  const r=await fetch(u,{cache:'no-store'});assert.equal(r.status,200,`${u} returned ${r.status}`);
  return r.text();
}
(async()=>{
  const html=await read('index.html');
  assert.match(html,/최근 갱신 · 20\d\d\.\d\d\.\d\d \d\d:\d\d/);
  const script=key=>html.match(new RegExp('<script src="('+key+'\\?v=\\d+)"'))?.[1];
  const get=async key=>{const p=script(key);assert(p,'Not referenced: '+key);return read(p)};
  const stylePath=html.match(/href="([^"]*style[.]css[?]v=[0-9]+)"/)?.[1];
  assert(stylePath==='style.css?v=6','Updated mobile header CSS version not published yet');
  const stylesheet=await read(stylePath);
  assert(stylesheet.includes('Keep the latest update visible on small screens'),'Mobile header styles not published yet');
  const original=await get('korean-data\\.js');
  assert(original.includes('"大切":"소중하다, 중요하다"'),'N5 Korean map not published');
  const sourced=await get('korean-krdict-data\\.js');
  const payload=sourced.match(/const KRDICT_KOREAN_WORDS = (\{.*\});/);
  assert(payload,'Generated KRDict map missing');
  const map=JSON.parse(payload[1]);
  assert(Object.keys(map).length>4000,'Incomplete public Korean dictionary overlay');
  const kanji=await get('kanji\\.js');
  assert(kanji.includes('KRDICT_KOREAN_WORDS'),'Runtime is not loading sourced dictionary');
  const app=await get('app\\.js');
  assert(app.includes('id="confirm"'),'Confirmation button missing');
  assert(app.includes('optionWords'),'Exact option word association missing');
  assert(app.includes("scope='pending'") && app.includes('studyPool('),'New unseen/missed learning mode not deployed yet');
  const core=await get('core\\.js');
  assert(core.includes('function studyPool('),'New learning pool logic not deployed yet');
  assert(app.includes('b.classList.remove(\'selected\')'),'Grading colors regression');
  assert(app.includes("e.error==='canceled'"),'TTS cancelled error regression');
  const next=app.indexOf('id="next"'),explanation=app.indexOf('${KanjiDetails.render(w)}');
  assert(next>=0 && explanation>next,'Next button position regression');
  console.log('PASS: public Pages serves sourced dictionary ('+Object.keys(map).length+' glosses), quiz scripts and updated layout.');
  console.log(base);
})().catch(e=>{console.error('FAIL:',e.stack||e);process.exitCode=1});
