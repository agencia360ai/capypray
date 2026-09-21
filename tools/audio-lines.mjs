// Inventory pack narration, including runtime UI lines and titles.
// usage: node tools/audio-lines.mjs <packDir> [--missing | --audit]
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const dir = process.argv[2];
const pack = JSON.parse(readFileSync(resolve(dir, "pack.json"), "utf8"));
const VARS = { kidName: "friend", person: "someone you love", thankfulFor: "something good", mistake: "what I did", feeling: "this way", need: "what I need", favorite: "Wow" };
const spoken = (t) => t.replace(/\{(\w+)\}/g, (m, k) => VARS[k] ?? m).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
const lines = new Map();
const add = (file, text, context) => {
  if (!text) return;
  const key = file ?? context;
  const found = lines.get(key);
  if (found) { found.contexts.push(context); return; }
  lines.set(key, { file: file ?? null, text: spoken(text), contexts: [context] });
};
add(pack.companion.breathing.prompt.audio, pack.companion.breathing.prompt.text, "companion.breathing.prompt");
add(pack.companion.ui.savedAudio, pack.companion.ui.saved, "companion.ui.saved (lantern reward)");
for (const [i, s] of (pack.companion.home ?? []).entries()) if (s.reveal) add(s.reveal.audio, s.reveal.text, "companion.home." + i + " (" + s.id + " opens)");
for (const key of ["beaconLine", "nudgeTap", "nudgeRepeat", "nudgeChoose"])
  add(pack.ui[key + "Audio"], pack.ui[key], "ui." + key);
for (const l of pack.lessons)
  for (const [i, b] of l.beats.entries()) {
    const at = "lessons." + l.id + ".beats." + i;
    if (b.text && b.type !== "parent_prompt") add(b.audio, b.text, at);
    for (const [n, line] of (b.variations ?? []).entries()) add(line.audio, line.text, at + ".variations." + n);
    for (const o of b.options ?? []) add(o.echoAudio, o.echo, at + ".options." + o.id);
  }
for (const p of pack.prayers) for (const [i, ln] of p.lines.entries()) add(ln.audio, ln.text, "prayers." + p.id + ".lines." + i);
for (const [i, t] of (pack.ui.tapLines ?? []).entries()) add(t.audio, t.text, "ui.tapLines." + i);
for (const s of pack.stories ?? []) {
  add(s.titleAudio, s.title, "stories." + s.id + ".title (story shelf)");
  for (const [i, pg] of s.pages.entries()) add(pg.audio, pg.text, "stories." + s.id + ".pages." + i);
  add(s.moralAudio, s.moral, "stories." + s.id + ".moral");
}
for (const s of pack.scenes ?? []) add(s.titleAudio, s.title, "scenes." + s.id + ".title (place visit)");
for (const m of pack.minigames)
  for (const k of ["prompt", "successLine", "retryLine", "closingLine"])
    if (m[k]) add(m[k].audio, m[k].text, "minigames." + m.id + "." + k);
const urlsPath = resolve(dir, "audio/urls.json");
const have = existsSync(urlsPath) ? JSON.parse(readFileSync(urlsPath, "utf8")) : {};
const audit = [...lines.values()].map(line => ({ ...line, status: !line.file ? "unlinked" : have[line.file] ? "catalogued" : "needs-recording" }));
const out = process.argv.includes("--audit") ? audit : audit
  .filter(line => line.file && (!process.argv.includes("--missing") || line.status !== "catalogued"))
  .map(({ file, text }) => ({ file, text }));
console.log(JSON.stringify(out));
