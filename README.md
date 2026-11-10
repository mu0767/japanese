# 코토바 · KOTOBA

N5~N1 일본어 단어 7,811개를 학습하는 반응형 정적 웹사이트입니다.

- 히라가나 읽기 / 한국어 뜻 4지선다 퀴즈, 10·20·50문제
- 오답 복습, 단어 검색, 전체 7,811개 읽기 기반 MP3 발음, 음성 사전 로딩 및 기기 영구 캐시 옵션
- 기본 출제는 미학습·오답 우선, 전체 단어로 다시 학습 가능
- 정답 확인 후 한자별 한국식 뜻·음(예: 暖 따뜻할 난), 일본어 음독·훈독 해설
- 정답률, 연속 학습, 최근 7일 기록 (브라우저 localStorage)
- 모바일과 키보드 지원. 별도 API 키·로그인 불필요
- 기기 연결 링크로 기록 합치기·자동 동기화, JSON 파일 백업

## 발음 음원 미리 저장

전체 발음은 읽기에서 생성한 MP3 파일입니다. 선택한 급수 또는 전체 음원을 기기에 미리 저장할 수 있습니다. 기존 Melo WAV 캐시는 자동 폐기하고 새 MP3 캐시를 사용합니다. 학습 기록은 유지합니다.

- 홈 화면에서 **N5~N1 중 현재 급수 음원 미리 저장** 또는 **전체 7,811개 저장**을 명시적으로 선택할 수 있습니다.
- 브라우저 CacheStorage에 음원을 한 번만 저장합니다. 같은 기기에서 다시 시작하면 저장 완료한 단어는 건너뛰고 나머지부터 이어받습니다.
- 다운로드 진행률, 저장 완료 건수, 일시정지, 저장 공간 부족 및 개별 음원 실패를 표시합니다.
- 사용자가 저장 버튼을 누르지 않아도, 퀴즈에 등장한 보기 4개는 자동으로 메모리와 브라우저 캐시에 미리 적재합니다.
- 저장된 음원은 기기 인터넷이 없거나 서버에 연결할 수 없더라도 이미 내려받은 파일을 이용할 수 있습니다. 사이트 자체의 오프라인 실행을 보장하지는 않습니다.
- 기기별로 별도 저장됩니다. 브라우저 캐시 정리·시크릿 모드·저장 공간 부족·브라우저의 자동 축출 정책에 따라 삭제될 수 있습니다. 따라서 보존이 영구적이라고 보장하지 않습니다.
- 전체 다운로드는 모바일 데이터 요금과 저장 공간을 고려하여 자동 시작하지 않습니다. Wi-Fi 이용을 권장합니다.

검증: `node test-audio.cjs`, `node test-audio-offline.cjs`, `node qa/verify-live.cjs`.

## GitHub Pages

저장소 Settings → Pages → Build and deployment에서 **Deploy from a branch**, **main**, **/ (root)**를 선택하고 Save 합니다.
배포 주소: https://mu0767.github.io/japanese/

모든 자산 경로가 상대 경로이므로 GitHub Pages 하위 경로에서도 실행됩니다. `index.html`을 직접 열어도 사용할 수 있습니다.

## 검증

Node.js에서 `node test.cjs`. 모든 단어에 대해 급수별 선택지의 정답 포함·중복 방지와 오답 저장/해제를 검사합니다.

## 데이터

OpenJLPT에서 가져온 데이터의 필드를 축약했습니다. CC BY-SA 4.0. DATA-NOTICE.md와 DATA-LICENSE.txt 참고.
전체 7,811개 단어의 뜻을 한국어로 제공합니다. 급수는 공식 출제 목록이 아닌 커뮤니티 학습용 분류입니다.
기기 동기화를 한 번 연결하면 기존 기록을 합치고 이후 진도를 공유합니다. 기존 UNION Site의 Cloudflare D1을 사용하며 GitHub에는 개인 기록을 저장하지 않습니다. 연결 방법과 데이터 구조는 [PROGRESS.md](PROGRESS.md) 참조. 발음은 표기·읽기가 정확하게 일치하는 원어민 녹음을 우선 재생합니다. 원어민 녹음이 없으면 사전의 읽기를 일본어 기기 TTS에 전달하고, 일본어 음성을 사용할 수 없으면 Open JTalk MP3로 대체합니다. TTS의 단어별 악센트와 합성 음원의 자연스러움은 별도의 청취 검증이 필요합니다. 기존 Melo WAV는 사용하지 않습니다. [검증 범위와 출처](AUDIO-SOURCES.md)를 확인하세요.

한자 해설은 OpenJLPT/KANJIDIC2, libhangul, OpenCC의 정적 데이터를 결합했습니다. KANJI-NOTICE.md와 각 라이선스 참조. 한국식 풀이가 없는 글자는 없다고 표시합니다.

한국어 뜻은 KRDict, 위키낱말사전, 공개 영한 사전의 대조와 검토 보충 번역으로 구성했습니다. ID별로 연결해 읽기가 다른 동형어를 구분하며, 기존 학습 기록 키를 유지합니다. 출처·변경·라이선스는 KOREAN-NOTICE.md, 개수는 korean-coverage.json 참조.

검증: `node test-korean.cjs`, `node test-kanji.cjs`. 선택된 원본 근거로 재생성: `node build-korean.cjs --from-snapshot`.

UI 참고: Duolingo의 짧은 연습과 오답 복습, WaniKani의 복습 중심 학습. 디자인은 코토바용으로 작성했습니다.

진도 검증: `node test-progress.cjs`, `node test-cloud-sync.cjs`, `node qa/qa-progress-browser.cjs`, `node qa/qa-cloud-browser.cjs`. 실제 배포 연결은 `node qa/qa-cloud-browser.cjs --live https://mu0767.github.io/japanese/`로 검증합니다.

발음 전수 검사: `node qa/audit-pronunciation.cjs --require-assets --verify-native`. 배포 파일 전부 확인: `node qa/verify-pronunciation-live.cjs`.

## 외부 사전과 7,811개 읽기 전수 대조

`python3 qa/audit-dictionary-readings.py`는 EDRDG의 EDICT2 UTF-8 사전을 내려받아 모든 단어의 표기와 읽기를 비교하고 `qa/dictionary-reading-audit.json`에 불일치·미등재 항목을 남깁니다. `.github/workflows/audit-dictionary-readings.yml`은 읽기 데이터 변경 시 감사를 실행합니다. 사전 대조는 원어민 녹음 청취 및 악센트 검증과 별개이며, 사전이 확인하지 못한 항목을 임의로 변경하지 않습니다.

발음 우선순위와 전체 단어 ID 연결의 회귀 검사: `node qa/test-reading-playback.cjs`.
