/**
 * Render every line Capy says with a local VoiceStudio server (https://github.com/debpalash/VoiceStudio).
 * VoiceStudio exposes an OpenAI-compatible endpoint, so this only needs the server running on this machine:
 *
 *   pnpm tsx tools/voicestudio-batch.ts packages/content/packs/christian-us-en-v1 --voice <profile-id>
 *
 *   --voice <id>       VoiceStudio voice profile (or set VOICESTUDIO_VOICE)
 *   --list-voices      probe the server for its voice profiles and exit
 *   --only a_,b_       render only files starting with these prefixes (cheap test before all lines)
 *   --force            re-render even when the text and settings are unchanged
 *   --speed 0.95       playback speed passed to the server (default 0.95: kid-paced)
 *
 * VOICESTUDIO_API overrides the base URL (default http://127.0.0.1:3900/v1). VOICESTUDIO_MODEL picks the engine
 * (default tts-1, which VoiceStudio maps to its selected engine). Nothing here ships in the app: the mp3 files land
 * in apps/mobile/assets/audio and Metro bundles them, so the child's device never talks to a voice service.
 *
 * Licence note: VoiceStudio's default OmniVoice weights are CC-BY-NC — not usable in a paid app. Pick an engine whose
 * weights allow commercial use (CosyVoice 3, VoxCPM2, MOSS-TTS-Nano: Apache-2.0; GPT-SoVITS: MIT) in the VoiceStudio UI
 * before rendering the shipping set.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePack, interpolate } from "../packages/content/src/index";
import { CAPY_LINES } from "../apps/mobile/src/parent/strings";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FLAGS_WITH_VALUE = ["--voice", "--only", "--speed"];
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};
const dir = args.find((a, i) => !a.startsWith("--") && !FLAGS_WITH_VALUE.includes(args[i - 1] ?? ""));
const API = (process.env.VOICESTUDIO_API ?? "http://127.0.0.1:3900/v1").replace(/\/$/, "");
const MODEL = process.env.VOICESTUDIO_MODEL ?? "tts-1";

const hint = `is VoiceStudio running? Start the app (or \`docker compose up\`) and check ${API.replace(/\/v1$/, "")} in a browser.`;

/** The server's own voice list is not part of the OpenAI surface, so probe the paths VoiceStudio is known to serve. */
async function listVoices() {
  const paths = ["/audio/voices", "/voices", "/models", "/../api/voices", "/../api/voice-profiles"];
  for (const p of paths) {
    const url = new URL(API + p).toString();
    const res = await fetch(url).catch(() => null);
    if (!res?.ok) continue;
    const body = await res.text();
    if (!body.trim().startsWith("{") && !body.trim().startsWith("[")) continue;
    console.log(`# ${url}`);
    console.log(body.slice(0, 4000));
    return;
  }
  throw new Error(`no voice list found on ${API}. Copy the profile id from the VoiceStudio window instead — ${hint}`);
}

async function main() {
  if (args.includes("--list-voices")) return listVoices();
  if (!dir) throw new Error("usage: voicestudio-batch <packDir> --voice <profile-id> [--only prefixes] [--force]");
  const voice = flag("--voice") ?? process.env.VOICESTUDIO_VOICE;
  if (!voice) throw new Error("pass --voice <profile-id> (or set VOICESTUDIO_VOICE). --list-voices prints what the server has.");
  const speed = Number(flag("--speed") ?? process.env.VOICESTUDIO_SPEED ?? 0.95);
  const only = (flag("--only") ?? "").split(",").filter(Boolean);
  const force = args.includes("--force");

  const { pack, issues } = validatePack(JSON.parse(readFileSync(join(dir, "pack.json"), "utf8")));
  if (!pack || issues.length) throw new Error("pack invalid: " + JSON.stringify(issues));

  const root = resolve(here, "..");
  const audioDir = resolve(root, "apps/mobile/assets/audio");
  mkdirSync(audioDir, { recursive: true });
  const manifestPath = join(audioDir, "manifest.json");
  const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

  // Variables are spoken with a neutral placeholder ("friend"); the kid's name is shown in the subtitle only.
  const SPOKEN_VARS = { kidName: "friend", person: "someone you love", thankfulFor: "something good", favorite: "Wow", mistake: "what I did", feeling: "this way", need: "what I need" };

  const lines = new Map<string, string>();
  const add = (file?: string, text?: string) => file && text && !lines.has(file) && lines.set(file, text);
  for (const l of pack.lessons) for (const b of l.beats) if ("audio" in b && b.audio && "text" in b) add(b.audio, b.text);
  for (const p of pack.prayers) for (const ln of p.lines) add(ln.audio, ln.text);
  for (const st of pack.stories ?? []) {
    for (const pg of st.pages) add(pg.audio, pg.text);
    add(st.moralAudio, st.moral);
  }
  for (const t of pack.ui.tapLines ?? []) add(t.audio, t.text);
  for (const m of pack.minigames) {
    add(m.prompt.audio, m.prompt.text);
    if ("successLine" in m) add(m.successLine.audio, m.successLine.text);
    if ("retryLine" in m) add(m.retryLine.audio, m.retryLine.text);
    if ("closingLine" in m) add(m.closingLine.audio, m.closingLine.text);
  }
  for (const [file, text] of Object.entries(CAPY_LINES)) add(file, text);

  const todo = [...lines].filter(([file]) => !only.length || only.some((p) => file.startsWith(p)));
  let rendered = 0;
  for (const [file, text] of todo) {
    const spoken = interpolate(text, SPOKEN_VARS).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();
    const hash = createHash("sha1").update(JSON.stringify(["voicestudio", MODEL, voice, speed, spoken])).digest("hex");
    const out = join(audioDir, file);
    if (!force && manifest[file] === hash && existsSync(out)) continue;
    const res = await fetch(`${API}/audio/speech`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer local" },
      body: JSON.stringify({ model: MODEL, voice, input: spoken, response_format: "mp3", speed }),
    }).catch((e) => {
      throw new Error(`${file}: ${e instanceof Error ? e.message : e} — ${hint}`);
    });
    if (!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 512) throw new Error(`${file}: server returned ${buf.length} bytes — check the engine is loaded in VoiceStudio`);
    writeFileSync(out, buf);
    manifest[file] = hash;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    rendered++;
    console.log("rendered", file, "·", spoken.slice(0, 60));
  }
  console.log(`done: ${rendered} rendered, ${todo.length - rendered} unchanged (${lines.size} lines total)`);
  execFileSync("node", [resolve(root, "tools/audio-manifest.mjs")], { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
