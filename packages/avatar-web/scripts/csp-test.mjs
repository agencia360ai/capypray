import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
const html = readFileSync(process.argv[2]);
const server = createServer((req, res) => {
  const h = { "content-type": "text/html" }; if (!process.env.NO_CSP) h["content-security-policy"] = "default-src 'none'; script-src 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:; connect-src 'none'; worker-src 'none'"; res.writeHead(200, h);
  res.end(html);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 540, height: 720 } });
page.on("console", (m) => console.log("[console:" + m.type() + "]", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 300)));
await page.goto(`http://localhost:${port}/`);
await page.waitForTimeout(12000);
console.log("ready:", await page.evaluate(() => window.__capyReady), "| err overlay:", await page.evaluate(() => document.getElementById("err")?.textContent));
await page.screenshot({ path: process.argv[3] });
await browser.close(); server.close();
