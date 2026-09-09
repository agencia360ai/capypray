// One screenshot of preview.html with an arbitrary query. usage: node scripts/shot.mjs "clip=kneel_pray&t=2.4" out.png [waitMs]
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
const dist = resolve(import.meta.dirname, "../dist");
const [query, out, waitMs = "1200"] = process.argv.slice(2);
const mime = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary" };
const server = createServer(async (req, res) => {
  const p = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { await stat(p); res.writeHead(200, { "content-type": mime[extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); } catch { res.writeHead(404).end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 480, height: 800 } });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
await page.goto(`http://localhost:${port}/preview.html?bare=1&${query}`);
await page.waitForFunction(() => window.__capyReady === true, null, { timeout: 60_000 });
await page.waitForTimeout(Number(waitMs));
// "t=<seconds>": scrub the requested clip to an exact time (software GL renders too slowly to rely on the wall clock)
const q = new URLSearchParams(query);
if (q.get("t")) {
  await page.evaluate(([clip, t]) => {
    const { sm } = window.__capy;
    sm.play(clip, { loop: false, fade: 0 });
    sm.update(Number(t));
  }, [q.get("clip") ?? "idle_breathe", q.get("t")]);
  await page.waitForTimeout(150);
}
await page.screenshot({ path: out });
await browser.close(); server.close();
console.log("wrote", out);
