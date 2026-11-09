// Verify files actually delivered by GitHub Pages. Node.js 18+, no dependencies.
const assert=require('node:assert/strict'),vm=require('node:vm');
const base=(process.argv[2]||'https://mu0767.github.io/japanese/').replace(/\/?$/,'/');
async function read(path){const url=new URL(path,base);url.searchParams.set('_verify',Date.now());const r=await fetch(url,{cache:'no-store'});assert.equal(r.status,200,`${url}: HTTP ${r.status}`);return r.text()}
(async()=>{
 const html=await read('index.html');
 const paths=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
 assert(paths.some(p=>/^korean-data\.js\?v=\d+$/.test(p)));assert(paths.some(p=>/^korean-kengdic\.js\?v=\d+$/.test(p)));
 assert(paths.includes('quick-export.js?v=1'),'Right-side progress export asset not deployed');
 assert((await read('quick-export.css?v=1')).includes('quick-export-dock'),'Export shortcut CSS not deployed');
 const scripts=await Promise.all(paths.map(read)),context=vm.createContext({});let app='';
 for(let i=0;i<paths.length;i++){if(paths[i].startsWith('app.js'))app=scripts[i];else vm.runInContext(scripts[i],context)}
 const coverage=vm.runInContext(`({total:WORDS.length,translated:WORDS.filter(w=>/\\p{Script=Hangul}/u.test(KanjiDetails.korean(w)||'')).length,levels:Object.fromEntries(['N5','N4','N3','N2','N1'].map(level=>[level,WORDS.filter(w=>w.level===level&&KanjiDetails.korean(w)).length]))})`,context);
 assert(typeof context.KotobaQuickExport?.mount==='function','One-click copy export is not available');
 assert.equal(coverage.total,7811);
 assert(app.includes('setupCloud()'),'Cloud synchronization initialization missing');
 const sync=await read(paths.find(p=>p.startsWith('cloud-sync.js')));
 assert(sync.includes('https://kotoba-sync.union-raid.workers.dev/api/kotoba-progress'),'New D1 endpoint not published');assert.equal(coverage.translated,7811);
 assert(app.includes('id="confirm"'));assert(app.includes("b.onclick=()=>speak(s.q.options[i])"),'Post-answer option replay lost');
 assert(!vm.runInContext(`KanjiDetails.render(WORDS.find(w=>w.word==='大切')).includes('word-meaning')`,context),'Duplicate word meaning restored');
 const metadata=JSON.parse(await read('korean-coverage.json'));assert.equal(metadata.missing,0);assert.equal(metadata.translated,7811);
 const endpoint='https://kotoba-sync.union-raid.workers.dev/api/kotoba-progress';
 const unauthed=await fetch(endpoint,{headers:{Origin:'https://mu0767.github.io',Accept:'application/json'}});
 assert.equal(unauthed.status,401,'D1 endpoint must require private Bearer key');
 assert.equal(unauthed.headers.get('access-control-allow-origin'),'https://mu0767.github.io','Kotoba origin CORS missing');
 const preflight=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:'https://mu0767.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
 assert.equal(preflight.status,204,'Sync preflight must be allowed');
 console.log('PASS: Live GitHub Pages serves all 7,811 Korean meanings, every level, source metadata, current confirmation/replay UI.');console.log(JSON.stringify(coverage));console.log('Site:',base);
})().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1});
