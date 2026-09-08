// Visual loop (GDD §8.3 step 5): build, serve dist, screenshot each clip.
// usage: node scripts/screenshot.mjs [clip ...]   (defaults: idle_breathe talk_a celebrate sleep)
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const dist = resolve(import.meta.dirname, "../dist");
const out = resolve(import.meta.dirname, "../screenshots");
const clips = process.argv.slice(2).length ? process.argv.slice(2) : ["idle_breathe", "talk_a", "celebrate", "sleep", "sad", "munch"];
const mime = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".css": "text/css", ".json": "application/json" };

const server = createServer(async (req, res) => {
  const p = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try {
    await stat(p);
    res.writeHead(200, { "content-type": mime[extname(p)] ?? "application/octet-stream" });
    res.end(await readFile(p));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const port = server.address().port;

// PLAYWRIGHT_CHROMIUM lets CI / remote sandboxes point at a pre-installed Chromium.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;
const browser = await chromium.launch({ executablePath, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 640, height: 1000 }, deviceScaleFactor: 1 });
page.on("console", (m) => m.type() === "error" && console.error("[page]", m.text()));
page.on("pageerror", (e) => console.error("[pageerror]", e.message));

for (const clip of clips) {
  const [c, skin] = clip.split("+");
  await page.goto(`http://localhost:${port}/preview.html?bare=1&clip=${c}${skin ? `&skin=${skin}` : ""}`);
  await page.waitForFunction(() => window.__capyReady === true, null, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const file = join(out, `${clip}.png`);
  await page.screenshot({ path: file });
  console.log("wrote", file);
}
await browser.close();
server.close();
