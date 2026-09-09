// Debug: play a clip in the preview and print DEF-spine height, shin bend and head nod over time. usage: node scripts/dbg-clip.mjs kneel_pray
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
const dist = resolve("dist");
const mime = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary" };
const server = createServer(async (req, res) => {
  const p = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { await stat(p); res.writeHead(200, { "content-type": mime[extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); } catch { res.writeHead(404).end(); }
}).listen(0);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.text()));
await page.goto(`http://localhost:${server.address().port}/preview.html?bare=1`);
await page.waitForFunction(() => window.__capyReady === true, null, { timeout: 60000 });
await page.waitForTimeout(500);
const out = await page.evaluate((clip) => {
  const { sm, scene } = window.__capy;
  const names = []; scene.traverse((o) => { if (o.isBone) names.push(o.name); });
  const spine = scene.getObjectByName("DEF-spine"), shin = scene.getObjectByName("DEF-shinL"), head = scene.getObjectByName("DEF-spine006");
  const clips = sm.clipNames;
  sm.play(clip, { loop: true, fade: 0 });
  const rows = [];
  for (let t = 0; t <= 4.5; t += 0.5) { sm.update(t === 0 ? 0 : 0.5); rows.push([t, spine.position.y.toFixed(2), shin.quaternion.x.toFixed(2), shin.quaternion.w.toFixed(2), head.quaternion.x.toFixed(2)]); }
  return { clips, hasBones: [spine?.name, shin?.name, head?.name], current: sm.current?.getClip().name, rows };
}, process.argv[2] ?? "kneel_pray");
console.log(JSON.stringify(out, null, 1));
await browser.close(); server.close();
