# 원어민 발음 파일 출처 및 이용 조건

코토바는 **원어민 녹음 음성**을 우선합니다. 전체 7,811개 단어마다 일본어 읽기를 기준으로 생성한 WAV 파일을 별도 Cloudflare KV 서버에 영구 보관합니다. 원어민 녹음이 없거나 로딩에 실패하면 자체 WAV 파일을 사용합니다. 기기 TTS는 서버 파일까지 실패했을 때만 최후 수단으로 사용하며, `ja-JP`와 단어장 읽기를 명시합니다.

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
- **총 7,811개 전부에 서버 보관 WAV 녹음을 생성했습니다.** 미녹음 3,612개뿐 아니라 녹음이 있는 4,199개에도 외부 저장소 장애에 대비한 자체 음성이 있습니다. WAV는 읽기 필드에서 가타카나를 히라가나로 정규화하여 일본어 MeloTTS로 생성했습니다. 한자 표기를 음성 엔진에 직접 넘겨 독음을 추측하지 않습니다.
- 재생 순서: Kanji alive → WaniKani (해당되는 경우) → 자체 Cloudflare WAV → 기기 일본어 음성 합성. 자체 파일 저장소는 `kotoba-japanese-pronunciation-v1` KV이며, Worker `kotoba-audio`에서 `https://kotoba-audio.union-raid.workers.dev/v1/audio/` 경로로 전달합니다.
- 자체 WAV는 12개씩 그룹으로 KV에 보관합니다. 미녹음은 `g0`~`g300`(301그룹), 녹음 보유 단어의 별도 백업은 `n0`~`n349`(350그룹)로 구성합니다. 그룹 내에 단어 ID별 WAV 데이터를 보관하며 서버는 요청된 단어만 재생합니다.
- 서버 생성에 사용한 Cloudflare MeloTTS 모델은 2026-11-20 폐기 예정입니다. 이미 생성된 KV 파일은 모델 종료와 무관하게 재생할 수 있습니다. 새 단어를 추가할 경우 별도 생성·보관 절차가 필요합니다.
- 일본어 음성 지원 여부는 기기·브라우저에 달려 있습니다. 일본어 음성팩이 없는 기기는 `ja-JP` 언어 태그만으로 정상 일본어 음성을 보장할 수 없으며, 음성 엔진 자체가 작동하지 않으면 오류를 표시합니다. 실제 음성의 정확도는 기기에서 확인해야 합니다.
- 녹음 데이터를 추가할 때에는 정확한 표제어와 읽기, 사용·재배포 가능한 라이선스를 확인해야 합니다.
- 위 음원은 제3자 웹사이트에서 직접 스트리밍합니다. 인터넷 연결이 필요하고, 원본 제공처가 서버를 종료하면 음원이 재생되지 않을 수 있습니다.

원본 저장소는 자료의 라이선스를 유지합니다. 본 파일은 출처 표시 및 변경 사항 안내를 위한 것으로, 코토바의 자체 코드에 대한 라이선스를 변경하지 않습니다.
