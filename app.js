const {shuffle,question,studyPool,record}=Kotoba;
const $=s=>document.querySelector(s),app=$('#app');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fresh=()=>({total:0,correct:0,days:{},words:{}});
let state,progressStore;try{progressStore=ProgressStore.createStore(localStorage,{knownWordIds:WORDS.map(w=>w.id)});state=progressStore.load()}catch{progressStore=null;try{state=JSON.parse(localStorage.getItem('kotoba-v1'))||fresh()}catch{state=fresh()}if(!state.words||!state.days||!Number.isFinite(state.total))state=fresh();setTimeout(()=>toast('기록 저장소를 사용할 수 없습니다. 브라우저의 사이트 데이터 설정을 확인해주세요.'),0)}
let cloudClient=null,cloudView=null;
let level='N5',mode='reading',scope='pending',size=10,session=null,page=0,filter='',wordLevel='all';
const today=()=>new Date().toLocaleDateString('sv-SE');
function save(){try{localStorage.setItem('kotoba-v1',JSON.stringify(state))}catch{toast('저장 공간을 사용할 수 없어 이번 기록은 저장되지 않습니다.')}}
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3000)}
const missed=()=>WORDS.filter(w=>state.words[w.id]?.missed);
function streak(){let d=new Date(),n=0;if(!state.days[today()])d.setDate(d.getDate()-1);while(state.days[d.toLocaleDateString('sv-SE')]){n++;d.setDate(d.getDate()-1)}return n}
const labels={N5:['첫걸음','기초부터 차근차근'],N4:['기초 다지기','일상 표현을 넓혀요'],N3:['중급 도약','한 단계 더 자연스럽게'],N2:['실력 완성','깊이 있는 일본어'],N1:['고급 마스터','섬세한 표현까지']};
function route(){cloudView?.dispose();cloudView=null;session=null;$('#review-count').textContent=missed().length;document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash===(location.hash||'#home')));const r=location.hash.split('?')[0];if(r==='#records')recordsPage();else if(r==='#words'||r==='#review')wordPage(r==='#review');else if(r==='#about')about();else home();if(cloudClient?.status().connected)cloudClient.sync().catch(()=>{})}
function refreshHomeSyncStatus(){
 const badge=$('#home-sync-state');if(!badge)return;
 const status=cloudClient?.status();
 let text='로컬 학습 기록만 표시 중 · 기록 연결하기';
 if(status?.connected){
  if(status.error)text='동기화 실패 · 이 기기 기록만 표시 중';
  else if(status.syncing||!status.lastSyncedAt)text='서버 최신 기록 확인 중…';
  else text='서버 동기화 완료 · 다른 기기와 공유 중';
 }
 badge.textContent=text;badge.classList.toggle('sync-warning',!status?.connected||!!status.error);
}
function home(){app.innerHTML=`<section class="hero"><div><span class="eyebrow">A LITTLE EVERY DAY</span><h1>오늘의 한 단어가,<br>내일의 일본어가 되도록.</h1><p>N5부터 N1까지, 나에게 맞는 난이도로.<br>부담 없이 시작하는 나만의 일본어 단어 습관.</p></div><div class="hero-art" aria-hidden="true"><div class="paper back"></div><div class="paper"><small>ことば</small><span class="jp">学ぶ</span><small>배우다</small></div><span class="sprout">🌿</span></div></section><div class="record-shortcut"><a href="#records">학습 기록 · 자동 동기화 →</a><a id="home-sync-state" href="#records" class="home-sync-state" aria-live="polite">동기화 상태 확인 중</a></div><section class="stats" aria-label="나의 학습 기록"><div class="stat"><span class="stat-icon">◷</span><div><label>연속 학습</label><strong>${streak()}<small>일째</small></strong></div></div><div class="stat"><span class="stat-icon">▤</span><div><label>지금까지 푼 문제</label><strong>${state.total.toLocaleString()}<small>문제</small></strong></div></div><div class="stat"><span class="stat-icon">◎</span><div><label>나의 정답률</label><strong>${state.total?Math.round(state.correct/state.total*100):0}<small>%</small></strong></div></div></section><section><div class="section-head"><div><h2>어디부터 시작할까요?</h2><p>학습할 JLPT 급수를 선택해주세요.</p></div><span class="muted">5개 급수 · ${WORDS.length.toLocaleString()}개 단어</span></div><div class="levels">${['N5','N4','N3','N2','N1'].map(l=>{let pool=WORDS.filter(w=>w.level===l),learned=pool.filter(w=>state.words[w.id]?.right>0&&!state.words[w.id]?.missed).length;return `<button class="level ${level===l?'selected':''}" data-level="${l}" aria-pressed="${level===l}"><span class="tag">${level===l?'✓':'↗'}</span><span class="num">${l}</span><span class="name">${labels[l][0]}</span><span class="count">${pool.length.toLocaleString()}개 단어</span><div class="track"><i style="width:${learned/pool.length*100}%"></i></div><span class="learned">정답을 맞힌 단어 ${learned}개</span></button>`}).join('')}</div><div class="study-panel"><div class="controls"><div class="field"><label for="mode">퀴즈 유형</label><select id="mode"><option value="reading">히라가나 읽기</option><option value="meaning">뜻 맞히기 (한국어)</option></select></div><div class="field"><label for="scope">학습 범위</label><select id="scope"><option value="pending">미학습 + 오답 (기본)</option><option value="all">전체 단어 (다시 학습)</option></select></div><div class="field"><label for="size">학습량</label><select id="size"><option value="10">가볍게 10문제</option><option value="20">차근차근 20문제</option><option value="50">집중해서 50문제</option></select></div></div><button id="start" class="primary">${level} 학습 시작하기 &nbsp; →</button></div></section><section class="note" id="audio-cache-panel" aria-label="음원 미리 저장" style="margin-top:22px"><h3>음원 기기에 미리 저장</h3><p>읽기에 맞춰 새로 만든 MP3 음원 7,811개를 사용할 수 있습니다. 필요한 급수만 미리 저장하면 다음 학습부터 기기에 저장된 음원을 사용합니다. 이전 음원 캐시는 자동 갱신되며 학습 기록은 유지됩니다. 브라우저의 사이트 데이터를 삭제하면 저장한 음원도 사라집니다.</p><p class="muted" id="audio-cache-status" role="status" aria-live="polite">저장 상태 확인 중…</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px"><button class="secondary" id="audio-cache-level">선택한 급수 저장</button><button class="secondary" id="audio-cache-all">전체 7,811개 저장</button><button class="secondary" id="audio-cache-stop" hidden>저장 일시정지</button></div></section><div class="bottom-grid"><section class="note"><h3>작은 꾸준함의 힘</h3><p>읽기부터 익히고, 틀린 단어는 오답 노트에서 다시 만나보세요.<br>정답을 맞히면 해당 단어가 오답 노트에서 빠집니다.</p><a href="#review" style="display:inline-block;margin-top:14px;font-size:12px">오답 ${missed().length}개 복습하기 →</a></section><section class="note"><h3>이번 주도 조금씩</h3><p>오늘의 목표 ${Math.min(state.days[today()]||0,10)} / 10문제</p><div class="week">${Array.from({length:7},(_,i)=>{let d=new Date();d.setDate(d.getDate()-6+i);let count=state.days[d.toLocaleDateString('sv-SE')]||0;return `<span class="day ${count?'done':''}"><i title="${count}문제">${count?'✓':'·'}</i>${['일','월','화','수','목','금','토'][d.getDay()]}</span>`}).join('')}</div></section></div>`;refreshHomeSyncStatus();$('#mode').value=mode;$('#scope').value=scope;$('#size').value=size;document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{level=b.dataset.level;home()});$('#mode').onchange=e=>mode=e.target.value;$('#scope').onchange=e=>scope=e.target.value;$('#size').onchange=e=>size=Number(e.target.value);$('#start').onclick=()=>start(false);refreshAudioPanel()}

