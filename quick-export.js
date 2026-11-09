(function(root){
  'use strict';
  // One-time progress export. The existing ProgressStore exportData() is the
  // canonical versioned format, without cloud keys, account tokens or links.
  function mount({store,toast=()=>{}}={}){
    if(!store||typeof store.exportData!=='function')return null;
    if(document.getElementById('quick-export-trigger'))return null;
    const dock=document.createElement('div');
    dock.className='quick-export-dock';
    dock.innerHTML=[
      '<button id="quick-export-trigger" class="quick-export-trigger" type="button" aria-controls="quick-export-panel" aria-expanded="false">⧉ 기록 내보내기</button>',
      '<section id="quick-export-panel" class="quick-export-panel" role="dialog" aria-modal="false" aria-labelledby="quick-export-title" hidden>',
      '<div class="quick-export-heading"><h2 id="quick-export-title">이 기기의 학습 기록</h2>',
      '<button id="quick-export-close" type="button" aria-label="내보내기 창 닫기">✕</button></div>',
      '<p>현재 기기의 학습 기록을 복사합니다. 복사한 내용을 이 채팅에 붙여넣거나 JSON 파일을 보내주세요.</p>',
      '<div id="quick-export-summary" class="quick-export-summary"></div>',
      '<div class="quick-export-buttons">',
      '<button id="quick-export-copy" class="quick-export-copy" type="button">기록 다시 복사</button>',
      '<button id="quick-export-download" class="quick-export-download" type="button">JSON 파일 저장</button></div>',
      '<div id="quick-export-message" class="quick-export-message" role="status" aria-live="polite"></div>',
      '<label for="quick-export-text">복사가 안 되면 아래 내용을 길게 눌러 직접 복사하세요.</label>',
      '<textarea id="quick-export-text" readonly spellcheck="false" rows="4" aria-label="내보낼 코토바 학습 기록"></textarea>',
      '<a href="#records" class="quick-export-import">나중에 합친 기록 가져오기</a>',
      '<small>정답·오답·학습 날짜·기기별 중복 제거 정보만 포함하며 동기화 연결 키는 포함하지 않습니다.</small>',
      '</section>'
    ].join('');
    document.body.appendChild(dock);
    const q=s=>dock.querySelector(s);
    const trigger=q('#quick-export-trigger'),panel=q('#quick-export-panel'),output=q('#quick-export-text');
    const message=q('#quick-export-message');
    const show=()=>{panel.hidden=false;trigger.setAttribute('aria-expanded','true')};
    const hide=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false')};
    const status=(text,error=false)=>{message.textContent=text;message.classList.toggle('is-error',error)};
    function currentData(){
      // Re-read storage on every click, never export an earlier snapshot.
      const data=store.exportData();
      const parsed=JSON.parse(data);
      const total=Object.values(parsed.components).reduce((n,c)=>n+c.total,0);
      output.value=data;
      q('#quick-export-summary').textContent='총 '+total.toLocaleString('ko-KR')+'문제 · 기기 '+Object.keys(parsed.components).length+'개 기록';
      return data;
    }
    async function copy(){
      let data;
      try{data=currentData()}catch(error){show();status(error.message||'기록을 읽을 수 없습니다.',true);return}
      show();
      let success=false;
      if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){
        try{await navigator.clipboard.writeText(data);success=true}catch{}
      }
      if(!success){
        output.focus();output.select();
        try{success=!!document.execCommand('copy')}catch{}
      }
      if(success){
        status('복사 완료! 이 채팅으로 돌아가 붙여넣어주세요.');
        toast('학습 기록을 복사했습니다.');
      }else{
        status('자동 복사를 허용하지 않는 브라우저입니다. 아래 기록을 길게 눌러 직접 복사하거나 JSON 파일을 저장해주세요.',true);
      }
    }
    function download(){
      try{
        const data=currentData();
        const blob=new Blob([data],{type:'application/json;charset=utf-8'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        const stamp=new Date().toISOString().slice(0,10);
        a.href=url;a.download='kotoba-progress-'+stamp+'.json';
        a.hidden=true;dock.appendChild(a);a.click();a.remove();
        setTimeout(()=>URL.revokeObjectURL(url),30000);
        show();status('JSON 파일 저장을 시작했습니다. 다운로드 목록을 확인해주세요.');
      }catch(error){show();status(error.message||'기록 파일을 만들 수 없습니다.',true)}
    }
    trigger.onclick=()=>{void copy()};
    q('#quick-export-copy').onclick=()=>{void copy()};
    q('#quick-export-download').onclick=download;
    q('#quick-export-close').onclick=hide;
    q('.quick-export-import').onclick=hide;
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){hide();trigger.focus()}});
    return {copy,download,close:hide};
  }
  root.KotobaQuickExport={mount};
})(typeof window!=='undefined'?window:globalThis);
