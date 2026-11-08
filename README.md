# 코토바 · KOTOBA

N5~N1 일본어 단어 7,811개를 학습하는 반응형 정적 웹사이트입니다.

- 히라가나 읽기 / 영어 뜻 4지선다 퀴즈, 10·20·50문제
- 오답 복습, 단어 검색, 일본어 음성 합성
- 정답 확인 후 한자별 한국식 뜻·음(예: 暖 따뜻할 난), 일본어 음독·훈독 해설
- 정답률, 연속 학습, 최근 7일 기록 (브라우저 localStorage)
- 모바일과 키보드 지원. 별도 API 키·로그인·서버 불필요

## GitHub Pages

저장소 Settings → Pages → Build and deployment에서 **Deploy from a branch**, **main**, **/ (root)**를 선택하고 Save 합니다.
배포 주소: https://mu0767.github.io/japanese/

모든 자산 경로가 상대 경로이므로 GitHub Pages 하위 경로에서도 실행됩니다. `index.html`을 직접 열어도 사용할 수 있습니다.

## 검증

Node.js에서 `node test.cjs`. 모든 단어에 대해 급수별 선택지의 정답 포함·중복 방지와 오답 저장/해제를 검사합니다.

## 데이터

OpenJLPT에서 가져온 데이터의 필드를 축약했습니다. CC BY-SA 4.0. DATA-NOTICE.md와 DATA-LICENSE.txt 참고.
뜻은 영어이며 급수는 공식 출제 목록이 아닌 커뮤니티 학습용 분류입니다.
진도는 기기 간 자동 동기화되지 않습니다. 음성 재생은 기기의 일본어 TTS 지원 여부에 따라 달라집니다.

한자 해설은 OpenJLPT/KANJIDIC2, libhangul, OpenCC의 정적 데이터를 결합했습니다. KANJI-NOTICE.md와 각 라이선스 참조. 한국식 풀이가 없는 글자는 없다고 표시합니다. 일부 단어의 한국어 뜻을 보충했으며, 전체 단어 번역은 영어로 제공합니다.

UI 참고: Duolingo의 짧은 연습과 오답 복습, WaniKani의 복습 중심 학습. 디자인은 코토바용으로 작성했습니다.
