(function(root){
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wordKorean={'暖かい':'따뜻하다','温かい':'따뜻하다','寒い':'춥다','暑い':'덥다','涼しい':'시원하다','学校':'학교','学生':'학생','先生':'선생님','勉強':'공부','日本':'일본','日本語':'일본어','今日':'오늘','明日':'내일','昨日':'어제','毎日':'매일'};
  function entries(word){return [...new Set([...word].filter(c=>/\p{Script=Han}/u.test(c)))].map(character=>({character,...(KANJI_DATA[character]||{})}))}
  function kunReading(raw){const [stem,...tail]=raw.split('.');return '<span class="single-reading">'+esc(stem)+(tail.length?`<span class="okurigana">（${esc(tail.join(''))}）</span>`:'')+'</span>'}
  function render(word){
    const chars=entries(word.word);
    const korean=wordKorean[word.word];
    const meaning=`<div class="word-meaning"><span class="explanation-label">단어 뜻</span><strong>${esc(korean||word.meaning)}</strong>${korean?`<small>영어: ${esc(word.meaning)}</small>`:'<small>영어 뜻</small>'}</div>`;
    if(!chars.length)return `<section class="word-explanation">${meaning}</section>`;
    const cards=chars.map(k=>{
      if(k.character==='々')return '<article class="kanji-card"><div class="kanji-heading"><span lang="ja" class="kanji-glyph">々</span><div><strong>앞 한자를 반복하는 기호</strong><p>한자 자체의 뜻·음은 없으며, 단어 전체의 읽기를 따라요.</p></div></div></article>';
      const gloss=(k.korean||[]).map(h=>`<div>${h.character!==k.character?`<span class="variant">한국 한자 ${esc(h.character)}</span> `:''}<strong>${esc(h.meanings.join(' / '))}</strong></div>`).join('');
      return `<article class="kanji-card"><div class="kanji-heading"><span lang="ja" class="kanji-glyph">${esc(k.character)}</span><div><span class="explanation-label">한국식 뜻·음 (훈음)</span>${gloss||'<span class="muted">등록된 한국식 풀이가 없어요.</span>'}${!gloss&&k.meanings?.length?`<p>영어 뜻: ${esc(k.meanings.join(', '))}</p>`:''}</div></div><dl class="kanji-readings"><div><dt>일본어 음독</dt><dd lang="ja">${k.on?.length?k.on.map(esc).join(' · '):'사전에 등록된 읽기 없음'}</dd></div><div><dt>일본어 훈독</dt><dd lang="ja">${k.kun?.length?k.kun.map(kunReading).join(' · '):'사전에 등록된 읽기 없음'}</dd></div></dl></article>`;
    }).join('');
    return `<section class="word-explanation">${meaning}<div class="explanation-title"><h3>단어 속 한자</h3><span>뜻과 읽기를 함께 기억해요</span></div><div class="kanji-cards">${cards}</div><details class="reading-help"><summary>훈음·음독·훈독은 어떻게 다른가요?</summary><p><b>한국식 훈음</b>은 ‘따뜻할 난’처럼 한국에서 한자의 뜻과 음을 부르는 방식이에요.<br><b>일본어 음독</b>은 한자음에서 온 읽기, <b>일본어 훈독</b>은 뜻에 대응하는 일본 고유어 읽기예요.<br>예: 暖かい의 暖은 あたた로 읽고, 뒤에 かい가 붙어요. 暖房에서는 ダン으로 읽어요.</p><p>훈독의 괄호는 한자 뒤에 붙는 가나를 나타냅니다. 아래 읽기에는 드문 사전 독음도 포함되며, 실제 단어의 읽기는 정답을 따라주세요. 여러 옛 글자가 하나의 일본식 글자로 합쳐진 경우 뜻을 함께 표시합니다.</p></details></section>`;
  }
  root.KanjiDetails={entries,render,kunReading};
})(typeof window!=='undefined'?window:globalThis);
