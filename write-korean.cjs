const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function writeOutputs(records){
 const words=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'data.js'),'utf8')+';WORDS');
 const common={},kengdic={},commonEvidence={},kengdicEvidence={};
 for(const w of words){const r=records[w.id];if(!r)continue;
  if(!r.url)r.url=/krdict|NIKL/i.test(r.source)?'https://krdict.korean.go.kr/jpn':r.source==='kaikki'?'https://ko.wiktionary.org/wiki/'+encodeURIComponent(w.word):'https://github.com/evanclan/OpenJLPT';
  r.license=r.source==='kengdic'?'MPL-2.0':/krdict|NIKL/i.test(r.source)?'CC-BY-SA-2.0-KR':'CC-BY-SA-4.0';
  if(r.source==='kengdic'){kengdic[w.id]=r.meaning;kengdicEvidence[w.id]=r}else{common[w.id]=r.meaning;commonEvidence[w.id]=r}
 }
 fs.writeFileSync(path.join(__dirname,'korean-kengdic.js'),'// Kengdic-derived reviewed glosses. MPL-2.0. Joe Speigle and contributors.\n// Source and modifications: KENGDIC-NOTICE.md. Source-form records: korean-kengdic-provenance.json\nconst KENGDIC_KOREAN_BY_ID = '+JSON.stringify(kengdic)+';\n');
 fs.writeFileSync(path.join(__dirname,'korean-data.js'),'// Per-entry Korean meanings; dictionary attribution and changes: KOREAN-NOTICE.md\nconst KOREAN_BY_ID = {...KENGDIC_KOREAN_BY_ID, ...'+JSON.stringify(common)+'};\n');
 fs.writeFileSync(path.join(__dirname,'korean-provenance.json'),JSON.stringify(commonEvidence)+'\n');
 fs.writeFileSync(path.join(__dirname,'korean-kengdic-provenance.json'),JSON.stringify(kengdicEvidence)+'\n');
 const translated={...kengdic,...common};
 const report={total:words.length,translated:Object.keys(translated).length,missing:words.filter(w=>!translated[w.id]).length,levels:Object.fromEntries(['N5','N4','N3','N2','N1'].map(l=>[l,{total:words.filter(w=>w.level===l).length,translated:words.filter(w=>w.level===l&&translated[w.id]).length}])),sources:Object.values(records).reduce((d,r)=>(d[r.source]=(d[r.source]||0)+1,d),{})};
 fs.writeFileSync(path.join(__dirname,'korean-coverage.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));return report;
}
module.exports={writeOutputs};
if(require.main===module){const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));writeOutputs({...read('korean-kengdic-provenance.json'),...read('korean-provenance.json')})}