let offlineAudioProgress=null;
function refreshAudioPanel(){
 const target=$('#audio-cache-status'),service=window.KotobaOfflineAudio;
 if(!target)return;
 const one=$('#audio-cache-level'),all=$('#audio-cache-all'),stop=$('#audio-cache-stop');
 one.textContent=level+' 음원 미리 저장';
 if(!service?.supported()){
  target.textContent='이 브라우저에서는 음원 영구 저장을 지원하지 않습니다. 일반 재생은 가능합니다.';
  one.disabled=true;all.disabled=true;stop.hidden=true;return;
 }
 const busy=service.active();
 one.disabled=busy;all.disabled=busy;stop.hidden=!busy;
 one.onclick=()=>downloadAudio(level);
 all.onclick=()=>downloadAudio('all');
 stop.onclick=()=>{if(service.stop()){stop.disabled=true;target.textContent='저장 일시정지 중…'}};
 if(busy&&offlineAudioProgress){
  const p=offlineAudioProgress;
  target.textContent=p.done.toLocaleString()+' / '+p.total.toLocaleString()+'개 확인 중 · 새로 저장 '+p.downloaded.toLocaleString()+'개 · '+Math.floor(p.done/Math.max(1,p.total)*100)+'%';
  return;
 }
 service.status(WORDS).then(info=>{
  if($('#audio-cache-status')!==target||service.active())return;
  const current=info.levelCounts[level]||{stored:0,total:0};
  target.textContent='이 기기에 저장된 음원: 전체 '+info.stored.toLocaleString()+' / '+info.total.toLocaleString()+'개 · '+level+' '+current.stored.toLocaleString()+' / '+current.total.toLocaleString()+'개';
 }).catch(()=>{if($('#audio-cache-status')===target)target.textContent='현재 저장 상태를 확인할 수 없습니다.'});
}
async function downloadAudio(targetLevel){
 const service=window.KotobaOfflineAudio;
 if(!service?.supported()||service.active())return;
 const list=targetLevel==='all'?WORDS:WORDS.filter(w=>w.level===targetLevel);
 offlineAudioProgress={done:0,total:list.length,downloaded:0,existing:0,failed:0};
 refreshAudioPanel();
 try{
  const result=await service.download(list,progress=>{
   offlineAudioProgress=progress;
   if(progress.done===0)refreshAudioPanel();
   const status=$('#audio-cache-status');
   if(status&&service.active())status.textContent=progress.done.toLocaleString()+' / '+progress.total.toLocaleString()+'개 확인 · 새로 저장 '+progress.downloaded.toLocaleString()+'개 · '+Math.floor(progress.done/Math.max(1,progress.total)*100)+'%';
  });
  if(result.quotaError)toast('기기 저장 공간이 부족합니다. 저장한 음원은 유지되며 나중에 이어받을 수 있어요.');
  else if(result.paused)toast('음원 저장을 일시정지했습니다. 다시 누르면 남은 파일부터 받습니다.');
  else if(result.failed)toast('음원 '+result.failed+'개 저장 실패. 다시 실행하면 누락된 파일을 재시도합니다.');
  else toast('음원 저장 완료: '+result.total.toLocaleString()+'개 확인');
 }catch(error){
  toast('음원 저장 실패: '+String(error?.message||error));
 }finally{
  offlineAudioProgress=null;
  refreshAudioPanel();
 }
}
function start(review){let pool=review?missed():studyPool(WORDS.filter(w=>w.level===level),state,scope);if(mode==='meaning')pool=pool.filter(w=>KanjiDetails.korean(w));if(mode==='reading')pool=pool.filter(w=>Kotoba.normalize(w.word)!==Kotoba.normalize(w.reading));if(!pool.length){toast(!review&&scope==='pending'?'새로 풀거나 틀린 단어가 없습니다. 전체 단어로 바꾸면 다시 학습할 수 있어요.':'현재 조건에 맞는 문제가 없습니다. 급수나 퀴즈 유형을 바꿔보세요.');return}let list=shuffle(pool).slice(0,size);session={list,index:0,correct:0,review,answers:[],answered:false,selected:null,q:null};quiz();window.scrollTo(0,0)}
function quiz(){const s=session,w=s.list[s.index];s.answered=false;s.selected=null;s.q=mode==='meaning'?Kotoba.question(w,WORDS.filter(x=>x.level===w.level&&KanjiDetails.korean(x)),mode,x=>KanjiDetails.korean(x)):question(w,WORDS.filter(x=>x.level===w.level&&(x.id===w.id||KanjiDetails.korean(x))),mode);app.innerHTML=`<section class="quiz-shell"><div class="quiz-top"><button class="secondary" id="exit">← 나가기</button><h1>${s.review?'오답 복습':w.level+' 단어 학습'}</h1><span class="muted">${mode==='reading'?'읽기 퀴즈':'한국어 뜻 퀴즈'}</span></div><div class="quiz-progress"><span>${s.index+1} / ${s.list.length}</span><div class="track"><i style="width:${s.index/s.list.length*100}%"></i></div><span>정답 ${s.correct}</span></div><div class="question-card"><span class="badge">${w.level} · ${labels[w.level][0]}</span><h2 lang="ja">${escape(w.word)}</h2><p>${mode==='reading'?'이 단어의 올바른 읽기를 골라주세요.':'이 단어의 한국어 뜻을 골라주세요.'}</p>${mode==='meaning'?'<button class="sound" id="speak">◖)) 발음 듣기</button>':'<span class="muted">정답 확인 후 발음을 들을 수 있어요.</span>'}</div><div class="options">${s.q.options.map((o,i)=>`<button class="option" data-option="${i}"><span class="key">${i+1}</span><span>${escape(o)}</span></button>`).join('')}</div><div id="feedback" aria-live="polite"></div><div class="quiz-bottom"><span class="muted">키보드 1–4로 선택 · Enter로 다음 문제</span><div class="quiz-buttons"><button class="secondary" id="skip">모르겠어요</button><button class="primary" id="confirm" disabled>확인</button></div></div></section>`;$('#exit').onclick=()=>{session=null;route()};if($('#speak'))$('#speak').onclick=()=>speak(w);document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>selectOption(Number(b.dataset.option)));$('#confirm').onclick=()=>answer(s.selected);$('#skip').onclick=()=>answer(-1);if(typeof KotobaAudio!== 'undefined')KotobaAudio.prepare(mode==='reading'?s.q.optionWords:[w])}
function selectOption(index){const s=session;if(!s||s.answered)return;s.selected=index;document.querySelectorAll('[data-option]').forEach(b=>{const chosen=Number(b.dataset.option)===index;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen))});$('#confirm').disabled=false;if(mode==='reading')speak(s.q.optionWords[index]);}
function optionGloss(option,w,source){if(mode!=='reading')return '';const relevant=source||WORDS.find(x=>x.word===w.word&&x.reading===option)||WORDS.find(x=>x.reading===option);if(!relevant)return '';const meaning=KanjiDetails.korean(relevant);return `${escape(relevant.word)} · ${meaning?escape(meaning):'사전 검색 필요'}`;}
function answer(index){let s=session;if(!s||s.answered||index===null||index===undefined)return;s.answered=true;let w=s.q.word,correct=s.q.options[index]===s.q.answer;s.correct+=Number(correct);s.answers.push({word:w,correct});if(progressStore){try{state=progressStore.record(w.id,correct,today());cloudClient?.schedule()}catch{record(state,w,correct,today());toast('이번 답안은 저장되지 않았습니다. 저장 공간을 확인해주세요.')}}else{record(state,w,correct,today());save();}$('#review-count').textContent=missed().length;document.querySelectorAll('[data-option]').forEach(b=>{const i=Number(b.dataset.option),isCorrect=s.q.options[i]===s.q.answer,isWrong=i===index&&!isCorrect;b.classList.remove('selected');b.setAttribute('aria-pressed','false');if(isCorrect)b.classList.add('correct');else if(isWrong)b.classList.add('wrong');if(mode==='reading'){b.onclick=()=>speak(s.q.optionWords[i]);b.setAttribute('aria-label',s.q.options[i]+' '+(isCorrect?'정답 ':isWrong?'선택한 오답 ':'')+'발음 다시 듣기')}else b.disabled=true});$('#skip').disabled=true;$('#confirm').disabled=true;if(mode==='reading')document.querySelectorAll('[data-option]').forEach(b=>{const idx=Number(b.dataset.option);const gloss=optionGloss(s.q.options[idx],w,s.q.optionWords?.[idx]);if(gloss)b.insertAdjacentHTML('beforeend',`<small class="option-gloss">${gloss}</small>`)});$('#feedback').innerHTML=`<div class="answer-actions"><button class="primary" id="next">${s.index+1===s.list.length?'학습 결과 보기':'다음 문제'} →</button></div>${KanjiDetails.render(w)}`;$('#next').onclick=next;$('#next').focus({preventScroll:true})}
function next(){if(!session?.answered)return;if(++session.index<session.list.length)quiz();else result()}
function result(){let s=session;app.innerHTML=`<section class="quiz-shell"><div class="empty"><span class="eyebrow">ONE STEP FORWARD</span><h1>오늘도 한 걸음 더 가까워졌어요.</h1><p class="muted">${s.list.length}문제 중 ${s.correct}문제 정답</p><div class="result-score">${Math.round(s.correct/s.list.length*100)}<small style="font-size:20px">%</small></div><p class="muted">틀린 단어는 오답 노트에 저장했어요.</p><div style="margin-top:24px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="primary" id="again">한 번 더 학습하기</button><a class="secondary" href="#review">오답 노트</a><button class="secondary" id="home">홈으로</button></div></div><div class="word-table" style="margin-top:20px">${s.answers.map(a=>`<div class="word-row"><span>${a.correct?'✓':'↻'}</span><span class="japanese">${escape(a.word.word)}</span><span lang="ja">${escape(a.word.reading)}</span><span class="meaning">${escape(KanjiDetails.korean(a.word)||'한국어 뜻 확인 필요')}</span></div>`).join('')}</div></section>`;$('#again').onclick=()=>start(s.review);$('#home').onclick=()=>{session=null;route()}}
// Never synthesize Japanese with the browser's language-dependent voice engine.
function speak(word,silent=false){
 if(typeof KotobaAudio!=='undefined')KotobaAudio.play(word,{silent,notify:toast});
 else if(!silent)toast('일본어 발음 데이터를 불러오지 못했습니다.');
}
function wordPage(review){app.innerHTML=`<div class="section-head"><div><span class="eyebrow">${review?'REVISIT & REMEMBER':'YOUR WORD COLLECTION'}</span><h1>${review?'다시 만나면, 더 오래 기억해요.':'단어 하나씩, 나의 일본어로.'}</h1><p>${review?'틀린 단어를 복습하고 정답을 맞히면 목록에서 빠져요.':'N5부터 N1까지 일본어 표기·읽기·한국어 뜻을 검색해보세요.'}</p></div></div><div class="toolbar"><input id="search" type="search" aria-label="단어 검색" placeholder="일본어 · 읽기 · 한국어 뜻 검색"><select id="word-level" aria-label="급수 필터"><option value="all">모든 급수</option>${['N5','N4','N3','N2','N1'].map(l=>`<option>${l}</option>`).join('')}</select>${review?'<button class="primary" id="review-start">오답 복습 시작 →</button>':''}</div><div id="word-results"></div>`;$('#search').value=filter;$('#word-level').value=wordLevel;$('#search').oninput=e=>{filter=e.target.value;page=0;renderWords(review)};$('#word-level').onchange=e=>{wordLevel=e.target.value;page=0;renderWords(review)};if(review)$('#review-start').onclick=()=>start(true);renderWords(review)}
function renderWords(review){let list=(review?missed():WORDS).filter(w=>(wordLevel==='all'||w.level===wordLevel)&&[w.word,w.reading,KanjiDetails.korean(w)||''].some(s=>s.toLowerCase().includes(filter.toLowerCase())));let pages=Math.ceil(list.length/30);page=Math.max(0,Math.min(page,pages-1));$('#word-results').innerHTML=list.length?`<p class="muted" style="margin-bottom:12px">${list.length.toLocaleString()}개 단어 ${review?'· 복습은 모든 급수의 오답에서 출제됩니다.':''}</p><div class="word-table"><div class="word-row head"><span>급수</span><span>단어</span><span>읽기</span><span>뜻 (한국어)</span><span>듣기</span></div>${list.slice(page*30,page*30+30).map(w=>`<div class="word-row"><span class="badge">${w.level}</span><span class="japanese">${escape(w.word)}</span><span lang="ja">${escape(w.reading)}</span><span class="meaning">${escape(KanjiDetails.korean(w)||'한국어 뜻 확인 필요')}${KanjiDetails.korean(w)?'':` <a class="dictionary-link" href="${KanjiDetails.dictionaryUrl(w.word)}" target="_blank" rel="noopener noreferrer">사전 검색 ↗</a>`}</span><button class="sound" data-speak="${escape(w.id)}" aria-label="${escape(w.word)} 발음 듣기">♪</button></div>`).join('')}</div><div class="pager"><button id="prev-page" class="secondary" ${page===0?'disabled':''}>← 이전</button><span class="muted">${page+1} / ${pages}</span><button id="next-page" class="secondary" ${page>=pages-1?'disabled':''}>다음 →</button></div>`:`<div class="empty"><h2>${review&&!filter?'아직 복습할 단어가 없어요.':'검색 결과가 없어요.'}</h2><p class="muted">${review?'새로운 단어 퀴즈를 시작해보세요.':'다른 검색어나 급수를 선택해주세요.'}</p><a href="#home" class="secondary" style="display:inline-block;margin-top:20px">학습하러 가기</a></div>`;document.querySelectorAll('[data-speak]').forEach(b=>{const w=WORDS.find(w=>w.id===b.dataset.speak);b.onclick=()=>speak(w);b.addEventListener('pointerenter',()=>KotobaAudio.prepare([w]),{passive:true});b.addEventListener('focus',()=>KotobaAudio.prepare([w]))});if(list.length)KotobaAudio.prepare(list.slice(page*30,page*30+3));if($('#prev-page')){$('#prev-page').onclick=()=>{page--;renderWords(review)};$('#next-page').onclick=()=>{page++;renderWords(review)}}}
function about(){app.innerHTML=`<article class="notice"><span class="eyebrow">ABOUT KOTOBA</span><h1>매일 쌓는 일본어, 코토바</h1><p>무료로 사용하는 N5~N1 단어 학습 도구입니다. 읽기 퀴즈는 표기와 읽기가 다른 단어를 출제하며, 뜻 퀴즈와 정답 해설·단어장은 한국어 뜻으로 학습할 수 있습니다.</p><p>단어 데이터: <a href="https://github.com/evanclan/OpenJLPT">OpenJLPT</a>. JMdict (EDRDG), Jonathan Waller의 JLPT 분류에 기반합니다. 배포 데이터는 단어·읽기·급수·뜻으로 축약했습니다. <a href="DATA-LICENSE.txt">CC BY-SA 4.0</a> · <a href="DATA-NOTICE.md">상세 출처</a></p><p>한자 해설: 한국식 뜻·음은 libhangul, 일본어 음독·훈독은 OpenJLPT/KANJIDIC2를 사용합니다. OpenCC로 일본식 한자 표기를 연결했습니다. <a href="KANJI-NOTICE.md">출처·변경 내역</a> · <a href="HANJA-LICENSE.txt">libhangul 데이터 라이선스</a> · <a href="OPENCC-LICENSE.txt">OpenCC 라이선스</a>. 한국어 단어 뜻은 공개 사전 자료를 표기와 읽기로 대조해 연결했습니다. <a href="KOREAN-NOTICE.md">한국어 뜻 데이터 출처·변경 내역</a>에서 원본과 연결 방식을 확인할 수 있습니다.</p><p>급수는 학습용 추정 분류이며 공식 JLPT 출제 목록이나 시험 전체 범위를 보장하지 않습니다.</p><p>학습 기록은 먼저 이 브라우저에 저장됩니다. <a href="#records">기기 동기화</a>를 시작한 뒤 같은 연결 링크를 각 기기에서 열면 기존 기록을 합치고 새 답안도 자동 저장합니다. 서버 기록은 기존 UNION 프로젝트의 Cloudflare D1에 별도로 보관하며 연결 링크로 접근합니다. 일본어 발음은 읽기로 생성하고 음소·파일 검사를 통과한 Open JTalk MP3를 사용합니다. 파일을 불러오지 못하면 표기와 읽기가 정확히 일치하는 Tofugu/WaniKani 원어민 녹음(CC BY-SA 4.0)을 재시도합니다. 기기 음성은 일본어 음성이 확인될 때만 사용합니다. 기존 Melo 음원은 재생하지 않습니다. <a href="AUDIO-SOURCES.md">음원 출처·검증 범위·라이선스</a></p><p>화면과 학습 흐름 참고: <a href="https://blog.duolingo.com/guide-to-duolingo-practice-hub/">Duolingo</a>의 짧은 연습과 오답 복습, <a href="https://knowledge.wanikani.com/wanikani/srs/">WaniKani</a>의 복습 중심 학습. 코토바의 현재 복습은 오답 목록 방식입니다.</p><p><a href="https://github.com/mu0767/japanese">GitHub 소스 코드 ↗</a></p><a class="secondary" href="#home">← 학습으로 돌아가기</a></article>`}
document.addEventListener('keydown',e=>{if(!session||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||e.repeat)return;if(/^[1-4]$/.test(e.key)&&!session.answered){e.preventDefault();selectOption(Number(e.key)-1)}else if(e.key==='Enter'&&!session.answered&&session.selected!==null){e.preventDefault();answer(session.selected)}else if(e.key==='Enter'&&session.answered&&document.activeElement.id!=='next'){e.preventDefault();next()}});window.addEventListener('hashchange',()=>{page=0;route();window.scrollTo(0,0)});setupCloud();route();

