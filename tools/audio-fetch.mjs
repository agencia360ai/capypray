// Download pre-rendered lines listed in <packDir>/audio/urls.json ({ "w1d1_01.mp3": "https://…" }) into
// apps/mobile/assets/audio/, converting to mp3 when the source is wav (needs ffmpeg on PATH).
// Idempotent, and it re-downloads a line whose URL changed — so switching Capy's voice replaces every file.
// usage: node tools/audio-fetch.mjs packages/content/packs/christian-us-en-v1 [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
import { execFileSync } from "node:child_process";
const packDir = process.argv[2];
const force = process.argv.includes("--force");
if (!packDir) throw new Error("usage: audio-fetch <packDir> [--force]");
const urls = JSON.parse(readFileSync(resolve(packDir, "audio/urls.json"), "utf8"));
const voicePath = resolve(packDir, "audio/voice.json");
const voice = existsSync(voicePath) ? JSON.parse(readFileSync(voicePath, "utf8")) : { name: "unknown" };
const out = resolve(here, "../apps/mobile/assets/audio");
mkdirSync(out, { recursive: true });
// what this folder was last filled from, so a re-render (new voice) is picked up instead of skipped
const lockPath = resolve(out, "urls.lock.json");
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, "utf8")) : {};
const had = lock._voice;
console.log(`pack voice: ${voice.name}${had && had !== voice.name ? ` (this folder holds ${had} - replacing it)` : ""}`);
let n = 0;
let failed = 0;
const entries = Object.entries(urls);
for (const [file, url] of entries) {
  if (file.startsWith("_")) continue;
  const dest = resolve(out, file);
  if (!force && existsSync(dest) && lock[file] === url) continue;
  const res = await fetch(url).catch((e) => ({ ok: false, status: String(e) }));
  if (!res.ok) {
    failed++;
    console.warn(`skip ${file}: ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (/\.wav(\?|$)/.test(url)) {
    const tmp = dest.replace(/\.mp3$/, ".wav");
    writeFileSync(tmp, buf);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-ar", "22050", "-b:a", "48k", dest]);
    unlinkSync(tmp);
  } else writeFileSync(dest, buf);
  lock[file] = url;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2));
  n++;
  console.log("saved", file);
}
if (!failed) lock._voice = voice.name;
writeFileSync(lockPath, JSON.stringify(lock, null, 2));
console.log(`done: ${n} downloaded, ${entries.length - n - failed} already current, ${failed} failed → ${out}`);
console.log(failed ? `${failed} lines did NOT download, so this folder is not fully on the "${voice.name}" voice yet` : `this folder now holds the "${voice.name}" voice`);
if (failed) process.exitCode = 1;
