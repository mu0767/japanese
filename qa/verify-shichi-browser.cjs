// Real media decoding/playback in isolated browser profiles, never user records.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const baseUrl=new URL(process.argv[2]||'https://mu0767.github.io/japanese/');
if(!baseUrl.pathname.endsWith('/'))baseUrl.pathname+='/';baseUrl.hash='';const base=baseUrl.href;
(async()=>{
 const manifestResponse=await fetch(new URL('pronunciation/manifest.json',base));assert(manifestResponse.ok,'Audited pronunciation manifest is unavailable');
 const manifest=await manifestResponse.json(),expected=manifest.items.find(w=>w.id==='N5-988db98632');
 assert.equal(expected.reading,'しち');assert.equal(expected.phonemes.map(p=>p.toLowerCase()).join(' '),'sh i ch i');
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.audioChecks=[];window.audioBlobs=new Map();const create=URL.createObjectURL;URL.createObjectURL=function(blob){const url=create.call(URL,blob);audioBlobs.set(url,blob);return url};const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){const player=this;player.addEventListener('playing',()=>audioChecks.push({event:'playing',src:player.currentSrc,duration:player.duration}),{once:true});player.addEventListener('error',()=>audioChecks.push({event:'error',src:player.currentSrc}),{once:true});return original.call(player)}});
  await page.goto(base+'#home');
  await page.evaluate(()=>{KotobaAudio.clearPrepared();mode='reading';const w=WORDS.find(w=>w.word==='七'&&w.reading==='しち');session={list:[w],index:0,correct:0,review:false,answers:[],answered:false,selected:null,q:null};quiz()});
  const seven=page.locator('[data-option]').filter({has:page.getByText('しち',{exact:true})});await seven.click();
  await page.waitForFunction(()=>audioChecks.some(x=>x.event==='playing'));
  assert.equal(await page.evaluate(()=>session.q.optionWords[session.selected].id),'N5-988db98632');
  await page.locator('#confirm').click();const total=await page.evaluate(()=>state.total),beforeReplay=await page.evaluate(()=>audioChecks.filter(x=>x.event==='playing').length);await seven.click();
  await page.waitForFunction(before=>audioChecks.filter(x=>x.event==='playing').length>before,beforeReplay);
  assert.equal(await page.evaluate(()=>state.total),total,'Replay changed score');
  const played=await page.evaluate(async()=>{const result=[];for(const entry of audioChecks.filter(x=>x.event==='playing')){const blob=entry.src.startsWith('blob:')?audioBlobs.get(entry.src):await fetch(entry.src).then(r=>{if(!r.ok)throw Error('Could not inspect played MP3');return r.blob()});if(!blob)throw Error('Played Blob was not captured');const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());result.push({...entry,bytes:blob.size,sha256:Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('')})}return result});
  assert(played.length>=2);assert(played.every(x=>x.duration>0.1));assert(!played.some(x=>x.src.includes('kotoba-audio.union-raid')));
  for(const entry of played){assert.equal(entry.bytes,expected.bytes,'Played a different-sized clip');assert.equal(entry.sha256,expected.sha256,'The decoded/played clip is not the phoneme-audited しち MP3');if(!entry.src.startsWith('blob:'))assert.equal(entry.src,new URL(expected.path,base).href,'A fallback recording played instead of the audited clip')}
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS: actual decoded しち MP3 hash, playback, replay and unchanged score at width '+width);
 }}finally{await browser.close()}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
