# 코토바 · KOTOBA

N5~N1 일본어 단어 7,811개를 학습하는 반응형 정적 웹사이트입니다.

- 히라가나 읽기 / 한국어 뜻 4지선다 퀴즈, 10·20·50문제
- 오답 복습, 단어 검색, 원어민 음원 우선 + 전체 7,811개에 자체 서버 보관 WAV 발음 + 브라우저 일본어 음성 합성 최후 fallback
- 기본 출제는 미학습·오답 우선, 전체 단어로 다시 학습 가능
- 정답 확인 후 한자별 한국식 뜻·음(예: 暖 따뜻할 난), 일본어 음독·훈독 해설
- 정답률, 연속 학습, 최근 7일 기록 (브라우저 localStorage)
- 모바일과 키보드 지원. 별도 API 키·로그인 불필요
- 기기 연결 링크로 기록 합치기·자동 동기화, JSON 파일 백업

## GitHub Pages

저장소 Settings → Pages → Build and deployment에서 **Deploy from a branch**, **main**, **/ (root)**를 선택하고 Save 합니다.
배포 주소: https://mu0767.github.io/japanese/

모든 자산 경로가 상대 경로이므로 GitHub Pages 하위 경로에서도 실행됩니다. `index.html`을 직접 열어도 사용할 수 있습니다.

## 검증

Node.js에서 `node test.cjs`. 모든 단어에 대해 급수별 선택지의 정답 포함·중복 방지와 오답 저장/해제를 검사합니다.

## 데이터

OpenJLPT에서 가져온 데이터의 필드를 축약했습니다. CC BY-SA 4.0. DATA-NOTICE.md와 DATA-LICENSE.txt 참고.
전체 7,811개 단어의 뜻을 한국어로 제공합니다. 급수는 공식 출제 목록이 아닌 커뮤니티 학습용 분류입니다.
기기 동기화를 한 번 연결하면 기존 기록을 합치고 이후 진도를 공유합니다. 기존 UNION Site의 Cloudflare D1을 사용하며 GitHub에는 개인 기록을 저장하지 않습니다. 연결 방법과 데이터 구조는 [PROGRESS.md](PROGRESS.md) 참조. 원어민 음원이 있는 4,199개는 녹음을 우선 사용합니다. 전체 7,811개에 서버에 저장된 일본어 WAV가 별도로 있어, 녹음이 없는 3,612개와 외부 녹음 불러오기 실패 시 즉시 자체 WAV를 시도합니다. 두 경로가 모두 불가능하면 일본어(`ja-JP`) 기기 합성 음성을 최후로 시도합니다. 브라우저에 일본어 음성 엔진이 없는 경우 정확한 발음은 보장할 수 없으며, 합성 실패 시 오류를 표시합니다. 음원 출처와 재생 방식은 [AUDIO-SOURCES.md](AUDIO-SOURCES.md) 참조.

한자 해설은 OpenJLPT/KANJIDIC2, libhangul, OpenCC의 정적 데이터를 결합했습니다. KANJI-NOTICE.md와 각 라이선스 참조. 한국식 풀이가 없는 글자는 없다고 표시합니다.

한국어 뜻은 KRDict, 위키낱말사전, 공개 영한 사전의 대조와 검토 보충 번역으로 구성했습니다. ID별로 연결해 읽기가 다른 동형어를 구분하며, 기존 학습 기록 키를 유지합니다. 출처·변경·라이선스는 KOREAN-NOTICE.md, 개수는 korean-coverage.json 참조.

검증: `node test-korean.cjs`, `node test-kanji.cjs`. 선택된 원본 근거로 재생성: `node build-korean.cjs --from-snapshot`.

UI 참고: Duolingo의 짧은 연습과 오답 복습, WaniKani의 복습 중심 학습. 디자인은 코토바용으로 작성했습니다.

진도 검증: `node test-progress.cjs`, `node test-cloud-sync.cjs`, `node qa/qa-progress-browser.cjs`, `node qa/qa-cloud-browser.cjs`. 실제 배포 연결은 `node qa/qa-cloud-browser.cjs --live https://mu0767.github.io/japanese/`로 검증합니다.
