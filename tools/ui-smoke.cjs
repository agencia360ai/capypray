const { createRequire } = require('node:module');
const { chromium } = createRequire(require('node:path').resolve(__dirname, '../packages/avatar-web/package.json'))('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const output = process.env.CAPY_SCREENSHOTS || path.resolve(__dirname, '../test-results');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  const shot = async (name) => {
    const frame = page.frameLocator('iframe');
    await frame.locator('canvas').waitFor({ timeout:30000 });
    await page.waitForTimeout(750);
    await page.screenshot({path:path.join(output,name)});
  };
  page.on('pageerror', error => errors.push(String(error)));
  const pack = require('../packages/content/packs/christian-us-en-v1/pack.json');
  const tap = (text) => page.getByText(text, { exact: true }).last().click({ force: true }); // the hint hand keeps buttons moving
  await page.goto('http://127.0.0.1:8081');
  // Capy first: the opening is only him, tapped through line by line (no beads, no close)
  await page.getByText('Hi, friend! I’m Capy. Come sit with me by the pond.', { exact: true }).waitFor({timeout:30000});
  await page.waitForTimeout(2200);
  await shot('01-opening.png');
  for(let i=0;i<7;i++){ await tap(pack.ui.next); await page.waitForTimeout(350); }
  await page.getByText('Hi God, it’s me, friend.',{exact:true}).waitFor();
  await shot('03-first-prayer.png');
  for(let i=0;i<3;i++){ await tap(pack.ui.iSaidIt); await page.waitForTimeout(350); }
  await tap(pack.ui.yay);
  await tap(pack.ui.next);
  // then the phone goes to a grown-up: nickname, bedtime, the gate, the offer
  await page.getByText('Now, a moment for grown-ups.', { exact: true }).waitFor({timeout:15000});
  await shot('02-handoff.png');
  await tap('I’m a grown-up');
  await page.getByRole('textbox').fill('Mia');
  await tap('Continue');
  await page.getByRole('radio', {name:'8:00 PM',exact:true}).click({ force: true });
  await tap('See Capy’s plan');
  await page.getByText('Press and hold', { exact: true }).waitFor();
  const q = (await page.evaluate(() => document.body.innerText)).match(/(\d+)\s*([+\-×x*])\s*(\d+)\s*=\s*\?/);
  const answer = q[2] === '+' ? Number(q[1]) + Number(q[3]) : q[2] === '-' ? Number(q[1]) - Number(q[3]) : Number(q[1]) * Number(q[3]);
  await page.getByText(String(answer), { exact: true }).first().click({ force: true });
  await page.getByText('Press and hold', { exact: true }).hover(); await page.mouse.down(); await page.waitForTimeout(3400); await page.mouse.up();
  await page.getByText('Everything Capy has planned for Mia', { exact: true }).waitFor({timeout:15000});
  await shot('04-offer.png');
  await tap('Start with free bedtime prayers');
  // home, day 0: today's prayer and bedtime only — the other doors open with progress
  await page.getByText('Hi, Mia.',{exact:true}).waitFor();
  await page.waitForTimeout(600);
  await shot('04-home.png');
  await page.reload();
  await page.getByText('Hi, Mia.',{exact:true}).waitFor();
  await page.goto('http://127.0.0.1:8081/moments'); // feelings open on the home after day two; the library route is always there
  await page.getByText('Worried',{exact:true}).click({ force: true });
  await page.getByText(pack.ui.next,{exact:true}).click();
  await page.getByText('Breathe gently. God is here with us.',{exact:true}).waitFor();
  await shot('05-breathe.png');
  await page.getByRole('button', { name: pack.companion.breathing.start, exact: true }).click();
  await page.getByRole('button', { name: pack.companion.breathing.continue, exact: true }).click({ timeout: 22000 });
  await page.getByText(pack.ui.iSaidIt,{exact:true}).waitFor({timeout:22000});
  for(let i=0;i<3;i++) await page.getByText(pack.ui.iSaidIt,{exact:true}).click();
  await tap(pack.ui.yay);
  await tap(pack.ui.next);
  await page.getByText('Hi, Mia.',{exact:true}).waitFor();
  await page.goto('http://127.0.0.1:8081/stories');
  await page.getByText('The Lost Sheep',{exact:true}).click();
  await page.getByText(pack.ui.next,{exact:true}).click();
  await page.getByText(pack.stories.find(s=>s.id==='lost-sheep').pages[0].text,{exact:true}).waitFor();
  await shot('06-story.png');
  await page.goto('http://127.0.0.1:8081/moments');
  await page.getByText('Little prayers, big feelings.',{exact:true}).waitFor();
  await page.waitForTimeout(650);
  await page.screenshot({path:path.join(output,'07-moments.png')});
  await page.goto('http://127.0.0.1:8081/journey');
  await page.getByText('Your prayer path',{exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'08-journey.png')});
  await page.goto('http://127.0.0.1:8081/lesson/moment-sleepy');
  await page.getByText('Let’s put the busy day down for a little while.',{exact:true}).waitFor();
  await shot('10-bedtime.png');
  await page.goto('http://127.0.0.1:8081/');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByText('Hi, Mia.',{exact:true}).waitFor();
  await shot('11-desktop.png');
  const small = await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'});
  await small.goto('http://127.0.0.1:8081');
  await small.getByText('Hi, friend! I’m Capy. Come sit with me by the pond.',{exact:true}).waitFor({timeout:30000});
  await small.frameLocator('iframe').locator('canvas').waitFor();
  await small.waitForTimeout(750);
  await small.screenshot({path:path.join(output,'09-small-screen.png')});
  await small.getByText(pack.ui.next,{exact:true}).last().click({ force: true });
  await small.getByText('Can I tell you something? One day, I had a big worry stuck in my tummy.',{exact:true}).waitFor();
  console.log('PASS: Capy-first opening, first prayer, grown-up handoff, gate, offer, day-0 home, reload persistence, emotional moment, story pages, library, journey, 320px screen, reduced motion.');
  console.log('PAGE ERRORS', errors);
  if(errors.length) throw new Error('Browser exceptions occurred');
  await browser.close();
})().catch(error => {console.error(error);process.exit(1);});
