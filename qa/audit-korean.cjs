// Diagnose HOW Korean JLPT glosses were selected, not just whether each is nonempty.
const fs=require('fs'),vm=require('vm');
const words=vm.runInNewContext(fs.readFileSync('data.js','utf8')+';WORDS');
const records={...JSON.parse(fs.readFileSync('korean-kengdic-provenance.json','utf8')),...JSON.parse(fs.readFileSync('korean-provenance.json','utf8'))};
// Audit the deployed meaning map, not stale source snapshots.
const currentContext=vm.createContext({});
vm.runInContext(fs.readFileSync('korean-kengdic.js','utf8')+'\n'+fs.readFileSync('korean-data.js','utf8'),currentContext);
const actual=vm.runInContext('KOREAN_BY_ID',currentContext);
const corrections=JSON.parse(fs.readFileSync('qa/verified-meaning-corrections.json','utf8'));
for(const [id,c] of Object.entries(corrections)){
 const source=words.find(w=>w.id===id);
 if(!source||source.word!==c.word||source.reading!==c.reading)throw Error('Correction identity mismatch '+id);
 if(actual[id]!==c.meaning)throw Error('Correction not deployed '+id);
 if(records[id])records[id]={...records[id],meaning:c.meaning,source:'source-verified-correction',url:c.url};
}
const ids=new Set(words.map(w=>w.id));
if(words.length!==7811||ids.size!==7811||Object.keys(actual).length!==7811)throw Error('Vocabulary integrity failure');
for(const w of words){if(!actual[w.id]||!/[가-힣]/.test(actual[w.id]))throw Error('Missing or invalid translation '+w.id)}
const bySource={},byLevel={},highRisk=[],empty=[],short=[];
const rareWords=/층층대|암글|옛적|시쳇말|오도|비어|속어|고어|옛말|버금|뒷간|곳간|진자리|못자리|아귀다툼|갈음|중히|대길|작고|삿갓|드문 말/;
for(const w of words){
 const r=records[w.id];
 if(!r){empty.push(w.id);continue}
 const source=r.source||'unknown';
 bySource[source]=(bySource[source]||0)+1;
 const lev=byLevel[w.level]??={};
 lev[source]=(lev[source]||0)+1;
 const gloss=String(r.meaning||'');
 if(gloss.length<=2)short.push({word:w.word,reading:w.reading,english:w.meaning,gloss,source});
 const issues=[];
 if(rareWords.test(gloss))issues.push('unusual-word');
 if(/^\s*[^\p{Script=Hangul}]*\s*$/u.test(gloss))issues.push('not-Hangul');
 if(gloss.length>75)issues.push('long');
 if(/^\w+\/|\/$/.test(gloss))issues.push('format');
 if(/(<|>|[{}\[\]]|TODO|미정|undefined|none)/i.test(gloss))issues.push('garbage');
 if(issues.length)highRisk.push({id:w.id,word:w.word,reading:w.reading,english:w.meaning,gloss,source,method:r.method,issues});
}
const spotlight=['階段','料理','会う','学校','車','階','段','値段'];
const examples=words.filter(w=>spotlight.includes(w.word)).map(w=>({word:w.word,reading:w.reading,english:w.meaning,level:w.level,id:w.id,provenance:records[w.id]}));
console.log('KOREAN_PROVENANCE_AUDIT '+JSON.stringify({total:words.length,covered:Object.keys(records).length,empty,bySource,byLevel,highRiskCount:highRisk.length,highRisk:highRisk.slice(0,130),shortCount:short.length,shortExamples:short.slice(0,60),examples}));
