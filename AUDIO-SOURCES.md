# 일본어 발음과 검증 범위

전체 7,811개 단어의 읽기 필드로 생성한 Open JTalk MP3를 우선 재생합니다. 한자 표기의 독음을 추측하게 하지 않습니다. 파일은 pronunciation/<급수>/<단어ID>.mp3에 보관합니다.

## 변경 사유

이전 MeloTTS WAV는 일본어 읽기를 입력해도 다른 소리로 생성되는 문제가 있었습니다. 七（しち）에는 원어민 녹음이 없어 이 합성 파일이 사용되었습니다. 파일 존재와 재생 성공만으로 발음 정확성을 검증할 수 없었습니다. Melo 파일을 모든 재생 경로에서 제외하고 kotoba-wav-v1 캐시도 폐기합니다. 학습 기록과 동기화 데이터는 유지합니다.

## 새 음원과 출처

- 엔진: [Open JTalk](https://open-jtalk.sourceforge.net/), 일본어 규칙 기반 합성.
- 사전: NAIST Japanese Dictionary (open-jtalk-mecab-naist-jdic).
- 생성 방식: [pyopenjtalk](https://github.com/r9y9/pyopenjtalk)의 구조화된 NJD `pron`에서 직접 음소 라벨을 만듭니다. MeCab의 단어 분리·독음 재해석을 거치지 않습니다. 악센트는 중립값 0으로 설정하며, 단어별 표준 고저 악센트를 검증한 녹음으로 표시하지 않습니다.
- 음성: Nagoya Institute of Technology / HTS Working Group, NIT ATR503 M001. [원본 음성 저작권·이용 조건](pronunciation/VOICE-LICENSE.txt).
- 입력: 단어장 읽기를 NFKC 정규화한 뒤 가타카나로 변환합니다. 한자 읽기를 다시 추측하지 않습니다. `こんにちは`·`では` 등 조사 `は`를 포함한 표현 9개는 실제 발음 `wa`를 명시하고 manifest에 예외 사유를 남깁니다. `歯`·`葉` 등의 `ha`는 유지합니다.
- 재현: node qa/generate-phonetic-audio.cjs. 생성 환경은 .github/workflows/generate-phonetic-audio.yml에 명시합니다.
- [음원 manifest](pronunciation/manifest.json)에 단어 ID·읽기·입력·음소·해시·길이·음량을 기록합니다.

## 검사 범위

node qa/audit-pronunciation.cjs --require-assets --verify-native는 전체 읽기 7,811개, 퀴즈 선택지와 음원 대상 연결, 파일 누락·중복, 생성 입력·SHA-256·MP3 서명·음소·길이·음량을 검사합니다. 七（しち）는 sh i ch i 음소를 별도 검증합니다. [전수 검사 결과](qa/pronunciation-audit.json).

이 검사는 **7,811개를 사람이 모두 청취했다는 뜻이 아닙니다.** 파일·입력·음소의 자동 검사이며, 자연스러움과 단어별 표준 억양까지 보장하지 않습니다. 합성 음성과 원어민 녹음을 구분합니다.

## 대체 재생

MP3를 불러오지 못하면 표기와 읽기가 모두 일치하는 Tofugu/WaniKani 녹음을 재시도합니다. 七【なな】를 七【しち】 대신 사용하지 않습니다. 이 경로도 실패하면 기기에서 일본어 음성이 확인될 때만 합성하고, 일본어 음성이 없으면 재생 오류를 표시합니다.

### Tofugu / WaniKani

- 출처: [japanese-vocabulary-pronunciation-audio](https://github.com/tofugu/japanese-vocabulary-pronunciation-audio).
- 저작권자: Tofugu / WaniKani, 일본인 화자 녹음. 도쿄·간사이 억양이 섞여 있습니다.
- 라이선스: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- lib/mp3/<표기>【<읽기>】.mp3가 정확히 일치하는 3,230개만 대체 재생에 사용합니다. 녹음은 변형하지 않습니다.

### 기존 인덱스의 Kanji alive 자료

audio-data.js에는 기존 Kanji alive 연결도 남아 있지만 글자 읽기와 단어 전체 읽기를 혼동하지 않도록 현재 재생에는 사용하지 않습니다.

- 원저작자: Harumi Hibino Lory, Arno Bosse, Kanji alive team.
- 출처: [kanji-data-media](https://github.com/kanjialive/kanji-data-media).
- 라이선스: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

자체 코드와 원본 음원·음성 모델의 라이선스는 각각 유지합니다.
