// Check the actual files delivered by GitHub Pages. Node.js 18+; no dependencies.
const assert = require('node:assert/strict');
const base = (process.argv[2] || 'https://mu0767.github.io/japanese/').replace(/\/?$/, '/');
async function read(path) {
  const url = new URL(path, base);
  url.searchParams.set('_verify', Date.now().toString());
  const response = await fetch(url, {cache: 'no-store', redirect: 'follow'});
  assert.equal(response.status, 200, `${url} HTTP ${response.status}`);
  return response.text();
}
(async () => {
  const html = await read('index.html');
  assert.match(html, /최근 갱신 · 20\d\d\.\d\d\.\d\d \d\d:\d\d/, 'Korean update timestamp missing');
  assert.match(html, /korean-data\\.js\\?v=\\d+/, 'Korean vocabulary asset missing');
  const korean = await read(html.match(/<script src="(korean-data\\.js\\?v=\\d+)"/)?.[1]);
  assert.ok(korean.includes('"大切":"소중하다, 중요하다"'), 'N5 Korean vocabulary not deployed');
  const appPath = html.match(/<script src="(app\.js\?v=\d+)"/)?.[1];
  assert.ok(appPath, 'Versioned app.js missing from HTML');
  const app = await read(appPath);
  assert.ok(app.includes('id="confirm"'), 'Explicit confirmation missing');
  assert.ok(app.includes("e.error==='canceled'"), 'Speech cancellation fix missing');
  const next = app.indexOf('id="next"'), explanation = app.indexOf('${KanjiDetails.render(w)}');
  assert.ok(next >= 0 && explanation > next, 'Next button must precede kanji explanation');
  console.log('PASS: Live GitHub Pages serves timestamp, confirm button, audio fix and next button layout.');
  console.log('Site:', base);
  console.log('Published asset:', appPath);
})().catch(err => { console.error('FAIL:', err.message); process.exitCode = 1; });
