// Isolated browser fixtures only. No real browser profiles or personal records.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ProgressStore=require('../progress.js');
const API='https://union-raid-records.mu0767.chatgpt.site/api/kotoba-progress';
const live=process.argv.includes('--live'),urlArg=process.argv.find(x=>/^https?:\/\//.test(x));
const words=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data.js'),'utf8')+';WORDS'),[a,b,c]=words.slice(0,3),day='2026-11-09';
const fixtures=[
 {total:4,correct:3,days:{[day]:4},words:{[a.id]:{right:2,wrong:1,missed:false},[b.id]:{right:1,wrong:0,missed:false}}},
 {total:3,correct:1,days:{[day]:3},words:{[a.id]:{right:0,wrong:2,missed:true},[c.id]:{right:1,wrong:0,missed:false}}},
 {total:2,correct:2,days:{[day]:2},words:{[b.id]:{right:2,wrong:0,missed:false}}}
];
function storage(seed=[]){const map=new Map(seed);return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}
async function localServer(){const webRoot=path.resolve(__dirname,'..');const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}const file=path.resolve(webRoot,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(webRoot+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.md':'text/plain','.txt':'text/plain'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'}).end(data)})});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {server,url:`http://127.0.0.1:${server.address().port}/`}}
(async()=>{
 const local=!live&&!urlArg?await localServer():null,base=(urlArg||(live?'https://mu0767.github.io/japanese/':local.url)).split('#')[0];
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const rooms=new Map(),contexts=[],pages=[],errors=[],postCounts=[0,0,0],offline=[false,false,false];
 try{
  for(let i=0;i<fixtures.length;i++){
   const ctx=await browser.newContext({viewport:i===2?{width:390,height:844}:{width:1280,height:900},acceptDownloads:true});contexts.push(ctx);
   await ctx.addInitScript(value=>{if(!localStorage.getItem('qa-cloud-seeded')){localStorage.setItem('kotoba-v1',JSON.stringify(value));localStorage.setItem('qa-cloud-seeded','yes')}Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return []},speak(){}}})},fixtures[i]);
   if(!live)await ctx.route(API,async route=>{
    if(offline[i]){await route.abort('internetdisconnected');return}
    const request=route.request(),origin=new URL(base).origin,headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
    if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers});return}
    const key=request.headers().authorization;assert(/^Bearer [-A-Za-z0-9_]{43,128}$/.test(key));
    let room=rooms.get(key);
    if(request.method()==='POST'){
     postCounts[i]++;const text=request.postData(),doc=JSON.parse(text);
     if(!room){const mem=storage([[ProgressStore.keys.meta,JSON.stringify({version:2,deviceId:doc.sourceDeviceId,components:doc.components})]]);room={store:ProgressStore.createStore(mem),version:1};room.store.load();rooms.set(key,room)}
     else if(!room.store.previewImport(text).alreadyIncluded){room.store.importData(text);room.version++}
    }
    await route.fulfill({status:200,headers,body:JSON.stringify({version:room?.version||0,progress:room?JSON.parse(room.store.exportData()):null})});
   });
   const page=await ctx.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'#records');await page.waitForSelector('#cloud-enable');
  }
  const [pc,edge,phone]=pages;
  for(let i=0;i<pages.length;i++)assert.equal(await pages[i].evaluate(()=>state.total),fixtures[i].total);
  await pc.locator('#cloud-enable').click();await pc.waitForFunction(()=>cloudClient.status().lastSyncedAt&&!cloudClient.status().syncing);
  const privateLink=await pc.evaluate(()=>cloudClient.link());assert(privateLink.startsWith('https://mu0767.github.io/japanese/#records?connect='));
  async function incoming(page,index){const before=postCounts[index];await page.goto(base+new URL(privateLink).hash);await page.waitForSelector('#cloud-join');assert.equal(await page.evaluate(()=>cloudClient.status().connected),false);assert.equal(await page.locator('#cloud-join-link').inputValue(),privateLink);assert.equal(await page.evaluate(()=>location.hash),'#records');await page.evaluate(()=>progressChanged(progressStore.load()));assert.equal(await page.locator('#cloud-join-link').inputValue(),privateLink);if(!live)assert.equal(postCounts[index],before,'incoming link must not upload until explicit join');await page.locator('#cloud-join').click();await page.waitForFunction(()=>cloudClient.status().lastSyncedAt&&!cloudClient.status().syncing)}
  async function syncAll(total){for(let attempt=0;attempt<6;attempt++){await Promise.all(pages.map(p=>p.evaluate(()=>cloudClient.sync())));const counts=await Promise.all(pages.map(p=>p.evaluate(()=>state.total)));if(counts.every(x=>x===total))return;await new Promise(resolve=>setTimeout(resolve,100))}assert.deepEqual(await Promise.all(pages.map(p=>p.evaluate(()=>state.total))),[total,total,total])}
  await incoming(edge,1);await incoming(phone,2);await syncAll(9);
  for(const page of pages){assert.equal(await page.evaluate(()=>state.correct),6);assert(await page.locator('#restore-progress').isDisabled(),'cloud merge cannot be undone by local backup restore')}
  async function answerOne(page){await page.goto(base+'#home');await page.waitForSelector('#start');await page.evaluate(id=>{const w=WORDS.find(x=>x.id===id);mode='reading';session={list:[w],index:0,correct:0,review:false,answers:[],answered:false,selected:null,q:null};quiz();answer(session.q.options.indexOf(session.q.answer))},a.id)}
  await answerOne(pc);assert.equal(await pc.evaluate(()=>state.total),10);await syncAll(10);
  await phone.goto(base+'#records');await phone.waitForSelector('#cloud-join');await phone.locator('#cloud-join-link').fill(privateLink);await phone.locator('#cloud-join').click();await phone.waitForFunction(()=>cloudClient.status().lastSyncedAt&&!cloudClient.status().syncing);await syncAll(10);
  offline[2]=true;await contexts[2].setOffline(true);await answerOne(phone);assert.equal(await phone.evaluate(()=>state.total),11);await phone.evaluate(()=>cloudClient.sync().catch(()=>{}));assert.equal(await phone.evaluate(()=>state.total),11);assert(await phone.evaluate(()=>!!cloudClient.status().error));assert.equal(await pc.evaluate(()=>state.total),10);
  offline[2]=false;await contexts[2].setOffline(false);await syncAll(11);await phone.goto(base+'#records');await phone.waitForSelector('#cloud-share-link');assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px mobile layout must not overflow');assert(await phone.locator('#restore-progress').isDisabled());
  await phone.reload();await phone.waitForSelector('#cloud-share-link');await phone.waitForFunction(()=>cloudClient.status().lastSyncedAt&&!cloudClient.status().syncing);assert.equal(await phone.evaluate(()=>state.total),11);assert.equal(await phone.evaluate(()=>JSON.parse(localStorage.getItem('kotoba-v1')).total),11);
  assert.deepEqual(errors,[]);
  console.log(`PASS (${live?'live D1':'mock API'}): three isolated legacy devices 4+3+2=9; explicit join; pending link preserved; new answer=10; idempotent join; offline answer/recovery=11; reload; mobile 390px; connected backup restore disabled; no page errors`);
 }finally{for(const ctx of contexts)await ctx.close();await browser.close();if(local)await new Promise(resolve=>local.server.close(resolve))}
})().catch(error=>{console.error(error?.stack||String(error));process.exitCode=1});
