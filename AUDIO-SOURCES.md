# 원어민 발음 파일 출처 및 이용 조건

코토바에서는 일본어 단어가 브라우저의 기본 음성 엔진을 통해 다른 언어로 읽히는 문제를 방지하기 위해, **원어민이 녹음한 개별 단어 음성**을 사용합니다. 기존 Web Speech API의 TTS는 사용하지 않습니다.

## 원어민 녹음 자료

### Kanji alive
- 출처: https://github.com/kanjialive/kanji-data-media
- 라이선스: Creative Commons Attribution 4.0 International (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/
- 원저작자: **Harumi Hibino Lory, Arno Bosse, Kanji alive team** — Kanji alive.
- 공개 자료 `language-data/ka_data.csv`의 표제어·읽기와 `examples_audio/audio-mp3`의 녹음 파일을 대조하여 발음 데이터를 연결했습니다. 원어민(남성·여성) 녹음입니다.
- 인덱스와 재생 방식은 코토바에 맞게 변환했습니다. 원본 녹음은 변형하지 않습니다.
- MP3 URL: `https://media.kanjialive.com/examples_audio/audio-mp3/<filename>`

### Tofugu / WaniKani
- 출처: https://github.com/tofugu/japanese-vocabulary-pronunciation-audio
- 라이선스: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0): https://creativecommons.org/licenses/by-sa/4.0/
- 저작권자·기여: **Tofugu / WaniKani**, 일본인 화자 녹음. 도쿄 및 간사이 억양이 섞여 있습니다.
- 원본 저장소의 `lib/mp3/<단어>【<읽기>】.mp3` 파일과 현재 단어장 표제어·읽기가 정확히 일치하는 음원만 연결했습니다. 녹음의 음성은 변경하지 않습니다.
- MP3 URL: `https://raw.githubusercontent.com/tofugu/japanese-vocabulary-pronunciation-audio/master/lib/mp3/<filename>`

## 커버리지와 재생 정책 (2026-11-09)

- 코토바 단어 7,811개 중 **4,199개(53.8%)**가 위 자료의 단어·읽기에 일치하는 녹음 파일을 가집니다.
- Kanji alive 2,830개, WaniKani 3,230개, 중복 1,861개입니다.
- 실제 재생 시 Kanji alive를 우선 사용하고, 음원 로드 실패 시 일치하는 WaniKani 녹음을 재시도합니다.
- **미지원 3,612개 단어는 잘못된 TTS 음성을 들려주지 않습니다.** 발음 데이터를 추가할 때에는 정확한 표제어와 읽기, 사용·재배포가 가능한 라이선스를 확인해야 합니다.
- 위 음원은 제3자 웹사이트에서 직접 스트리밍합니다. 인터넷 연결이 필요하고, 원본 제공처가 서버를 종료하면 음원이 재생되지 않을 수 있습니다.

원본 저장소는 자료의 라이선스를 유지합니다. 본 파일은 출처 표시 및 변경 사항 안내를 위한 것으로, 코토바의 자체 코드에 대한 라이선스를 변경하지 않습니다.
