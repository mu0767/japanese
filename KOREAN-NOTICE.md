# 한국어 뜻: 사전 출처와 변경 고지

N5~N1 **7,811개 전부**에 한국어 뜻을 연결했습니다. 기존 N5 표기별 수작업 번역과 `kanji.js`의 보충 맵을 교체했습니다. 일본어 표기·읽기·원래 영어 뜻을 대조하고 ID별로 저장해 `辛い（からい）`와 `辛い（つらい）` 같은 단어를 구분합니다. 단어 ID와 학습 기록 키는 변경하지 않았습니다.

등록 개수와 출처별 개수는 [korean-coverage.json](korean-coverage.json)에 있습니다. 등록은 학습용 한국어 풀이가 있다는 뜻이며 모든 의미를 망라하거나 전문 번역가가 전수 감수했다는 뜻은 아닙니다.

## 사용한 자료

| 자료 | 적용 방식 | 출처·라이선스 |
| --- | --- | --- |
| 국립국어원 한국어기초사전 KRDict | 한일 사전의 대역어와 한국어 표제어를 역대조. 동일 사전 영문판의 같은 항목·의미 번호를 대조해 다의어 선택에 사용. | [국립국어원](https://krdict.korean.go.kr), [공개 변환본](https://github.com/peldas/yomitan-dicts/releases/tag/yomitan-dicts-v1.1.1). **CC BY-SA 2.0 KR**. [정책](https://krdict.korean.go.kr/kor/kboardPolicy/copyRightTermsInfo). |
| 한국어판 위키낱말사전 / Kaikki | 일본어 표제어의 한국어 뜻. 표기·발음·예문 읽기와 의미 항목을 대조. | [추출본](https://kaikki.org/kowiktionary/%EC%9D%BC%EB%B3%B8%EC%96%B4/index.html), [원본](https://ko.wiktionary.org). **CC BY-SA 4.0** 및 원본 고지. |
| 일본어판 위키낱말사전 / Kaikki | 일본어 표제어에 연결된 한국어 대역어 보충. | [추출본](https://kaikki.org/jawiktionary/), [원본](https://ja.wiktionary.org). **CC BY-SA 4.0** 및 원본 고지. |
| Open English-Korean Dictionary | 일부 잔여 항목의 영어 뜻·일본어 읽기를 확인하고 적합한 영한 의미를 선택. 잘못 연결된 후보는 제외. | [저장소](https://github.com/jhseo1211/open-english-korean-dict), **CC BY-SA 4.0** 고지. [원본 출처](ENGLISH-KOREAN-CREDITS.md). 이 원본에는 수작업·LLM 보조 번역이 포함됩니다. |
| Kengdic, Joe Speigle 및 기여자 | 일부 잔여 항목을 영어 뜻과 한국어 표제어를 검토해 연결. | [원본](https://github.com/garfieldnate/kengdic). 선택한 **MPL 2.0**을 [별도 모듈·고지](KENGDIC-NOTICE.md)로 유지. |
| OpenJLPT 원뜻의 새 한국어 보충 번역 | 사전에서 적합한 뜻이 없거나 다른 뜻이 매칭된 항목을 일본어·읽기·원래 영어 뜻으로 확인하고 새로 번역. | [OpenJLPT](https://github.com/evanclan/OpenJLPT). **CC BY-SA 4.0**. 출처를 `openjlpt-reviewed-translation`으로 구분해 사전 원문으로 가장하지 않음. |

[Kotobase 공개 manifest](https://huggingface.co/datasets/4pplet/kotobase-dict/raw/main/manifest.json)의 한국어 풀이 원본인 Kaikki 자료를 직접 사용했습니다. Kotobase의 다국어 SQLite 전체가 일본어→한국어 사전인 것은 아닙니다. 네이버 사전 본문은 수집하지 않았습니다.

## 대조와 편집

- 표기·읽기를 함께 사용하고 신·구 표기, 가나 표기 차이를 확인했습니다. 읽기만 같은 무관한 한자는 일괄 합치지 않습니다.
- KRDict 일본어·영어 판의 파일·행·의미 항목 대응을 확인했습니다. 원래 영어 뜻과 단순 일치하는 것만으로 옳다고 단정하지 않고 동형어와 자주 쓰는 단어의 선택 의미도 검토했습니다.
- `はし`의 다리/젓가락, `そば`의 메밀국수/곁, `辛い`의 맵다/괴롭다, `払う`의 치우다/지불하다 등을 구분했습니다.
- 끝 구두점, 일부 영어 어원 괄호, 어미·명사형 등을 학습용으로 다듬었습니다. 독자적인 보충 풀이에는 그 사실을 기록했습니다.
- 보기·보기별 해설·결과·단어장에 한국어 뜻을 사용합니다. 영어 원뜻은 검토용 원본 데이터에 보존하되 이 화면의 대체 풀이로 노출하지 않습니다.

## 배포 파일과 근거

- `korean-data.js`: 일반 한국어 뜻 모듈. KRDict·Wiktionary·영한 사전 및 보충 번역의 적응 데이터에 CC BY-SA 고지를 유지합니다.
- `korean-kengdic.js`: Kengdic 파생 항목을 분리해 MPL 2.0 유지.
- `korean-provenance.json`, `korean-kengdic-provenance.json`: ID별 선택한 뜻·표기·읽기·출처·대조 방식·원본 항목과 출처별 라이선스.
- `korean-coverage.json`: 급수별 등록 개수와 출처별 개수.
- `DATA-NOTICE.md`, `DATA-LICENSE.txt`: 단어·읽기·급수·영어 원뜻의 OpenJLPT/JMdict/Waller 출처.

자료 다운로드: 2026-11-08. 최종 반영: **2026-11-09 (한국 시간)**. Kaikki 한국어판 추출본은 2026-11-01 덤프 기반입니다.

기존의 [basickorean/basickorean-vocab](https://github.com/basickorean/basickorean-vocab) 기반 KRDict 보조 파일과 자동 가져오기 작업도 유지합니다. 이 보조 파일의 한국어 표제어·일본어 대역어는 CC BY-SA 2.0 KR입니다. 현재 전체 ID별 풀이를 우선 사용하며, 추후 ID 풀이가 없는 단어는 정확한 표기·읽기의 보조 대역어를 조회할 수 있습니다. 전체 ID 풀이가 이미 갖춰졌으면 자동 가져오기는 기존 보조 파일을 덮어쓰지 않고 종료합니다.

## 재생성·검증

선택한 원본 근거 파일로 런타임 파일을 재생성할 때는 추가 다운로드나 API 키가 필요하지 않습니다.

```sh
node build-korean.cjs --from-snapshot
node test-korean.cjs
node test-kanji.cjs
```

원본에서 다시 대조할 때 `build-korean.cjs <sources-directory>`는 Kaikki JSONL, KRDict 후보·의미 순위, 표기 변형 및 검토 보충 파일을 읽습니다. 이 원본 대조에는 `qa/node_modules/wanakana`가 필요합니다. 원본 전체와 검토 중간 파일을 사이트 사용자 브라우저에서 내려받지는 않습니다.

Playwright와 Chrome이 설치된 개발 환경에서는 `node qa/korean-browser.cjs` 또는 `node qa/korean-browser.cjs https://mu0767.github.io/japanese/`로 전 급수 한국어 퀴즈·모바일 화면을 검사할 수 있습니다.
