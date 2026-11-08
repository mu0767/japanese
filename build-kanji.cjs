// Run after downloading the sources described in KANJI-NOTICE.md.
const fs=require('node:fs'),vm=require('node:vm');
const words=vm.runInNewContext(fs.readFileSync('data.js','utf8')+';WORDS');
const hanja={};
for(const line of fs.readFileSync('sources/hanja.txt','utf8').split(/\r?\n/)){
  if(line.startsWith('#'))continue;
  const [reading,character,meaning]=line.split(':');
  if(character&&[...character].length===1&&meaning){const list=hanja[character]??=[];if(!list.includes(meaning))list.push(meaning)}
}
const variants={};
for(const line of fs.readFileSync('sources/jp-variants.txt','utf8').split(/\r?\n/)){
  if(!line||line.startsWith('#'))continue;
  const [character,old]=line.split('\t');if(old)variants[character]=old.split(' ');
}
// Korean glyph variants not distinguished by OpenCC's Japanese conversion table.
Object.assign(variants,{'青':['靑'],'教':['敎'],'飲':['飮'],'既':['旣'],'清':['淸']});
const japanese={};for(let n=1;n<=5;n++)for(const k of JSON.parse(fs.readFileSync(`sources/kanji-n${n}.json`,'utf8')))japanese[k.character]=k;
const result={};
for(const c of new Set(words.flatMap(w=>[...w.word].filter(c=>/\p{Script=Han}/u.test(c))))){
  if(c==='々')continue;
  const k=japanese[c]||{};
  const korean=[...new Set([c,...(variants[c]||[])])].filter(v=>hanja[v]).map(v=>({character:v,meanings:hanja[v]}));
  result[c]={korean,on:k.onyomi||[],kun:k.kunyomi||[],meanings:k.meanings||[]};
}
fs.writeFileSync('kanji-data.js','// Derived dictionary data. See KANJI-NOTICE.md and source licenses.\nconst KANJI_DATA = '+JSON.stringify(result)+';\n');
const source=fs.readFileSync('sources/hanja.txt','utf8');fs.writeFileSync('HANJA-LICENSE.txt',source.slice(0,source.indexOf('\n\n')).replace(/^# ?/gm,'')+'\n');
console.log(`${Object.keys(result).length} kanji; ${Object.values(result).filter(k=>k.korean.length).length} Korean glosses; ${Object.values(result).filter(k=>k.on.length||k.kun.length).length} Japanese readings`);
