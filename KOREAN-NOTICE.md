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

## Open-data Japanese→Korean enrichment

`korean-krdict-data.js` is generated using the Japanese translation headwords in the **National Institute of Korean Language (국립국어원) Korean Basic Dictionary**. The publicly distributed, sharded source is [basickorean/basickorean-vocab](https://github.com/basickorean/basickorean-vocab). These Korean headwords and Japanese equivalents are used under **CC BY-SA 2.0 Korea** ([license](https://creativecommons.org/licenses/by-sa/2.0/kr/)). They are kept in a separate generated file with their own attribution and license; existing OpenJLPT entries and the separately curated Korean vocabulary remain under their prior licenses.

The generator in `tools/build-krdict-korean.cjs` matches **both** the Japanese spelling and kana reading, requires an unambiguous Korean counterpart, and ignores entries not found in the bilingual source. No machine translation, individual manual translation, or Naver scraping is performed. Japanese dictionary equivalents may differ in nuance from the exact JLPT gloss and should be checked in context.

The GitHub Actions workflow in `.github/workflows/build-korean.yml` rebuilds the standalone overlay. Coverage depends on the published KRDict data; unmatched words are not silently fabricated.