function recordsPage(){
 if(!progressStore){app.innerHTML='<section class="empty"><h1>학습 기록을 불러올 수 없어요.</h1><p>브라우저에서 사이트 데이터 저장을 허용해주세요.</p></section>';return}
 state=progressStore.load();
 app.innerHTML='<section class="records-page"><div class="records-heading"><span class="eyebrow">LEARN ON ANY DEVICE</span><h1>학습 기록 · 자동 동기화</h1><p>연결된 모든 기기에서 같은 학습 기록을 사용합니다. 답안을 저장하면 자동으로 합치고, 다른 기기에서 사이트를 열면 이어서 학습할 수 있어요.</p></div><div class="records-stats" id="progress-stats" aria-label="전체 학습 기록"></div><div id="cloud-records"></div><a href="#home" class="secondary records-home">← 학습으로 돌아가기</a></section>';
 refreshRecordDashboard();
 if(cloudClient)cloudView=KotobaCloudUI.mount({container:$('#cloud-records'),client:cloudClient,toast});
}
function refreshRecordDashboard(){
 if(location.hash.split('?')[0]!=='#records'||!progressStore)return;
 const target=$('#progress-stats');if(!target)return;
 const s=progressStore.summary(),ratio=s.total?Math.round(s.correct/s.total*100):0;
 target.innerHTML='<div><span>푼 문제</span><strong>'+s.total.toLocaleString('ko-KR')+'<small>문제</small></strong></div><div><span>정답률</span><strong>'+ratio+'<small>%</small></strong></div><div><span>학습한 단어</span><strong>'+s.words.toLocaleString('ko-KR')+'<small>개</small></strong></div><div><span>오답 노트</span><strong>'+s.missed.toLocaleString('ko-KR')+'<small>개</small></strong></div>';
}
function progressChanged(next){
 state=next||progressStore.load();$('#review-count').textContent=missed().length;
 const routeName=location.hash.split('?')[0];
 if(routeName==='#records')refreshRecordDashboard();
 if(session)return;
 if(routeName==='#review'||routeName==='#words')renderWords(routeName==='#review');
 else if(!routeName||routeName==='#home')home();
}
function setupCloud(){
 if(!progressStore||typeof KotobaCloud==='undefined')return;
 try{
  cloudClient=KotobaCloud.createClient({store:progressStore,storage:localStorage,onChange:progressChanged,onStatus:()=>{refreshRecordDashboard();refreshHomeSyncStatus()}});
  cloudClient.start();
 }catch{toast('자동 동기화를 준비하지 못했습니다. 현재 기기 기록은 그대로 보관됩니다.')}
}
window.addEventListener('storage',e=>{
 if(!progressStore||!['kotoba-v1','kotoba-progress-v2'].includes(e.key))return;
 try{progressChanged(progressStore.load());cloudClient?.schedule()}catch{toast('다른 탭의 학습 기록을 불러오지 못했습니다.')}
});
