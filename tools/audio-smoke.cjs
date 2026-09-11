const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = createRequire(path.resolve(__dirname, '../packages/avatar-web/package.json'))('playwright');
const pack = require('../packages/content/packs/christian-us-en-v1/pack.json');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, headless: true, args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
      window.__capyAudio = [];
      const records = new WeakMap();
      const play = HTMLMediaElement.prototype.play;
      const pause = HTMLMediaElement.prototype.pause;
      HTMLMediaElement.prototype.pause = function () {
        const record = records.get(this);
        if (record) {
          record.duration = this.duration;
          record.stoppedAt = this.currentTime;
          record.ended = this.ended || (this.duration > 0 && this.currentTime >= this.duration - 0.02);
        }
        return pause.call(this);
      };
      HTMLMediaElement.prototype.play = function () {
        const record = { src: this.src, ended: false, duration: 0, stoppedAt: 0 };
        records.set(this, record);
        window.__capyAudio.push(record);
        this.addEventListener('ended', () => { record.ended = true; record.duration = this.duration; }, { once: true });
        return play.call(this);
      };
    });
    await page.goto('http://127.0.0.1:8081/lesson/w1d1');
    await page.waitForFunction(() => window.__capyAudio.some(a => a.src.includes('w1d1_01.') && a.ended), { timeout: 20000 });
    await page.getByText(pack.ui.next, { exact: true }).click();
    await page.getByText(pack.ui.next, { exact: true }).click();
    const story = pack.stories.find(s => s.id === 'lost-sheep');
    for (let i = 0; i < story.pages.length; i++) await page.getByText(pack.ui.storyPage, { exact: true }).click();
    await page.getByText(pack.ui.theEnd, { exact: true }).click();
    for (let i = 0; i < 3; i++) await page.getByText(pack.ui.iSaidIt, { exact: true }).click();
    const mg = pack.minigames.find(m => m.id === 'mg_w1d1_who_listens');
    await page.getByText('A rock', { exact: true }).click();
    await page.waitForFunction(() => window.__capyAudio.some(a => a.src.includes('mg_w1d1_retry.') && a.ended), { timeout: 15000 });
    await page.getByText(mg.retryLine.text, { exact: true }).waitFor();
    await page.getByText('God', { exact: true }).click();
    await page.getByText(mg.successLine.text, { exact: true }).waitFor();
    await page.waitForTimeout(2100);
    await page.getByText(mg.successLine.text, { exact: true }).waitFor();
    await page.waitForFunction(() => window.__capyAudio.some(a => a.src.includes('mg_w1d1_ok.') && a.ended), { timeout: 15000 });
    await page.getByText("Let's be quiet for a moment. God is listening.", { exact: true }).waitFor();
    const recordings = await page.evaluate(() => window.__capyAudio.filter(a => /w1d1_01\.|mg_w1d1_(ok|retry)\./.test(a.src)));
    assert.equal(recordings.length, 3);
    assert.ok(recordings.every(a => a.ended));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, recordings }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
