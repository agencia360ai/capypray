// Store screenshots, step 1: capture the real app from the Expo web dev server (port 8081) with a fictional
// premium profile ("Mia"). Day scenes use a time zone where it is daytime now; the night shot one where it is night.
// Usage: node tools/store-screens/capture.cjs   (PLAYWRIGHT_CHROMIUM=/path/to/chromium if needed)
const { createRequire } = require('node:module');
const path = require('node:path'), fs = require('node:fs');
const { chromium } = createRequire(path.resolve(__dirname, '../../packages/avatar-web/package.json'))('playwright');
const pack = require('../../packages/content/packs/christian-us-en-v1/pack.json');
const O = 'http://127.0.0.1:8081', out = path.resolve(__dirname, '../../test-results/store-raw');
fs.mkdirSync(out, { recursive: true });
const zoneAt = (from, to) => { // a whole-hour Etc zone whose local hour is in [from, to)
  for (let off = -12; off <= 14; off++) { const h = (new Date().getUTCHours() + off + 24) % 24; if (h >= from && h < to) return off === 0 ? 'UTC' : `Etc/GMT${off > 0 ? '-' : '+'}${Math.abs(off)}`; }
  return 'UTC';
};
const seed = (page, patch) => page.evaluate(async patch => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('capy-prayer', 1); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const tx = db.transaction('state', 'readwrite'); const s = tx.objectStore('state'); const r = s.get('kid'); r.onsuccess = () => { const k = JSON.parse(r.result || '{"state":{},"version":4}'); Object.assign(k.state, patch); s.put(JSON.stringify(k), 'kid'); }; tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  db.close();
}, patch);
async function session(browser, timezoneId) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId });
  await page.goto(O + '/moments');
  await page.waitForFunction(async () => (await indexedDB.databases()).some(d => d.name === 'capy-prayer'), null, { timeout: 90000 });
  const at = Date.now() - 86400000, ids = ['meet-capy', 'w1d1', 'w1d2', 'w1d3', 'w1d4'];
  await seed(page, { onboarded: true, introDone: true, kidName: 'Mia', premium: true, beacons: 1,
    completed: Object.fromEntries(ids.map(id => [id, { at, lanterns: 1 }])), celebrated: Object.fromEntries(ids.map(id => [id, true])),
    revealed: Object.fromEntries(pack.companion.home.map(s => [s.id, true])) });
  return page;
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, headless: true, args: ['--enable-unsafe-swiftshader'] });
  const settle = async (page, ms) => { await page.frameLocator('iframe').locator('canvas').waitFor({ timeout: 30000 }).catch(() => {}); await page.waitForTimeout(ms); };
  const shot = async (page, name) => { await page.screenshot({ path: path.join(out, name + '.png'), timeout: 180000 }); console.log('captured', name); };
  const tap = (page, text) => page.getByText(text, { exact: true }).last().click({ force: true });
  const firstPrayer = async (page, intro) => {
    await page.goto(O + '/lesson/meet-capy'); await page.getByText(pack.ui.next, { exact: true }).last().waitFor({ timeout: 60000 }); await settle(page, 3200);
    if (intro) await shot(page, intro);
    for (let i = 0; i < 7; i++) { await tap(page, pack.ui.next); await page.waitForTimeout(450); }
    await page.getByText(pack.ui.iSaidIt, { exact: true }).last().waitFor({ timeout: 20000 }); await settle(page, 2200);
  };
  try {
    const day = await session(browser, zoneAt(9, 16));
    await firstPrayer(day, 'intro'); await shot(day, 'prayer');
    await day.goto(O + '/lesson/bedtime-w1'); await day.getByText(pack.ui.next, { exact: true }).last().waitFor({ timeout: 60000 }); await settle(day, 3200);
    await day.getByText(pack.ui.next, { exact: true }).last().click({ force: true, timeout: 15000 }).then(() => settle(day, 2400)).catch(() => {});
    await shot(day, 'bedtime');
    await day.goto(O + '/'); await day.getByText('Hi, Mia.', { exact: true }).waitFor({ timeout: 60000 }); await settle(day, 3500); await shot(day, 'home');
    await day.goto(O + '/story/lost-sheep'); await day.waitForTimeout(9500); await settle(day, 1200); await shot(day, 'story');
    await day.goto(O + '/trail'); await day.getByRole('button', { name: pack.companion.ui.explore, exact: true }).waitFor({ timeout: 60000 }); await settle(day, 3500); await shot(day, 'trail');
    await day.goto(O + '/games'); await day.getByText(pack.companion.games.items[0].title, { exact: true }).waitFor({ timeout: 60000 }); await settle(day, 2600); await shot(day, 'games');
    const night = await session(browser, zoneAt(20, 24));
    await firstPrayer(night); await shot(night, 'prayer-night');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
