// Fetch every published asset and compare it with the audited build manifest.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const baseUrl=new URL(process.argv[2]||'https://mu0767.github.io/japanese/');
if(!baseUrl.pathname.endsWith('/'))baseUrl.pathname+='/';baseUrl.hash='';const base=baseUrl.href;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const manifestResponse=await fetch(new URL('pronunciation/manifest.json?_audit='+Date.now(),base));
 assert(manifestResponse.ok,'Published manifest is unavailable');
 const manifest=await manifestResponse.json();assert.equal(manifest.version,2);assert.equal(manifest.items.length,7811);
 const words=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data.js'),'utf8')+';WORDS');
 assert.equal(new Set(manifest.items.map(item=>item.id)).size,words.length,'Manifest repeats or omits word IDs');
 const entries=new Map(manifest.items.map(item=>[item.id,item]));
 for(const word of words){const item=entries.get(word.id);assert(item,'Manifest omits '+word.id);assert.equal(item.word,word.word);assert.equal(item.reading,word.reading);assert.equal(item.path,'pronunciation/'+word.level+'/'+word.id+'.mp3');assert.match(item.sha256,/^[a-f0-9]{64}$/);assert(item.bytes>=256)}
 const localManifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../pronunciation/manifest.json'),'utf8'));
 assert.deepEqual(manifest.items,localManifest.items,'Published files must match the locally audited build, not just a self-consistent remote manifest');
 const report={base,checkedAt:new Date().toISOString(),total:manifest.items.length,checked:0,bytes:0,levels:{},errors:[]};
 let cursor=0;
 async function worker(){while(cursor<manifest.items.length){const item=manifest.items[cursor++];let lastError;
  for(let attempt=0;attempt<3;attempt++)try{
   const response=await fetch(new URL(item.path,base),{signal:AbortSignal.timeout(30000)});
   assert.equal(response.status,200,'HTTP '+response.status);assert.match(response.headers.get('content-type')||'',/^audio\/(mpeg|mp3)/i);
   const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.length,item.bytes,'Wrong byte length');assert.equal(sha(bytes),item.sha256,'Wrong content hash');
   assert(bytes.toString('ascii',0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224),'Invalid MP3 signature');
   report.bytes+=bytes.length;report.levels[item.id.slice(0,2)]=(report.levels[item.id.slice(0,2)]||0)+1;lastError=null;break;
  }catch(error){lastError=error.message;if(attempt<2)await wait(500*(attempt+1))}
  report.checked++;if(lastError)report.errors.push({id:item.id,reading:item.reading,error:lastError});
  if(report.checked%1000===0)console.log(JSON.stringify({checked:report.checked,total:report.total,errors:report.errors.length}));
 }}
 await Promise.all(Array.from({length:16},worker));
 fs.writeFileSync('qa/pronunciation-live-audit.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));assert.equal(report.errors.length,0,'Published pronunciation audit failed');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
