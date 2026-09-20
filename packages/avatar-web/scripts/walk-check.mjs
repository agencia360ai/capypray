// Does Capy's stride cover the ground he travels? usage: node scripts/walk-check.mjs [--shots]
//
// A baked walk clip proves nothing about foot contact while the stage translates him, so this drives a real leg in
// a real browser and measures it: how far the planted foot travels under the body versus how far the body moves.
// 1.0 means the feet carry him; 0.5 means he is gliding on half a stride. Slip is what is left over in world space
// once the three-quarter heading is taken into account — the cost of keeping his face turned to the child.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const dist = resolve(import.meta.dirname, "../dist");
const mime = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".css": "text/css" };
const server = createServer(async (req, res) => {
  const p = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { await stat(p); res.writeHead(200, { "content-type": mime[extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404).end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(`http://localhost:${port}/preview.html?bare=1`);
await page.waitForFunction(() => window.__capyReady === true, null, { timeout: 60_000 });
// the lobby's framing: a sheet over the bottom of the screen, Capy in the band above it
await page.evaluate(() => window.__capySend({ type: "viewport", top: 0.1, bottom: 0.45 }));
await page.waitForTimeout(800);

const run = async (from, to) =>
  page.evaluate(
    ([from, to]) =>
      new Promise((done) => {
        const { scene, sm } = window.__capy;
        const feet = [];
        scene.traverse((o) => { if (["DEF-footL", "DEF-footR"].includes(o.name)) feet.push(o); }); // the loader drops the dots
        const v = new window.THREE_VEC();
        // the clip's own clock, not the browser's: software GL runs at a handful of frames a second, so counting
        // rendered frames would measure the renderer. Clip seconds × the stride's ground per second = the ground
        // the feet covered, however slowly the page drew it.
        const clock = () => sm.current?.time ?? 0;
        let played = 0, last = clock(), t0 = performance.now(), body0 = scene.position.x;
        const samples = [];
        const tick = () => {
          const now = clock();
          played += now >= last ? now - last : now; // the walk loops; a wrap is not a rewind
          last = now;
          samples.push({ body: scene.position.x, feet: feet.map((f) => { f.getWorldPosition(v); return { x: v.x, y: v.y, z: v.z }; }) });
          if (!window.__walkDone && samples.length < 900) requestAnimationFrame(tick);
          else done({ samples, played, seconds: (performance.now() - t0) / 1000, travelled: Math.abs(scene.position.x - body0), speed: window.__capy.groundSpeed });
        };
        window.__walkDone = false;
        window.__capyOnMessage = (m) => { if (m?.type === "clipEnd" && m.clip === "walk") window.__walkDone = true; };
        window.__capySend({ type: "walk", from, to, then: "idle_breathe" });
        requestAnimationFrame(() => { last = clock(); body0 = scene.position.x; t0 = performance.now(); tick(); });
      }),
    [from, to],
  );

// the page has no THREE global; hand it a Vector3 factory once
await page.evaluate(() => { window.THREE_VEC = Object.getPrototypeOf(window.__capy.scene.position).constructor; });

const legs = [
  ["left to right", -0.62, 0.62],
  ["a short step", 0.62, 0.2],
];
let failed = false;
for (const [label, from, to] of legs) {
  const { samples, played, seconds, travelled, speed } = await run(from, to);
  if (travelled < 0.02) { console.error(`✗ ${label}: he never moved`); failed = true; continue; }
  const ratio = (played * speed) / travelled; // 1 = the feet carried him, 0.5 = he glided on half a stride
  const ok = ratio > 0.85 && ratio < 1.18;
  failed = failed || !ok;
  // world slip: what the three-quarter heading costs, since his feet point 38° away from where he is going.
  // Informational — the heading is a look the app asked for, not a bug — but a jump in it means something moved.
  let slip = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    const k = b.feet[0].y <= b.feet[1].y ? 0 : 1;
    if (k !== (a.feet[0].y <= a.feet[1].y ? 0 : 1)) continue; // the swap frame is a new foot, not a step
    slip += Math.hypot(b.feet[k].x - a.feet[k].x, b.feet[k].z - a.feet[k].z);
  }
  console.log(
    `${ok ? "✓" : "✗"} ${label}: ${travelled.toFixed(2)} units in ${seconds.toFixed(2)}s (${(travelled / seconds).toFixed(2)} u/s, ` +
      `stride says ${speed.toFixed(2)} u/s) · ${played.toFixed(2)}s of stride · stride/ground ${ratio.toFixed(2)} · ` +
      `planted foot slip ${(slip / travelled).toFixed(2)}× the distance over ${samples.length} frames`,
  );
}
if (process.argv.includes("--shots")) {
  await page.evaluate(() => window.__capySend({ type: "walk", from: -0.6, to: 0.6, then: "heart_full" }));
  await page.waitForTimeout(700);
  await page.screenshot({ path: resolve(import.meta.dirname, "../../../docs/screenshots/walk-mid.png") });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(import.meta.dirname, "../../../docs/screenshots/walk-arrived.png") });
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
