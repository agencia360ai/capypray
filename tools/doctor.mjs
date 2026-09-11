// One command that answers "why am I still seeing the old app?": prints what this checkout actually has.
// usage: node tools/doctor.mjs
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packDir = resolve(root, "packages/content/packs/christian-us-en-v1");
const audioDir = resolve(root, "apps/mobile/assets/audio");
const avatarHtml = resolve(root, "apps/mobile/assets/avatar/index.html");

const git = (...args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};
const rows = [];
// two clones on one machine is a classic: say exactly which folder these answers describe
console.log(`checkout: ${root}\n`);
const row = (ok, label, detail) => rows.push({ ok, label, detail });

// 1. is this checkout on the branch the work is pushed to, and up to date with it?
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const head = git("rev-parse", "--short", "HEAD");
const upstream = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}");
git("fetch", "-q", "origin", branch);
const remote = upstream ? git("rev-parse", "--short", upstream) : "";
const behind = upstream ? git("rev-list", "--count", `HEAD..${upstream}`) : "";
row(!!upstream, "branch", `${branch || "?"} at ${head || "?"}${upstream ? ` · tracks ${upstream} at ${remote}` : " · NO upstream: this branch is not following origin"}`);
row(behind === "0", "up to date", behind === "0" ? "nothing to pull" : `${behind} commits behind ${upstream} — run: git pull`);
const dirty = git("status", "--porcelain").split("\n").filter(Boolean).length;
row(true, "local edits", dirty ? `${dirty} changed files (a pull can refuse to run)` : "clean");

// 2. the 3D viewer is generated, never committed
if (existsSync(avatarHtml)) {
  const st = statSync(avatarHtml);
  row(true, "avatar viewer", `${(st.size / 1e6).toFixed(1)} MB, built ${st.mtime.toISOString().slice(0, 16).replace("T", " ")}`);
} else {
  row(false, "avatar viewer", "missing — run: pnpm --filter @capy/avatar-web build");
}

// 3. the voice files are generated too, and the lock says which voice they came from
const voice = existsSync(resolve(packDir, "audio/voice.json")) ? JSON.parse(readFileSync(resolve(packDir, "audio/voice.json"), "utf8")).name : "?";
const urls = JSON.parse(readFileSync(resolve(packDir, "audio/urls.json"), "utf8"));
const have = existsSync(audioDir) ? readdirSync(audioDir).filter((f) => f.endsWith(".mp3")).length : 0;
const lock = existsSync(resolve(audioDir, "urls.lock.json")) ? JSON.parse(readFileSync(resolve(audioDir, "urls.lock.json"), "utf8")) : {};
const localVoice = lock._voice ?? (have ? "unknown" : "none");
const expected = Object.keys(urls).length;
row(have === expected && localVoice === voice, "voice files", `${have} / ${expected} mp3, voice on disk: ${localVoice} (pack wants ${voice})${have === expected && localVoice === voice ? "" : " — run: node tools/audio-fetch.mjs packages/content/packs/christian-us-en-v1"}`);

// 4. the pack the app will read
const pack = JSON.parse(readFileSync(resolve(packDir, "pack.json"), "utf8"));
row(true, "content pack", `${pack.id}@${pack.version} · ${pack.lessons.length} lessons, ${pack.stories?.length ?? 0} stories`);

// 5. a stale Metro cache is the classic "I still see the old app"
const expo = resolve(root, "apps/mobile/.expo");
row(true, "metro cache", existsSync(expo) ? "present — start with `pnpm --filter @capy/mobile start -c` to clear it" : "none");

const pad = Math.max(...rows.map((r) => r.label.length));
for (const r of rows) console.log(`${r.ok ? "ok  " : "FIX "} ${r.label.padEnd(pad)}  ${r.detail}`);
const broken = rows.filter((r) => !r.ok).length;
console.log(broken ? `\n${broken} thing(s) to fix above.` : "\nThis checkout is current. If the app still looks old, it is the Metro cache or the device: stop Expo, start with -c, and reload the app.");
