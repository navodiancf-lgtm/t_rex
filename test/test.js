// End-to-end test in the preinstalled Chromium. Run: npm install && node test/test.js
// CDN scripts (Leaflet, sql.js) and map tiles are served from node_modules / a stub, so no internet is needed.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const nm = (p) => path.join(root, 'node_modules', p);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.gpx': 'application/gpx+xml' };

function serve() {
  const srv = http.createServer((req, res) => {
    const f = path.join(root, req.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, () => r(srv)));
}

(async () => {
  const srv = await serve();
  const url = 'http://localhost:' + srv.address().port + '/';
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.route('**/leaflet/1.9.4/leaflet.min.css', (r) => r.fulfill({ path: nm('leaflet/dist/leaflet.css'), contentType: 'text/css' }));
  await page.route('**/leaflet/1.9.4/leaflet.min.js', (r) => r.fulfill({ path: nm('leaflet/dist/leaflet.js'), contentType: 'text/javascript' }));
  await page.route('**/sql.js/1.8.0/sql-wasm.js', (r) => r.fulfill({ path: nm('sql.js/dist/sql-wasm.js'), contentType: 'text/javascript' }));
  await page.route('**/sql.js/1.8.0/sql-wasm.wasm', (r) => r.fulfill({ path: nm('sql.js/dist/sql-wasm.wasm'), contentType: 'application/wasm' }));
  await page.route('**/tile.openstreetmap.org/**', (r) => r.fulfill({ body: PNG, contentType: 'image/png' }));

  await page.goto(url);
  const cardVal = (label) => page.locator('.card', { hasText: label }).locator('b').innerText();

  // 1. Demo track: stats, HR zones, charts, map polylines, history entry.
  await page.click('#demo');
  await page.waitForSelector('#stats .card');
  assert.strictEqual(await page.inputValue('#sport'), 'running');
  assert.match(await cardVal('Distance'), /^3\.4\d km$/);
  assert.strictEqual(await cardVal('Time'), '20:00');
  assert.match(await cardVal('Pace'), /\/km$/);
  assert.match(await cardVal('Avg HR'), /bpm$/);
  assert.ok(await page.locator('path.leaflet-interactive').count() > 100, 'HR polyline segments drawn');
  assert.strictEqual(await page.locator('.zone').count(), 5);
  for (const c of ['chHr', 'chSpeed', 'chEle']) {
    const drawn = await page.evaluate((id) => {
      const cv = document.getElementById(id), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false;
    }, c);
    assert.ok(drawn, c + ' has pixels');
  }
  await page.waitForSelector('#history li');
  assert.strictEqual(await page.locator('#history li').count(), 1);

  // 2. Changing sport switches pace <-> speed and persists.
  await page.selectOption('#sport', 'cycling');
  assert.match(await cardVal('Speed'), /km\/h$/);
  assert.strictEqual(await page.locator('#speedTitle').innerText(), 'Speed (km/h)');

  // 3. History survives reload; can be reloaded and deleted.
  await page.reload();
  await page.waitForSelector('#history li');
  await page.click('#history li .grow');
  await page.waitForSelector('#stats .card');
  assert.strictEqual(await page.inputValue('#sport'), 'cycling');
  assert.strictEqual(await cardVal('Time'), '20:00');
  await page.click('#history li [data-del]');
  await page.waitForFunction(() => document.querySelectorAll('#history li').length === 0);

  // 4. Multi-file upload saves every workout to history.
  const gpx = fs.readFileSync(path.join(root, 'sample/sample.gpx'), 'utf8');
  const noHr = gpx.replace(/<extensions>[\s\S]*?<\/extensions>/g, '');
  const second = noHr.replace(/2026-10-23T05/g, '2026-10-24T05');
  await page.setInputFiles('#file', [
    { name: 'a.gpx', mimeType: 'text/xml', buffer: Buffer.from(second) },
    { name: 'b.gpx', mimeType: 'text/xml', buffer: Buffer.from(gpx) }
  ]);
  await page.waitForFunction(() => document.querySelectorAll('#history li').length === 2);

  // 4b. Compare two saved workouts side by side.
  await page.locator('#history [data-cmp]').nth(0).check();
  await page.locator('#history [data-cmp]').nth(1).check();
  await page.click('#cmpBtn');
  await page.waitForSelector('#cmpTable tbody tr');
  assert.strictEqual(await page.locator('#cmpTable thead th').count(), 3, 'label column + 2 workouts');
  assert.strictEqual(await page.locator('#cmpBox').isVisible(), true);
  assert.ok(await page.locator('#cmpMap path.leaflet-interactive').count() >= 2, 'one polyline per workout');
  await page.click('#cmpClose');
  assert.strictEqual(await page.locator('#cmpBox').isVisible(), false);

  // 5. A GPX without HR gets HR from a Gadgetbridge DB (schema built in-page with sql.js).
  await page.setInputFiles('#file', { name: 'nohr.gpx', mimeType: 'text/xml', buffer: Buffer.from(noHr) });
  await page.waitForFunction(() => document.querySelector('.card:nth-child(5) b').innerText === '–');
  // Same start time + length = same workout, so re-importing replaces it instead of duplicating.
  assert.strictEqual(await page.locator('#history li').count(), 2);
  const t0 = Date.parse('2026-10-23T05:00:00Z');
  const dbBytes = await page.evaluate(async (t0) => {
    const SQL = await initSqlJs({ locateFile: (n) => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + n });
    const db = new SQL.Database();
    db.run('CREATE TABLE BASE_ACTIVITY_SUMMARY (NAME TEXT, START_TIME INTEGER, END_TIME INTEGER, ACTIVITY_KIND INTEGER)');
    db.run('CREATE TABLE HUAMI_EXTENDED_ACTIVITY_SAMPLE (TIMESTAMP INTEGER, HEART_RATE INTEGER)');
    db.run('INSERT INTO BASE_ACTIVITY_SUMMARY VALUES (?,?,?,?)', ['Outdoor Cycling', t0, t0 + 1200000, 1]);
    for (let s = 0; s <= 1200; s += 5) db.run('INSERT INTO HUAMI_EXTENDED_ACTIVITY_SAMPLE VALUES (?,?)', [t0 / 1000 + s, s % 50 === 0 ? 255 : 150]);
    return Array.from(db.export());
  }, t0);
  await page.setInputFiles('#db', { name: 'Gadgetbridge.db', mimeType: 'application/octet-stream', buffer: Buffer.from(dbBytes) });
  await page.waitForFunction(() => /^150 bpm$/.test(document.querySelector('.card:nth-child(5) b').innerText));
  assert.strictEqual(await cardVal('Max HR'), '150 bpm', 'invalid 255 readings ignored');
  assert.strictEqual(await page.locator('#gbList li').count(), 1);

  // 6. HR-only workout from the DB (no GPS): no distance, charts still draw.
  await page.click('#gbList li');
  await page.waitForFunction(() => document.querySelector('.card b').innerText === '–');
  assert.match(await cardVal('Avg HR'), /bpm$/);
  assert.strictEqual(await page.locator('#boxHr').isVisible(), true);
  assert.strictEqual(await page.locator('#boxEle').isVisible(), false);

  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join('; '));
  console.log('OK: all end-to-end checks passed');
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
