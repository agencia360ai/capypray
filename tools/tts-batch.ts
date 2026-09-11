/**
 * Idempotent ElevenLabs batch: every line Capy says — the pack (lessons, prayers, stories, minigames) plus the
 * parent-zone lines (onboarding questions, paywall greeting; apps/mobile/src/parent/strings.ts CAPY_LINES).
 * Writes straight into apps/mobile/assets/audio (what Metro bundles) and regenerates src/audio/manifest.ts.
 *
 *   ELEVENLABS_API_KEY=… pnpm tsx tools/tts-batch.ts packages/content/packs/christian-us-en-v1 --voice "Sam" --only ob_,pw_
 *
 *   --voice "<name>"   pick a voice from your ElevenLabs library by name (or set ELEVENLABS_VOICE_ID)
 *   --only a_,b_       render only files starting with these prefixes (cheap test before the 348 pack lines)
 *   --list-voices      print the voices in the account and exit
 *   --force            re-render even if the text hash matches
 *
 * Voice settings default to the "Sam · Calm, Honeyed and Neutral" tuning agreed on 10 sep 2026 (stability 0.3,
 * similarity 0.52, style 0.5, speaker boost, speed 1.0, eleven_multilingual_v2). Override with ELEVENLABS_STABILITY,
 * ELEVENLABS_SIMILARITY, ELEVENLABS_STYLE, ELEVENLABS_SPEED, ELEVENLABS_MODEL, ELEVENLABS_FORMAT.
 * A re-run only renders lines whose text (or voice/settings) changed: <audioDir>/manifest.json keeps a hash per file.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePack, interpolate } from "../packages/content/src/index";
import { CAPY_LINES } from "../apps/mobile/src/parent/strings";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? "") : undefined;
};
const FLAGS_WITH_VALUE = ["--voice", "--only"];
const dir = args.find((a, i) => !a.startsWith("--") && !FLAGS_WITH_VALUE.includes(args[i - 1] ?? ""));
const key = process.env.ELEVENLABS_API_KEY ?? "";
const API = process.env.ELEVENLABS_API ?? "https://api.elevenlabs.io/v1";
const headers = { "xi-api-key": key, "content-type": "application/json" };

type Voice = { voice_id: string; name: string; category?: string };
async function listVoices(): Promise<Voice[]> {
  const res = await fetch(`${API}/voices`, { headers });
  if (!res.ok) throw new Error(`voices: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { voices: Voice[] }).voices;
}

// wrapped: tools/ is CJS for tsx, so no top-level await
async function main() {
  if (!key) throw new Error("ELEVENLABS_API_KEY is required (create one at elevenlabs.io → Profile → API keys)");
  if (args.includes("--list-voices")) {
    for (const v of await listVoices()) console.log(`${v.voice_id}  ${v.name}${v.category ? `  (${v.category})` : ""}`);
    process.exit(0);
  }
  if (!dir) throw new Error("usage: tts-batch <packDir> [--voice name] [--only prefixes] [--force]");

  let voice = process.env.ELEVENLABS_VOICE_ID;
  const voiceName = flag("--voice");
  if (!voice && voiceName) {
    const all = await listVoices();
    const hit = all.find((v) => v.name.toLowerCase() === voiceName.toLowerCase()) ?? all.find((v) => v.name.toLowerCase().startsWith(voiceName.toLowerCase()));
    if (!hit) throw new Error(`no voice named "${voiceName}" in this account (add it to your library first). Have: ${all.map((v) => v.name).join(", ")}`);
    voice = hit.voice_id;
    console.log(`voice "${hit.name}" → ${voice}`);
  }
  if (!voice) throw new Error("set ELEVENLABS_VOICE_ID or pass --voice <name>");

  const settings = {
    model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
    voice_settings: {
      stability: Number(process.env.ELEVENLABS_STABILITY ?? 0.3),
      similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY ?? 0.52),
      style: Number(process.env.ELEVENLABS_STYLE ?? 0.5),
      use_speaker_boost: true,
      speed: Number(process.env.ELEVENLABS_SPEED ?? 1.0),
    },
  };
  // 64 kbps keeps the kid voice clean at ~40 KB per line (128 kbps doubles the bundle for no audible gain on a phone)
  const format = process.env.ELEVENLABS_FORMAT ?? "mp3_44100_64";
  const only = (flag("--only") ?? "").split(",").filter(Boolean);
  const force = args.includes("--force");

  const { pack, issues } = validatePack(JSON.parse(readFileSync(join(dir, "pack.json"), "utf8")));
  if (!pack || issues.length) throw new Error("pack invalid: " + JSON.stringify(issues));

  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const audioDir = resolve(root, "apps/mobile/assets/audio");
  mkdirSync(audioDir, { recursive: true });
  const manifestPath = join(audioDir, "manifest.json");
  const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

  // Variables are spoken with a neutral placeholder in v1 ("friend"); the kid's name is shown in the subtitle only.
  const SPOKEN_VARS = { kidName: "friend", person: "someone you love", thankfulFor: "something good", favorite: "Wow", mistake: "what I did", feeling: "this way", need: "what I need" };

  const lines = new Map<string, string>();
  const add = (file?: string, text?: string) => file && text && !lines.has(file) && lines.set(file, text);
  for (const l of pack.lessons) for (const b of l.beats) if ("audio" in b && b.audio && "text" in b) add(b.audio, b.text);
  for (const p of pack.prayers) for (const ln of p.lines) add(ln.audio, ln.text);
  for (const st of pack.stories ?? []) {
    for (const pg of st.pages) add(pg.audio, pg.text);
    add(st.moralAudio, st.moral);
  }
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
    const hash = createHash("sha1").update(JSON.stringify([voice, settings, format, spoken])).digest("hex");
    const out = join(audioDir, file);
    if (!force && manifest[file] === hash && existsSync(out)) continue;
    const res = await fetch(`${API}/text-to-speech/${voice}?output_format=${format}`, { method: "POST", headers, body: JSON.stringify({ text: spoken, ...settings }) });
    if (!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
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
