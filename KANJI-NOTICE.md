# 한자 해설 데이터 출처와 변경

`kanji-data.js`는 기존 단어에 쓰이는 한자만 추려 다음 사전을 결합한 정적 데이터입니다. 원본의 필드 축약, 일본식 표기와 한국 한자 연결, 중복 제거를 적용했습니다. 결합 배포 데이터는 CC BY-SA 4.0으로 제공합니다. 각 원본의 고지와 라이선스도 유지합니다.

- **OpenJLPT / KANJIDIC2 (EDRDG)**: 일본어 음독·훈독과 영어 한자 뜻. [원본](https://github.com/evanclan/OpenJLPT/tree/main/data/json/kanji), CC BY-SA 4.0. 기존 DATA-NOTICE.md 및 DATA-LICENSE.txt 참조.
- **libhangul `data/hanja/hanja.txt`**, © 2005, 2006 Choe Hwanjin: 한국식 뜻과 음. [원본](https://github.com/libhangul/libhangul/blob/main/data/hanja/hanja.txt). 이 데이터 파일 자체의 BSD 3-Clause 라이선스는 HANJA-LICENSE.txt에 보존했습니다.
- **OpenCC**, `JPShinjitaiCharacters.txt`: 일본 신자체에서 구자체로 연결. [원본](https://github.com/BYVoid/OpenCC/blob/master/data/dictionary/JPShinjitaiCharacters.txt), Apache-2.0 (OPENCC-LICENSE.txt). 한국에서 쓰는 형태 青→靑, 教→敎, 飲→飮, 既→旣, 清→淸를 보충했습니다. 여러 구자체에 대응하면 후보를 모두 유지합니다.

`kanji.js`에는 暖かい 등 일부 단어의 한국어 뜻과 학습 안내를 보충했습니다. 모든 단어의 한국어 번역을 제공하는 사전은 아닙니다. 원본에 없는 한국식 풀이와 읽기는 없다고 표시하고 임의로 생성하지 않습니다. 일본어 독음은 사전 등재 읽기이며 해당 단어의 한자별 독음을 자동 판정하지 않습니다.

## 재생성

다음 원본을 내려받고 `node build-kanji.cjs`를 실행합니다.

- `sources/hanja.txt`: https://raw.githubusercontent.com/libhangul/libhangul/main/data/hanja/hanja.txt
- `sources/jp-variants.txt`: https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/JPShinjitaiCharacters.txt
- `sources/kanji-n{1..5}.json`: https://raw.githubusercontent.com/evanclan/OpenJLPT/main/data/json/kanji/n{1..5}.json

한자의 한국식 뜻과 일본어 단어의 뜻이 항상 일치하는 것은 아닙니다. 단어의 실제 의미는 단어 뜻을 함께 확인해주세요.
