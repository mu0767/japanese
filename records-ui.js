(function(root){
  'use strict';
  const MAX_BYTES=2*1024*1024;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>Number.isFinite(n)&&n>=0?n:0;
  const fmt=n=>number(n).toLocaleString('ko-KR');
  function summarize(value){
    value=value||{};
    const words=value.words&&typeof value.words==='object'?Object.values(value.words):null;
    const total=number(value.total),correct=number(value.correct);
    return {total,correct,accuracy:total?Math.round(correct/total*100):0,
      learned:words?words.filter(w=>w&&w.right>0&&!w.missed).length:number(value.learned??value.learnedWords??value.mastered),
      missed:words?words.filter(w=>w&&w.missed).length:number(value.missed??value.missedWords),
      answered:words?words.length:number(value.answered??value.answeredWords??value.wordCount??value.words)};
  }
  function render(options){
    const {store,onChange=()=>{},toast=()=>{}}=options;
    const container=typeof options.container==='string'?document.querySelector(options.container):options.container;
    if(!container||!store)throw new Error('학습 기록 화면을 열 수 없습니다.');
    let pendingText='',lastPreview=null,fileRead=0;
    const q=selector=>container.querySelector(selector);
    container.innerHTML=`<section class="records-page"><div class="records-heading"><span class="eyebrow">KEEP YOUR LEARNING TOGETHER</span><h1>학습 기록 모아보기</h1><p>휴대폰·Chrome·Edge에 따로 쌓인 기록을 파일로 옮겨 하나로 합칠 수 있어요.</p></div><div id="progress-stats" class="records-stats" aria-label="현재 브라우저의 학습 기록"></div><p class="records-local-note">자동 동기화는 위에서 기기를 연결하면 사용할 수 있어요. 아래 파일 기능은 별도 백업이나 수동 합치기에 사용합니다.</p><div class="records-grid"><section class="records-card"><div class="records-step">01 · 이 기기의 기록 보관하기</div><h2>기록 내보내기</h2><p>먼저 각 기기에서 파일을 하나씩 저장해주세요. 정답·오답과 날짜별 학습 횟수가 함께 들어갑니다.</p><label class="records-label" for="progress-label">파일에 붙일 이름 <span>(선택)</span></label><input id="progress-label" maxlength="40" placeholder="예: PC-Chrome, PC-Edge, 휴대폰" autocomplete="off"><button id="export-progress" class="primary" type="button">기록 파일 저장 ↓</button><details class="records-text-backup"><summary>파일 대신 텍스트로 복사하기</summary><p>휴대폰에서 파일을 보내기 어렵다면 기록 텍스트를 복사해 옮길 수 있어요.</p><button id="prepare-progress-text" class="secondary" type="button">기록 텍스트 만들기</button><textarea id="progress-export-text" rows="5" readonly aria-label="내보낼 학습 기록 텍스트" placeholder="기록 텍스트 만들기를 눌러주세요."></textarea><button id="copy-progress" class="secondary" type="button" disabled>기록 텍스트 복사</button></details></section><section class="records-card"><div class="records-step">02 · 다른 기기의 기록 합치기</div><h2>기록 가져오기</h2><p>다른 기기에서 저장한 코토바 기록 파일을 선택하거나 복사한 텍스트를 붙여넣어주세요.</p><label class="records-file" for="progress-file">기록 파일 선택 <span>JSON · 최대 2MB</span><input id="progress-file" type="file" accept="application/json,.json"></label><label class="records-label" for="progress-json">또는 기록 텍스트 붙여넣기</label><textarea id="progress-json" rows="5" placeholder="다른 기기의 코토바 기록 텍스트" spellcheck="false"></textarea><button id="preview-progress" class="secondary" type="button">합칠 기록 확인</button><div id="progress-import-status" class="records-status" role="status" aria-live="polite"></div><div id="progress-preview" hidden></div><button id="merge-progress" class="primary" type="button" disabled>기록 합치기</button><p class="records-footnote">같은 기록 파일을 다시 가져와도 횟수를 중복해서 더하지 않아요. 기존 기록은 병합 전에 자동 백업됩니다.</p></section></div><section class="records-help"><h2>한 번에 모으는 순서</h2><ol><li>휴대폰, Chrome, Edge 각각에서 <b>기록 파일 저장</b>을 누릅니다.</li><li>한 기기에서 나머지 파일들을 <b>기록 가져오기</b>로 차례대로 합칩니다.</li><li>합쳐진 기록을 다시 내보내 다른 기기에도 가져오면 됩니다.</li></ol><p>백업 파일에는 학습 기록만 담기며 기기 연결 링크는 포함되지 않습니다. 동기화에 연결한 기기의 기록은 Cloudflare D1에도 보관됩니다.</p><button id="restore-progress" class="records-restore" type="button" ${typeof store.restoreBackup==='function'?'':'hidden'}>직전 병합 전 기록으로 되돌리기</button><div id="progress-restore-status" class="records-status" role="status" aria-live="polite"></div></section><a class="secondary records-home" href="#home">← 학습으로 돌아가기</a></section>`;
    const status=(message,error=false)=>{const el=q('#progress-import-status');el.textContent=message;el.classList.toggle('is-error',error)};
    const errorText=error=>error instanceof Error?error.message:'기록을 처리하지 못했습니다. 파일 내용을 확인해주세요.';
    const refresh=()=>{const s=summarize(store.load());q('#progress-stats').innerHTML=`<div><span>푼 문제</span><strong>${fmt(s.total)}<small>문제</small></strong></div><div><span>정답률</span><strong>${fmt(s.accuracy)}<small>%</small></strong></div><div><span>맞힌 단어</span><strong>${fmt(s.learned)}<small>개</small></strong></div><div><span>오답 노트</span><strong>${fmt(s.missed)}<small>개</small></strong></div>`;if(typeof store.hasBackup==='function')q('#restore-progress').disabled=!store.hasBackup()||!!options.isCloudConnected?.();q('#restore-progress').title=options.isCloudConnected?.()?'동기화 연결을 해제한 뒤 사용할 수 있습니다. 서버의 기록은 삭제되지 않습니다.':'';return s};
    const invalidate=()=>{pendingText='';lastPreview=null;q('#merge-progress').disabled=true;q('#progress-preview').hidden=true;status('')};
    const makeText=()=>{const text=store.exportData();if(typeof text!=='string')throw new Error('기록 파일을 만들지 못했습니다.');return text};
    const checkSize=text=>{if(new Blob([text]).size>MAX_BYTES)throw new Error('2MB 이하의 코토바 기록 파일을 선택해주세요.')};
    const preview=()=>{
      invalidate();const text=q('#progress-json').value.trim();
      try{
        if(!text)throw new Error('기록 파일을 선택하거나 기록 텍스트를 붙여넣어주세요.');
        checkSize(text);const result=store.previewImport(text),before=summarize(result.before),after=summarize(result.after);
        pendingText=text;lastPreview=result;
        q('#progress-preview').innerHTML=`<div class="records-preview-title">합치기 전 확인</div><table><thead><tr><th>기록</th><th>현재</th><th>합친 뒤</th></tr></thead><tbody><tr><th>푼 문제</th><td>${fmt(before.total)}</td><td>${fmt(after.total)}</td></tr><tr><th>정답</th><td>${fmt(before.correct)}</td><td>${fmt(after.correct)}</td></tr><tr><th>오답 노트</th><td>${fmt(before.missed)}</td><td>${fmt(after.missed)}</td></tr></tbody></table><p>${result.alreadyIncluded?'이미 포함된 기록입니다. 다시 합쳐도 중복 집계되지 않습니다.':`푼 문제 ${fmt(Math.max(0,after.total-before.total))}개가 추가됩니다.`}</p>${Array.isArray(result.warnings)&&result.warnings.length?'<ul class="records-warnings">'+result.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>':''}`;
        q('#progress-preview').hidden=false;q('#merge-progress').disabled=false;status('확인한 뒤 기록 합치기를 눌러주세요.');return result;
      }catch(error){status(errorText(error),true);return null}
    };
    const download=()=>{
      try{
        const text=makeText(),blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
        const raw=q('#progress-label').value.trim(),label=raw.replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,40)||'이-기기';
        const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
        const link=document.createElement('a');link.href=url;link.download=`kotoba-progress-${stamp}-${label}.json`;link.hidden=true;container.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
        toast('기록 파일 저장을 시작했습니다. 다운로드 목록을 확인해주세요.');return text;
      }catch(error){status(errorText(error),true);return null}
    };
    q('#export-progress').onclick=download;
    q('#prepare-progress-text').onclick=()=>{try{q('#progress-export-text').value=makeText();q('#copy-progress').disabled=false}catch(error){status(errorText(error),true)}};
    q('#copy-progress').onclick=async()=>{const output=q('#progress-export-text');try{await navigator.clipboard.writeText(output.value);toast('기록 텍스트를 복사했습니다.')}catch{output.focus();output.select();try{if(document.execCommand('copy')){toast('기록 텍스트를 복사했습니다.');return}}catch{}toast('선택된 기록 텍스트를 직접 복사해주세요.')}};
    q('#progress-json').oninput=()=>{fileRead++;invalidate()};
    q('#progress-file').onchange=async()=>{const file=q('#progress-file').files?.[0],version=++fileRead;invalidate();if(!file)return;try{if(file.size>MAX_BYTES)throw new Error('2MB 이하의 코토바 기록 파일을 선택해주세요.');const text=await file.text();if(version!==fileRead)return;q('#progress-json').value=text;preview()}catch(error){if(version===fileRead)status(errorText(error),true)}};
    q('#preview-progress').onclick=preview;
    q('#merge-progress').onclick=()=>{
      if(!pendingText||!lastPreview)return;
      q('#merge-progress').disabled=true;
      try{const result=store.importData(pendingText);const next=result?.state||store.load();onChange(next);const s=refresh();pendingText='';lastPreview=null;q('#progress-preview').hidden=true;status(`기록을 합쳤습니다. 현재 ${fmt(s.total)}문제 · 정답 ${fmt(s.correct)}문제입니다. 합쳐진 파일을 다른 기기에도 가져와주세요.`);toast('학습 기록을 합쳤습니다.')}catch(error){status(errorText(error),true);q('#merge-progress').disabled=false}
    };
    q('#restore-progress').onclick=()=>{if(options.isCloudConnected?.())return;try{const result=store.restoreBackup(),next=result?.state||result||store.load();onChange(next);refresh();invalidate();q('#progress-restore-status').textContent='직전 병합 전 기록으로 되돌렸습니다.';toast('직전 기록으로 되돌렸습니다.')}catch(error){q('#progress-restore-status').textContent=errorText(error)}};
    refresh();
    if(options.autoExportLabel){q('#progress-label').value=String(options.autoExportLabel).slice(0,40);setTimeout(download,0)}
    return {refresh,exportData:makeText,previewImport:preview};
  }
  root.RecordsUI={render};
})(typeof window!=='undefined'?window:globalThis);
