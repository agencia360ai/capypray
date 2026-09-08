// Download pre-rendered lines listed in <packDir>/audio/urls.json ({ "w1d1_01.mp3": "https://…" }) into
// apps/mobile/assets/audio/, converting to mp3 when the source is wav (needs ffmpeg on PATH). Idempotent.
// usage: node tools/audio-fetch.mjs packages/content/packs/christian-us-en-v1
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
const packDir = process.argv[2];
if (!packDir) throw new Error("usage: audio-fetch <packDir>");
const urls = JSON.parse(readFileSync(resolve(packDir, "audio/urls.json"), "utf8"));
const out = resolve(import.meta.dirname, "../apps/mobile/assets/audio");
mkdirSync(out, { recursive: true });
let n = 0;
for (const [file, url] of Object.entries(urls)) {
  const dest = resolve(out, file);
  if (existsSync(dest)) continue;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (/\.wav(\?|$)/.test(url)) {
    const tmp = dest.replace(/\.mp3$/, ".wav");
    writeFileSync(tmp, buf);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-ar", "22050", "-b:a", "48k", dest]);
    unlinkSync(tmp);
  } else writeFileSync(dest, buf);
  n++;
  console.log("saved", file);
}
console.log(`done: ${n} new, ${Object.keys(urls).length - n} already present`);
