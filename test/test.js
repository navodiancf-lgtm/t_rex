// Run: node test/test.js  (needs `playwright` resolvable; uses the preinstalled Chromium)
const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, 'run.html'));
  const xml = require('fs').readFileSync(path.resolve(__dirname, '../sample/sample.gpx'), 'utf8');
  const r = await page.evaluate((x) => {
    const parsed = Gpx.parseDoc(new DOMParser().parseFromString(x, 'application/xml'));
    const sport = Sports.byId(Sports.detect(parsed.typeText));
    return { n: parsed.points.length, sport: sport.id, st: Gpx.stats(parsed.points, 70, sport.met),
      detect: [Sports.detect('Trail Run'), Sports.detect('Outdoor Cycling'), Sports.detect('xyz')], count: Sports.SPORTS.length };
  }, xml);
  assert.strictEqual(r.n, 121);
  assert.strictEqual(r.sport, 'running');
  assert.ok(r.st.distanceKm > 2.5 && r.st.distanceKm < 4, 'distance ' + r.st.distanceKm);
  assert.strictEqual(r.st.seconds, 1200);
  assert.ok(r.st.hrMax > r.st.hrAvg && r.st.hrAvg > r.st.hrMin);
  assert.deepStrictEqual(r.detect, ['trail', 'cycling', 'other']);
  assert.ok(r.count >= 15);
  console.log('OK', JSON.stringify(r.st));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
