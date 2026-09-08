// Renders tools/art/*.svg to apps/mobile/assets/backgrounds/<name>.jpg (1080×1920).
// usage: node tools/art/render.mjs meadow   (PLAYWRIGHT_CHROMIUM=/path if needed)
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const name = process.argv[2] ?? "meadow";
const root = resolve(import.meta.dirname, "../..");
const svg = readFileSync(resolve(root, "tools/art", `${name}.svg`), "utf8");
const outDir = resolve(root, "apps/mobile/assets/backgrounds");
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(`<body style="margin:0">${svg}</body>`);
await page.screenshot({ path: resolve(outDir, `${name}.jpg`), type: "jpeg", quality: 82 });
await browser.close();
console.log("wrote", resolve(outDir, `${name}.jpg`));
