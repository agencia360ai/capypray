// Store screenshots, step 2: frame the captures from capture.cjs with parent-facing captions for Google Play
// (1080×1920, opaque JPEG). Premium-only screens carry an "Included with Premium" chip so paid features never look free.
// Usage: node tools/store-screens/compose.cjs
const { createRequire } = require('node:module');
const path = require('node:path'), fs = require('node:fs');
const { chromium } = createRequire(path.resolve(__dirname, '../../packages/avatar-web/package.json'))('playwright');
const F = path.resolve(__dirname, '../../node_modules/@expo-google-fonts/nunito');
const raw = path.resolve(__dirname, '../../test-results/store-raw'), out = path.resolve(__dirname, '../../release/screenshots/google-play-v2');
const slides = [
 {file:'01-meet-capy',raw:'intro',bg:['#FFF6E3','#FFE7BF'],title:'Meet Capy,<br>a gentle prayer friend',sub:'Short, guided prayers for kids ages 4–8'},
 {file:'02-say-it',raw:'prayer',bg:['#F1F6E6','#DCEBCB'],title:'Little prayers they<br>can say out loud',sub:'Capy leads, your child repeats. No voice recording.'},
 {file:'03-bedtime',raw:'bedtime',bg:['#2D2A4A','#433E6E'],dark:true,title:'A calm bedtime prayer,<br>free every night',sub:'With a gentle reminder set by a grown-up'},
 {file:'04-every-moment',raw:'home',bg:['#FFF3DC','#F9E2C2'],title:'Prayers for every<br>part of the day',sub:'Mealtime, feelings and bedtime prayers'},
 {file:'05-bible-stories',raw:'story',bg:['#FCEBDD','#F6D7BE'],premium:true,title:'Illustrated Bible<br>stories, read aloud',sub:'Told in words little ones understand'},
 {file:'06-prayer-path',raw:'trail',bg:['#EAF3E2','#D3E7C4'],title:'A prayer path that<br>grows one step a day',sub:'Light lanterns and discover little treasures'},
 {file:'07-puzzles',raw:'games',bg:['#E4F2EF','#CDE7E1'],premium:true,title:'Little puzzles for<br>a playful break',sub:'Four calm games that grow with your child'},
 {file:'08-families',raw:'prayer-night',bg:['#FFF6E3','#FFE7BF'],title:'Made with families<br>in mind',sub:'',small:true,badges:['No ads','No voice recording','Parent gate','Bedtime prayers free forever','Progress stays on your device']},
];
const css = `@font-face{font-family:N;font-weight:900;src:url(file://${F}/900Black/Nunito_900Black.ttf)}@font-face{font-family:N;font-weight:800;src:url(file://${F}/800ExtraBold/Nunito_800ExtraBold.ttf)}@font-face{font-family:N;font-weight:700;src:url(file://${F}/700Bold/Nunito_700Bold.ttf)}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;overflow:hidden;font-family:N;display:flex;flex-direction:column;align-items:center}
.top{height:452px;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 70px 34px;text-align:center}
.chip{font-weight:800;font-size:28px;letter-spacing:.5px;padding:10px 26px;border-radius:999px;background:#FFB84D;color:#3B2A12;margin-bottom:26px}
h1{font-weight:900;font-size:82px;line-height:1.04;color:#354B3E;letter-spacing:-.5px}
p{font-weight:800;font-size:38px;line-height:1.25;color:#69715D;margin-top:22px}
.dark h1{color:#FFF4DB}.dark p{color:#D9D6F0}
.phone{width:664px;height:1437px;border-radius:64px;overflow:hidden;border:12px solid #fff;box-shadow:0 30px 70px rgba(59,42,26,.28),0 4px 14px rgba(59,42,26,.12)}
.dark .phone{border-color:#5A548C;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.badges{display:flex;flex-wrap:wrap;justify-content:center;gap:14px 14px;margin-top:26px;max-width:940px}
.badge{font-weight:800;font-size:31px;color:#2F4A3A;background:#FFFFFF;padding:14px 24px;border-radius:20px;box-shadow:0 6px 18px rgba(59,42,26,.14)}
.small .top{height:600px}.small .phone{width:594px;height:1285px}`;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const s of slides) {
    const html = `<html><head><style>${css}</style></head><body class="${s.dark ? 'dark' : ''} ${s.small ? 'small' : ''}" style="background:linear-gradient(180deg,${s.bg[0]},${s.bg[1]})">
  <div class="top">${s.premium ? '<div class="chip">Included with Premium</div>' : ''}<h1>${s.title}</h1>${s.sub ? `<p>${s.sub}</p>` : ''}${s.badges ? `<div class="badges">${s.badges.map(x => `<div class="badge">✓ ${x}</div>`).join('')}</div>` : ''}</div>
  <div class="phone"><img src="file://${path.join(raw, s.raw + '.png')}"></div></body></html>`;
    const file = path.join(raw, '_' + s.file + '.html'); fs.writeFileSync(file, html);
    await page.goto('file://' + file); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, s.file + '.jpg'), type: 'jpeg', quality: 92 }); fs.unlinkSync(file); console.log('framed', s.file);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
