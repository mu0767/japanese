(function(root){
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const normalize=s=>s.normalize('NFKC').replace(/[\s・]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
function question(word,pool,mode,meaningFor){const isKoreanChoice=mode==='meaning'||mode==='listening';const field=isKoreanChoice?'meaning':'reading';const value=x=>isKoreanChoice&&meaningFor?meaningFor(x):x[field];const answer=value(word),seen=new Set([normalize(answer)]),other=[];for(const x of shuffle(pool)){const val=value(x);if(x.id===word.id||!val||seen.has(normalize(val)))continue;seen.add(normalize(val));other.push(x);if(other.length===3)break}const choices=shuffle([word,...other]);return {word,answer,options:choices.map(value),optionWords:choices}}
function studyPool(words,state,scope='pending'){return scope==='all'?words:words.filter(w=>{const progress=state.words?.[w.id];return !progress||progress.missed||!progress.right})}
// Plans a usable quiz without silently treating unaskable kana-only reading
// questions as completed. Pending words remain prioritized across modes.
function planStudy(words,state,mode,scope='pending',hasMeaning=()=>true){
 const eligible=(items,kind)=>items.filter(w=>kind==='reading'
  ? normalize(w.word)!==normalize(w.reading)
  : !!hasMeaning(w));
 const pending=studyPool(words,state,scope);
 const selected=eligible(pending,mode);
 if(selected.length)return {pool:selected,mode,scope,reason:null};
 if(scope==='pending'&&mode==='reading'){
  const remaining=eligible(pending,'meaning');
  if(remaining.length)return {pool:remaining,mode:'meaning',scope,reason:'reading-exhausted'};
 }
 if(scope==='pending'){
  const repeat=eligible(words,mode);
  if(repeat.length)return {pool:repeat,mode,scope:'all',reason:'pending-exhausted'};
  if(mode==='reading'){
   const meaning=eligible(words,'meaning');
   if(meaning.length)return {pool:meaning,mode:'meaning',scope:'all',reason:'reading-exhausted'};
  }
 }
 return {pool:[],mode,scope,reason:'no-eligible-words'};
}
function record(state,word,correct,date){state.total++;state.correct+=Number(correct);state.days[date]=(state.days[date]||0)+1;const prev=state.words[word.id]||{right:0,wrong:0};prev.right+=Number(correct);prev.wrong+=Number(!correct);prev.missed=!correct;state.words[word.id]=prev;return state}
const api={shuffle,normalize,question,studyPool,planStudy,record};root.Kotoba=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
