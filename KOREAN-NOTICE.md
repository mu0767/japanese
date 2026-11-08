# Korean vocabulary meanings (한국어 단어 뜻)

`korean-data.js` contains Korean glosses curated specifically for Kotoba's JLPT vocabulary.

- Current verified coverage: **JLPT N5, 674/674 unique headwords**. Entries in other levels remain a work in progress, with a smaller hand-curated Korean map in `kanji.js`.
- The word list, spellings, readings, levels and original English glosses come from OpenJLPT, distributed as CC BY-SA 4.0; see [DATA-NOTICE.md](DATA-NOTICE.md) and [DATA-LICENSE.txt](DATA-LICENSE.txt).
- The Korean glosses were newly written for this project by translating and reviewing the N5 list. They are short learning-oriented translations, and are distributed with the derived vocabulary data under **CC BY-SA 4.0**.
- Original word IDs and learning history keys have not changed. No Naver Dictionary content was scraped or redistributed.
- Some words have multiple senses. Glosses focus on common JLPT usage, and the specific Japanese spelling determines the preferred interpretation.
- Keep displaying `한국어 뜻 미등록` for words not yet translated, instead of fabricating a gloss or exposing the original English text in Korean-language explanations.

## Check

```sh
node test.cjs
node test-kanji.cjs
node qa/verify-live.cjs https://mu0767.github.io/japanese/
```
