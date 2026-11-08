(function(root){
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const normalize=s=>s.normalize('NFKC').replace(/[\s・]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
function question(word,pool,mode){const field=mode==='meaning'?'meaning':'reading';const answer=word[field];const other=[...new Set(pool.filter(x=>x.id!==word.id&&normalize(x[field])!==normalize(answer)).map(x=>x[field]))];return {word,answer,options:shuffle([answer,...shuffle(other).slice(0,3)])}}
function record(state,word,correct,date){state.total++;state.correct+=Number(correct);state.days[date]=(state.days[date]||0)+1;const prev=state.words[word.id]||{right:0,wrong:0};prev.right+=Number(correct);prev.wrong+=Number(!correct);prev.missed=!correct;state.words[word.id]=prev;return state}
const api={shuffle,normalize,question,record};root.Kotoba=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
