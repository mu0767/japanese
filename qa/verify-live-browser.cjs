// Browser-level smoke test for the PUBLIC Kotoba page. Uses playwright-core + Chrome.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const base=(process.argv[2]||'https://mu0767.github.io/japanese/').replace(/\/?$/,'/');
(async()=>{
  const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
  const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(base+'?verify='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
    const update=page.locator('header .header-note');
    assert(await update.isVisible(),'Mobile header must show latest update timestamp');
    assert.match(await update.textContent(),/최근 갱신 · 20[0-9]{2}[.][0-9]{2}[.][0-9]{2} [0-9]{2}:[0-9]{2}/);
    const headerBox=await page.locator('header').boundingBox(),noteBox=await update.boundingBox();
    assert(noteBox.x+noteBox.width<=390+1,'Mobile update timestamp must fit on screen');
    assert(noteBox.y>=headerBox.y&&noteBox.y+noteBox.height<=headerBox.y+headerBox.height+1,'Timestamp must remain within mobile header');
    // Verify persistent device audio: one-time download, then playback even if
    // the audio network endpoint is unavailable in this browser session.
    const offlineSample=await page.evaluate(async()=>{
      const zero=WORDS.find(w=>w.word==='ゼロ');
      const url=KotobaAudio.archiveSource(zero);
      const result=await KotobaOfflineAudio.download([zero]);
      const status=await KotobaOfflineAudio.status(WORDS);
      const original=window.fetch;
      let networkAttempts=0,bytes=0;
      window.fetch=async(...args)=>{
        if(String(args[0]).includes('/pronunciation/')){
          networkAttempts++;throw Error('Network intentionally unavailable');
        }
        return original(...args);
      };
      try{bytes=(await KotobaOfflineAudio.getBlob(url)).size}
      finally{window.fetch=original}
      return {result,statusStored:status.stored,bytes,networkAttempts};
    });
    assert.equal(offlineSample.result.downloaded,1,'Could not save the ゼロ MP3 for reuse');
    assert(offlineSample.statusStored>=1);
    assert(offlineSample.bytes>1000,'Cached MP3 is invalid');
    assert.equal(offlineSample.networkAttempts,0,'Cached pronunciation still makes a network request');
    assert(await page.locator('#audio-cache-all').isVisible(),'Whole-library download control missing');
    await page.locator('#start').click();
    assert.equal(await page.locator('#quick-export-trigger').count(),0,'Legacy export button still visible');
    await page.goto(base+'#records');
    await page.locator('#progress-stats').waitFor();
    assert.equal(await page.locator('#progress-file').count(),0,'Manual import screen still visible');
    assert.equal(await page.locator('#cloud-enable').count(),0,'New random sync key must not be generated');
    assert(await page.locator('#cloud-sync-off').isVisible(),'Unconnected browser needs one-time link help');
    await page.goto(base+'#home');
    const natives=await page.evaluate(()=>{
      const hashiru=WORDS.find(w=>w.word==='走る'&&w.reading==='はしる');
      const utau=WORDS.find(w=>w.word==='歌う'&&w.reading==='うたう');
      return {a:KotobaAudio.sources(hashiru),b:KotobaAudio.sources(utau),gloss:KanjiDetails.korean(utau)};
    });
    assert(natives.a.some(s=>s.endsWith('.mp3')),'Native Hashiru audio URL missing');
    assert(natives.b.some(s=>s.endsWith('.mp3')),'Native Utau audio URL missing');
    assert.equal(natives.gloss,'노래하다');
    await page.locator('#home-sync-state').waitFor();
    assert.match(await page.locator('#home-sync-state').textContent(),/로컬 학습 기록만 표시 중/,'Disconnected mobile must not mislabel local counts as synced');
    await page.locator('#start').click();
    const options=page.locator('[data-option]');
    assert.equal(await options.count(),4);
    const labels=await options.locator('span:nth-child(2)').allTextContents();
    const correctLabel=await page.evaluate(()=>session.q.answer);
    const wrongIndex=labels.findIndex(x=>x!==correctLabel);
    assert(wrongIndex>=0);
    await options.nth(wrongIndex).click();
    assert(await page.locator('#confirm').isEnabled());
    await page.locator('#confirm').click();
    assert.equal(await page.locator('.option.correct').count(),1);
    assert.equal(await page.locator('.option.wrong').count(),1);
    assert.equal(await page.locator('.option.selected').count(),0);
    const colors=await page.evaluate(()=>[getComputedStyle(document.querySelector('.option.correct')).backgroundColor,getComputedStyle(document.querySelector('.option.wrong')).backgroundColor]);
    assert.notEqual(...colors,'Correct and wrong options have the same color');
    assert.equal(await page.locator('.option-gloss').count(),4);
    for(const gloss of await page.locator('.option-gloss').allTextContents())assert(!gloss.includes('사전 검색 필요'),'N5 must have Korean glosses');
    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('kotoba-v1')).total);
    await page.locator('.option.wrong').click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kotoba-v1')).total),before,'Replaying audio altered score');
    const positions=await page.evaluate(()=>({next:document.querySelector('#next').getBoundingClientRect().top,kanji:document.querySelector('.word-explanation')?.getBoundingClientRect().top||Infinity}));
    assert(positions.next<positions.kanji,'Next button should precede explanation');
    // Deterministic N4 case: verify the external KRDict overlay is used by the actual UI.
    await page.evaluate(()=>{
      level='N4';mode='reading';
      const sourceWord=WORDS.find(w=>w.level==='N4'&&w.word==='石');
      if(!sourceWord)throw new Error('No N4 source word found');
      session={list:[sourceWord],index:0,correct:0,review:false,answers:[],answered:false,selected:null,q:null};
      quiz();
    });
    const n4answer=await page.evaluate(()=>session.q.answer);
    const n4labels=await page.locator('[data-option]>span:nth-child(2)').allTextContents();
    await page.locator('[data-option]').nth(n4labels.indexOf(n4answer)).click();
    await page.locator('#confirm').click();
    const targetGloss=await page.locator('.option.correct .option-gloss').textContent();
    assert(targetGloss.includes('돌'),'Sourced N4 Korean meaning did not appear in the actual quiz: '+targetGloss);
    for(const gloss of await page.locator('.option-gloss').allTextContents())
      assert(!gloss.includes('사전 검색 필요'),'Distractor with missing Korean meaning was selected: '+gloss);
    // Audio → Korean meaning is a separate test type, not a variation that leaks the printed word.
    await page.evaluate(()=>{session=null;home()});
    assert.equal(await page.locator('#mode option[value="listening"]').count(),1,'Listening test missing from mode selector');
    const listeningStart=await page.evaluate(()=>{
      level='N5'; mode='listening';scope='all';size=10;
      const target=WORDS.find(w=>w.word==='料理'&&w.reading==='りょうり');
      window.__realAudioPlay=KotobaAudio.play;
      window.__spokenTestWords=[];
      KotobaAudio.play=w=>{window.__spokenTestWords.push(w.id);return Promise.resolve(true)};
      session={list:[target],index:0,correct:0,review:false,answers:[],answered:false,selected:null,q:null};
      const previous=state.total;
      quiz();
      return {id:target.id,word:target.word,reading:target.reading,answer:KanjiDetails.korean(target),previous,spoken:window.__spokenTestWords.slice()};
    });
    assert.deepEqual(listeningStart.spoken,[listeningStart.id],'Listening question must automatically play Japanese pronunciation');
    assert.equal(await page.locator('.question-card .listening-icon').count(),1,'Audio-only question illustration missing');
    const questionHtml=await page.locator('.question-card').innerHTML();
    assert(!questionHtml.includes(listeningStart.word)&&!questionHtml.includes(listeningStart.reading),'Question must NOT reveal Japanese spelling or reading before answer');
    assert.equal(await page.locator('.listening-reveal').count(),0,'Answer is visible before grading');
    const audioOptions=await page.locator('[data-option] > span:nth-child(2)').allTextContents();
    assert.equal(audioOptions.length,4);
    assert.equal(new Set(audioOptions).size,4,'Korean listening choices must be distinct');
    assert(audioOptions.includes(listeningStart.answer),'Listening quiz has no correct Korean answer');
    await page.locator('#speak').click();
    assert.equal(await page.evaluate(()=>window.__spokenTestWords.length),2,'Replay button must repeat the same audio before answer');
    await page.locator('[data-option]').nth(audioOptions.indexOf(listeningStart.answer)).click();
    await page.locator('#confirm').click();
    assert.equal(await page.locator('.option.correct').count(),1);
    assert((await page.locator('.listening-reveal').textContent()).includes(listeningStart.word));
    assert((await page.locator('.listening-reveal').textContent()).includes(listeningStart.reading));
    assert((await page.locator('.listening-reveal').textContent()).includes(listeningStart.answer));
    await page.locator('#replay-answer').click();
    const listeningEnd=await page.evaluate(()=>{
      const snapshot={spoken:window.__spokenTestWords.slice(),total:state.total,correct:session.correct,answers:session.answers.map(a=>({id:a.word.id,correct:a.correct}))};
      KotobaAudio.play=window.__realAudioPlay;
      delete window.__realAudioPlay;
      delete window.__spokenTestWords;
      return snapshot;
    });
    assert.equal(listeningEnd.spoken.length,3,'Replaying answer must use same target audio');
    assert.equal(listeningEnd.total,listeningStart.previous+1,'Listening result not saved in progress');
    assert.equal(listeningEnd.correct,1);
    assert.deepEqual(listeningEnd.answers,[{id:listeningStart.id,correct:true}]);
    console.log('PASS: audio-first quiz hides Japanese, autoplays, four Korean choices, replay, reveals answer and records score.');
    console.log('PASS: public site 390px quiz, sourced N4 meanings, Korean distractors, colors, audio replay and score.');
    // Default study scope must exclude correctly learned words, but include missed and unseen.
    const scopeState=await page.evaluate(()=>{
      level='N5';mode='reading';scope='pending';size=10;
      const candidates=WORDS.filter(w=>w.level==='N5'&&Kotoba.normalize(w.word)!==Kotoba.normalize(w.reading));
      const unseen=candidates[0],missedWord=candidates[1];
      for(const w of candidates)state.words[w.id]={right:1,wrong:0,missed:false};
      delete state.words[unseen.id];
      state.words[missedWord.id]={right:2,wrong:1,missed:true};
      start(false);
      return {chosen:session.list.map(w=>w.id),unseen:unseen.id,missed:missedWord.id};
    });
    assert.deepEqual(new Set(scopeState.chosen),new Set([scopeState.unseen,scopeState.missed]),'Default quiz included learned words');
    const allState=await page.evaluate(()=>{scope='all';start(false);return session.list.length});
    assert.equal(allState,10,'All-words scope should allow previously mastered words');
    console.log('PASS: default excludes mastered words, keeps missed/unseen, optional all-words review');


  }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
