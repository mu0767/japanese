(function(root){
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=s=>String(s).normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
  const bySpelling=new Map(),byReading=new Map();
  for(const word of typeof WORDS!=='undefined'?WORDS:[]){
    const spelling=normalize(word.word),pair=spelling+'\t'+normalize(word.reading);
    if(!bySpelling.has(spelling))bySpelling.set(spelling,[]);
    if(!byReading.has(pair))byReading.set(pair,[]);
    bySpelling.get(spelling).push(word);byReading.get(pair).push(word);
  }
  function korean(word){
    if(!word||typeof KOREAN_BY_ID==='undefined')return null;
    if(typeof word==='object'&&word.id&&Object.hasOwn(KOREAN_BY_ID,word.id))return KOREAN_BY_ID[word.id]||null;
    const spelling=normalize(typeof word==='string'?word:word.word);
    let candidates;
    if(typeof word==='object'&&word.reading)candidates=byReading.get(spelling+'\t'+normalize(word.reading))||[];
    else{
      candidates=bySpelling.get(spelling)||[];
      if(new Set(candidates.map(w=>normalize(w.reading))).size!==1)return null;
    }
    const meanings=[...new Set(candidates.map(w=>KOREAN_BY_ID[w.id]).filter(Boolean))];
    if(meanings.length===1)return meanings[0];
    if(typeof word==='object'&&word.reading&&typeof KRDICT_KOREAN_WORDS!=='undefined')return KRDICT_KOREAN_WORDS[word.word+'\t'+normalize(word.reading)]||null;
    return null;
  }
  function dictionaryUrl(word){return 'https://ja.dict.naver.com/#/search?query='+encodeURIComponent(word)}
  function entries(word){return [...new Set([...word].filter(c=>/\p{Script=Han}/u.test(c)))].map(character=>({character,...(KANJI_DATA[character]||{})}))}
  function kunReading(raw){const [stem,...tail]=raw.split('.');return '<span class="single-reading">'+esc(stem)+(tail.length?`<span class="okurigana">（${esc(tail.join(''))}）</span>`:'')+'</span>'}
  function render(word){
    const chars=entries(word.word);
    // Quiz choices already show each word's Korean meaning after grading.
    // Keep this panel exclusively for kanji information to avoid duplication.
    if(!chars.length)return '';
    const cards=chars.map(k=>{
      if(k.character==='々')return '<article class="kanji-card"><div class="kanji-heading"><span lang="ja" class="kanji-glyph">々</span><div><strong>앞 한자를 반복하는 기호</strong><p>한자 자체의 뜻·음은 없으며, 단어 전체의 읽기를 따라요.</p></div></div></article>';
      const gloss=(k.korean||[]).map(h=>`<div>${h.character!==k.character?`<span class="variant">한국 한자 ${esc(h.character)}</span> `:''}<strong>${esc(h.meanings.join(' / '))}</strong></div>`).join('');
      return `<article class="kanji-card"><div class="kanji-heading"><span lang="ja" class="kanji-glyph">${esc(k.character)}</span><div><span class="explanation-label">한국식 뜻·음 (훈음)</span>${gloss||'<span class="muted">등록된 한국식 풀이가 없어요.</span>'}</div></div><dl class="kanji-readings"><div><dt>일본어 음독</dt><dd lang="ja">${k.on?.length?k.on.map(esc).join(' · '):'사전에 등록된 읽기 없음'}</dd></div><div><dt>일본어 훈독</dt><dd lang="ja">${k.kun?.length?k.kun.map(kunReading).join(' · '):'사전에 등록된 읽기 없음'}</dd></div></dl></article>`;
    }).join('');
    return `<section class="word-explanation"><div class="explanation-title"><h3>단어 속 한자</h3><span>뜻과 읽기를 함께 기억해요</span></div><div class="kanji-cards">${cards}</div><details class="reading-help"><summary>훈음·음독·훈독은 어떻게 다른가요?</summary><p><b>한국식 훈음</b>은 ‘따뜻할 난’처럼 한국에서 한자의 뜻과 음을 부르는 방식이에요.<br><b>일본어 음독</b>은 한자음에서 온 읽기, <b>일본어 훈독</b>은 뜻에 대응하는 일본 고유어 읽기예요.<br>예: 暖かい의 暖은 あたた로 읽고, 뒤에 かい가 붙어요. 暖房에서는 ダン으로 읽어요.</p><p>훈독의 괄호는 한자 뒤에 붙는 가나를 나타냅니다. 아래 읽기에는 드문 사전 독음도 포함되며, 실제 단어의 읽기는 정답을 따라주세요. 여러 옛 글자가 하나의 일본식 글자로 합쳐진 경우 뜻을 함께 표시합니다.</p></details></section>`;
  }
  root.KanjiDetails={entries,render,kunReading,korean,dictionaryUrl};
})(typeof window!=='undefined'?window:globalThis);
