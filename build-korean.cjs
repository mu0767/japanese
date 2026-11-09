// Build a per-entry Korean dictionary from licensed source records. See KOREAN-NOTICE.md.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
if(process.argv.includes('--from-snapshot')){const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));require('./write-korean.cjs').writeOutputs({...read('korean-kengdic-provenance.json'),...read('korean-provenance.json')});return}
const {toRomaji}=require('./qa/node_modules/wanakana');
const sourceDir=path.resolve(process.argv[2]||path.join(__dirname,'sources'));
const words=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'data.js'),'utf8')+';WORDS');
const read=name=>JSON.parse(fs.readFileSync(path.join(sourceDir,name),'utf8'));
const kana=s=>String(s||'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\s・]/g,'');
const spelling=s=>String(s||'').normalize('NFKC').replace(/\s/g,'');
const roman=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/t[͜͡]?ɕ|ʨ/g,'ch').replace(/d[͜͡]?ʑ|ʥ/g,'j').replace(/ʦ/g,'ts').replace(/[ɕʃ]/g,'sh').replace(/[ʑʒ]/g,'j').replace(/[ɯʊ]/g,'u').replace(/[ɾɹ]/g,'r').replace(/[ɴŋɲ]/g,'n').replace(/[ɸ]/g,'f').replace(/[a̠ɑ]/g,'a').replace(/[ɔ]/g,'o').replace(/[^a-z]/g,'').replace(/ou|oo/g,'o').replace(/aa/g,'a').replace(/ii/g,'i').replace(/uu/g,'u').replace(/ee|ei/g,'e');
const clean=s=>String(s).replace(/^\s*\d+[.)]\s*/,'').replace(/[。.]$/,'').replace(/\([^()]*[a-z][^()]*\)/g,'').replace(/\s+/g,' ').trim();
const dictionary=fs.readFileSync(path.join(sourceDir,'kaikki-ja-ko.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const bySpelling=new Map();
function add(key,entry,method){key=spelling(key);if(!bySpelling.has(key))bySpelling.set(key,[]);bySpelling.get(key).push({entry,method})}
for(const entry of dictionary){add(entry.word,entry,'spelling');for(const f of entry.forms||[]){if(f.tags?.includes('alternative'))add(f.form,entry,'alternative-spelling')}}
const kr=read('krdict-reverse-candidates.json');
const preferred=fs.existsSync(path.join(sourceDir,'krdict-preferred.json'))?read('krdict-preferred.json'):{};
const supplementFiles=['supplement-candidates.json','krdict-reading-preferred.json','english-korean-supplements.json','n1-reviewed-supplements.json','krdict-reviewed-overrides.json','meaning-reviewed-overrides.json','semantic-n4-n3-overrides.json','semantic-n2-n1-overrides.json','semantic-root-overrides.json'];
const supplements={};for(const name of supplementFiles)if(fs.existsSync(path.join(sourceDir,name)))for(const [id,list] of Object.entries(read(name)))(supplements[id]??=[]).push(...(Array.isArray(list)?list:[list]));
const allCandidates={},selected={},evidence={},missing=[];
function rubyReading(word,ruby){let result=word;for(const [base,reading] of ruby||[])if(result.includes(base))result=result.replaceAll(base,reading);return /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(result)?kana(result):null}
function readings(entry,sense,index){const found=[];for(const x of entry.sounds||[]){const tag=(x.raw_tags||[]).join(' '),number=tag.match(/(\d+)번/);if(number&&Number(number[1])!==index+1)continue;if(x.other&&/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(x.other))found.push(kana(x.other));if(x.ipa)found.push('r:'+roman(x.ipa));if(x.roman)found.push('r:'+roman(x.roman))}for(const f of entry.forms||[])if(f.tags?.includes('canonical')&&f.form===entry.word){const r=rubyReading(entry.word,f.ruby);if(r)found.push(r)}for(const x of sense.examples||[]){const r=rubyReading(entry.word,x.ruby);if(r)found.push(r)}return found}
for(const word of words){const candidates=[];
  for(const {entry,method} of bySpelling.get(spelling(word.word))||[]){
    for(const [index,sense] of (entry.senses||[]).entries()){
      if(sense.tags?.includes('no-gloss')||sense.tags?.includes('form-of'))continue;
      const glosses=(sense.glosses||[]).map(clean).filter(g=>/\p{Script=Hangul}/u.test(g)&&!/^.*의 (다른 표기|구자체|옛 표기|이형태|활용형)$/.test(g));
      if(!glosses.length)continue;
      const known=readings(entry,sense,index),target=kana(word.reading),targetRoman=roman(toRomaji(target));
      const match=known.includes(target)||known.includes('r:'+targetRoman);
      if(known.length&&!match)continue;
      const isVerb=/^to\s/.test(word.meaning);
      const posPenalty=['prefix','suffix','character','unknown'].includes(entry.pos)?12:0;
      const senseRuby=(sense.examples||[]).some(x=>rubyReading(entry.word,x.ruby)===target);
      candidates.push({meaning:glosses.join('; '),source:'kowiktionary',sourceWord:entry.word,senseId:sense.id||null,url:'https://ko.wiktionary.org/wiki/'+encodeURIComponent(entry.word),method:method+(match?'+reading':''),score:100+(match?10:0)+(senseRuby?8:0)+(isVerb&&entry.pos==='verb'?5:0)-posPenalty-index});
    }
  }
  const krCandidates=kr[word.id]?.candidates||[];
  const pref=preferred[word.id];
  for(const [i,c] of krCandidates.entries())candidates.push({meaning:c.korean,source:'krdict',sourceWord:c.korean,url:'https://krdict.korean.go.kr/jpn',japanese:c.japanese,english:c.english||null,method:'spelling+reading',score:60-i/100,sourceEntry:c.sourceEntry,sourceSense:c.sourceSense});
  if(pref){const c=typeof pref==='string'?{meaning:pref}:pref;const candidate=candidates.find(x=>x.source==='krdict'&&x.meaning===(c.meaning||c.korean)&&(!c.sourceEntry||x.sourceEntry===c.sourceEntry)&&(!Number.isFinite(c.sourceSense)||x.sourceSense===c.sourceSense));if(candidate){const significant=(word.meaning.toLowerCase().match(/[a-z]{3,}/g)||[]).some(t=>!['the','and','for','with','from','have','has','had','put','set','get','make','take','become','someone','something','oneself'].includes(t));const clipped=/^-|-$/.test(candidate.meaning)&&!/prefix|suffix|counter|particle|honor|polite|Mr|Mrs/i.test(word.meaning);candidate.score=c.override?150:significant&&c.score>=6&&!clipped?130+c.score/2:88+(c.score||0)/2;candidate.reason=c.reason}}
  for(const c of supplements[word.id]||[])if(typeof c.meaning==='string'&&/\p{Script=Hangul}/u.test(c.meaning))candidates.push({...c,meaning:clean(c.meaning),score:c.override?160:c.score});
  const isKatakana=/[ァ-ヶ]/.test(word.word)&&!/[\p{Script=Han}\p{Script=Hiragana}]/u.test(word.word);
  for(let i=candidates.length-1;i>=0;i--){const c=candidates[i];if(isKatakana&&/krdict|NIKL/i.test(c.source)&&c.japanese&&!/[ァ-ヶ]/.test(c.japanese))candidates.splice(i,1)}
  candidates.sort((a,b)=>b.score-a.score);allCandidates[word.id]={word:word.word,reading:word.reading,english:word.meaning,candidates};
  if(!candidates.length){missing.push(word);continue}
  const best=candidates[0];selected[word.id]=best.meaning;evidence[word.id]={word:word.word,reading:word.reading,...best};
}
fs.writeFileSync(path.join(sourceDir,'combined-candidates.json'),JSON.stringify(allCandidates,null,2));
fs.writeFileSync(path.join(sourceDir,'unmatched.json'),JSON.stringify(missing,null,2));
require('./write-korean.cjs').writeOutputs(evidence);
