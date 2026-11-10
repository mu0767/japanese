# 원어민 발음 파일 출처 및 이용 조건

코토바는 **원어민 녹음 음성**을 우선합니다. 녹음이 없는 단어와 원본 파일을 불러오지 못한 경우에는 **단어장에 등록된 일본어 읽기**를 Web Speech API로 음성 합성합니다. 합성 시 `ja-JP` 언어를 지정하고 일본어 음성이 목록에 있으면 해당 음성을 명시적으로 선택하며, 표기(한자)가 아니라 검증된 읽기를 사용합니다.

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
- **미녹음 3,612개 단어도 듣기 버튼이 동작하도록**, 일본어 `ja-JP` 음성 합성으로 대체합니다. 가나를 히라가나로 정규화해 발음시키며, 한자 표기를 음성 엔진에 직접 넘겨 독음을 추측하게 하지 않습니다. 음원 재생 실패 시에도 같은 대체 경로를 사용합니다.
- 일본어 음성 지원 여부는 기기·브라우저에 달려 있습니다. 일본어 음성팩이 없는 기기는 `ja-JP` 언어 태그만으로 정상 일본어 음성을 보장할 수 없으며, 음성 엔진 자체가 작동하지 않으면 오류를 표시합니다. 실제 음성의 정확도는 기기에서 확인해야 합니다.
- 녹음 데이터를 추가할 때에는 정확한 표제어와 읽기, 사용·재배포 가능한 라이선스를 확인해야 합니다.
- 위 음원은 제3자 웹사이트에서 직접 스트리밍합니다. 인터넷 연결이 필요하고, 원본 제공처가 서버를 종료하면 음원이 재생되지 않을 수 있습니다.

원본 저장소는 자료의 라이선스를 유지합니다. 본 파일은 출처 표시 및 변경 사항 안내를 위한 것으로, 코토바의 자체 코드에 대한 라이선스를 변경하지 않습니다.
