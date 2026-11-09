#!/usr/bin/env node
// Build an offline Japanese -> Korean overlay from NIKL Korean Basic Dictionary
// Japanese translations, republished by basickorean/basickorean-vocab under
// CC BY-SA 2.0 KR. NO machine/LLM translation or Naver scraping.
// Usage: node tools/build-krdict-korean.cjs path/to/basickorean-vocab
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sourceRoot = process.argv[2];
if (!sourceRoot) { console.error('Usage: node tools/build-krdict-korean.cjs <basickorean-vocab>'); process.exit(2); }
const sourceDir = path.join(sourceRoot, 'shards', 'tr', 'ja');
assert(fs.existsSync(sourceDir), 'Missing bilingual shard directory: '+sourceDir);
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8') + '\n' +
  (fs.existsSync(path.join(root,'korean-kengdic.js'))?fs.readFileSync(path.join(root,'korean-kengdic.js'),'utf8'):'') + '\n' +
  fs.readFileSync(path.join(root,'korean-data.js'),'utf8') + '\n' +
  fs.readFileSync(path.join(root,'kanji-data.js'),'utf8') + '\n' +
  fs.readFileSync(path.join(root,'kanji.js'),'utf8'), ctx);
const words = vm.runInContext('WORDS',ctx);
const curated = new Set(words.filter(w => vm.runInContext('KanjiDetails.korean('+JSON.stringify(w)+')',ctx)).map(w=>w.id));
const target = new Map();
function normalize(s) {return String(s).normalize('NFKC').replace(/\s+/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));}
for (const w of words) {
  if(curated.has(w.id))continue;
  const key=w.word+'\t'+normalize(w.reading);
  if(!target.has(key))target.set(key,w.word);
}
if(!target.size){console.log('The reviewed ID-based Korean glossary covers every word; preserving the existing optional KRDict overlay.');process.exit(0)}
const counts = new Map();
function count(japanese, reading, korean){
  const jp=String(japanese||'').trim(), rd=normalize(reading||'');
  const key=jp+'\t'+rd;
  if(!target.has(key)||!korean||korean.length>30)return;
  const bucket=counts.get(key)||new Map();
  bucket.set(korean,(bucket.get(korean)||0)+1);
  counts.set(key,bucket);
}
function processGloss(gloss,korean){
  if(typeof gloss!=='string')return;
  // Delimit alternatives only in the translation headword, never in definitions.
  for (const part of gloss.split(/[。；;、，]/)) {
    const s=part.trim();
    // 'がっこう【学校】' or 'おもいで【思い出】': require exact written form AND kana.
    const rx=/([^\s【】()（）]+)【([^【】]+)】/g;
    let m, found=false;
    while((m=rx.exec(s))!==null){
      found=true;
      const reading=m[1].replace(/^[〜~·・]/,'').replace(/[〜~·・]$/,'');
      for(const head of m[2].split(/[・／/]/)){
        if(!head||!reading||!/[\u3040-\u30ff]/.test(reading))continue;
        count(head,reading,korean);
      }
    }
    // Kana-only translations, e.g. 'こんにちは', exact reading/headword only.
    if(!found && /^[\u3040-\u30ffー]+$/.test(s)) count(s,s,korean);
  }
}
let sourceEntries=0, files=0;
for(const file of fs.readdirSync(sourceDir).filter(f=>f.endsWith('.json')).sort()){
  const shard=JSON.parse(fs.readFileSync(path.join(sourceDir,file),'utf8'));
  files++;
  for(const [korean,senses] of Object.entries(shard)){
    for(const forms of senses||[]){
      for(const entry of forms||[]){
        if(Array.isArray(entry)) processGloss(entry[0],korean);
      }
    }
    sourceEntries++;
  }
}
const output = {};
for(const [key,items] of [...counts.entries()].sort(([a],[b])=>a.localeCompare(b,'ja'))){
  // Retain up to three equally attested Korean equivalents as dictionary senses.
  // Do not fabricate translations for heavily ambiguous terms.
  const ranks=[...items.entries()].sort((a,b)=>b[1]-a[1]||a[0].length-b[0].length||a[0].localeCompare(b[0],'ko'));
  const tied=ranks.filter(item=>item[1]===ranks[0][1]);
  if(tied.length>3)continue;
  output[key]=tied.map(item=>item[0]).join(' / ');
}
assert(Object.keys(output).length>0,'No dictionary matches generated; check source structure');
const destination=path.join(root,'korean-krdict-data.js');
const header='// Korean headword equivalents sourced from NIKL Korean Basic Dictionary\n' +
  '// via basickorean/basickorean-vocab, CC BY-SA 2.0 KR. See KOREAN-NOTICE.md.\n' +
  '// Matched by exact Japanese spelling AND kana, keeping unambiguous entries only.\n';
fs.writeFileSync(destination,header+'const KRDICT_KOREAN_WORDS = '+JSON.stringify(output)+';\n');
const per=Object.fromEntries(['N5','N4','N3','N2','N1'].map(level=>[level,words.filter(w=>w.level===level&&output[w.word+'\t'+normalize(w.reading)]).length]));
console.log('Source Korean entries:',sourceEntries,'shards:',files);
console.log('Derived Japanese glosses:',Object.keys(output).length,'per level:',JSON.stringify(per));
console.log('Saved:',destination);
