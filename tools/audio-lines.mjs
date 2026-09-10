// Print every spoken line of a pack as JSON [{file, text}] (variables spoken with neutral placeholders).
// usage: node tools/audio-lines.mjs packages/content/packs/christian-us-en-v1 [--missing]  (skips lines already in audio/urls.json)
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const dir = process.argv[2];
const onlyMissing = process.argv.includes("--missing");
const pack = JSON.parse(readFileSync(resolve(dir, "pack.json"), "utf8"));
const VARS = { kidName: "friend", person: "someone you love", thankfulFor: "something good", mistake: "what I did", feeling: "this way", need: "what I need", favorite: "Wow" };
const spoken = (t) => t.replace(/\{(\w+)\}/g, (m, k) => VARS[k] ?? m).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
const lines = new Map();
const add = (file, text) => file && text && !lines.has(file) && lines.set(file, spoken(text));
for (const l of pack.lessons) for (const b of l.beats) if (b.audio && b.text) add(b.audio, b.text);
for (const p of pack.prayers) for (const ln of p.lines) add(ln.audio, ln.text);
for (const s of pack.stories ?? []) for (const pg of s.pages) add(pg.audio, pg.text);
for (const m of pack.minigames) for (const k of ["prompt", "successLine", "retryLine", "closingLine"]) if (m[k]) add(m[k].audio, m[k].text);
const urlsPath = resolve(dir, "audio/urls.json");
const have = onlyMissing && existsSync(urlsPath) ? JSON.parse(readFileSync(urlsPath, "utf8")) : {};
const out = [...lines].filter(([f]) => !have[f]).map(([file, text]) => ({ file, text }));
console.log(JSON.stringify(out));
