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
    console.log('PASS: public site 390px quiz, sourced N4 meanings, Korean distractors, colors, audio replay and score.');

  }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
