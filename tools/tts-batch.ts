/**
 * Idempotent ElevenLabs batch for every audio line in a pack (GDD backlog #5).
 * usage: ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... pnpm tsx tools/tts-batch.ts packages/content/packs/christian-us-en-v1
 * Writes <pack>/audio/<file>.mp3 and <pack>/audio/manifest.json (text hash per file) so re-runs only render changed lines.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validatePack, interpolate } from "../packages/content/src/index";

const dir = process.argv[2];
if (!dir) throw new Error("usage: tts-batch <packDir>");
const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID;
if (!key || !voice) throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID are required");

const { pack, issues } = validatePack(JSON.parse(readFileSync(join(dir, "pack.json"), "utf8")));
if (!pack || issues.length) throw new Error("pack invalid: " + JSON.stringify(issues));

const audioDir = join(dir, "audio");
mkdirSync(audioDir, { recursive: true });
const manifestPath = join(audioDir, "manifest.json");
const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

// Variables are spoken with a neutral placeholder in v1 ("friend"); the kid's name is shown in the subtitle only.
const SPOKEN_VARS = { kidName: "friend", person: "someone you love", thankfulFor: "something good", favorite: "Wow", mistake: "what I did", feeling: "this way", need: "what I need" };

const lines: Array<{ file: string; text: string }> = [];
for (const l of pack.lessons) for (const b of l.beats) if ("audio" in b && b.audio && "text" in b) lines.push({ file: b.audio, text: b.text });
for (const p of pack.prayers) for (const ln of p.lines) if (ln.audio) lines.push({ file: ln.audio, text: ln.text });
for (const m of pack.minigames) {
  if (m.prompt.audio) lines.push({ file: m.prompt.audio, text: m.prompt.text });
  if ("successLine" in m && m.successLine.audio) lines.push({ file: m.successLine.audio, text: m.successLine.text });
  if ("retryLine" in m && m.retryLine.audio) lines.push({ file: m.retryLine.audio, text: m.retryLine.text });
  if ("closingLine" in m && m.closingLine.audio) lines.push({ file: m.closingLine.audio, text: m.closingLine.text });
}

let rendered = 0;
for (const { file, text } of lines) {
  const spoken = interpolate(text, SPOKEN_VARS);
  const hash = createHash("sha1").update(voice + "|" + spoken).digest("hex");
  const out = join(audioDir, file);
  if (manifest[file] === hash && existsSync(out)) continue;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_22050_32`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text: spoken, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.2 } }),
  });
  if (!res.ok) throw new Error(`${file}: ${res.status} ${await res.text()}`);
  mkdirSync(join(out, ".."), { recursive: true });
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  manifest[file] = hash;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  rendered++;
  console.log("rendered", file);
}
console.log(`done: ${rendered} rendered, ${lines.length - rendered} unchanged`);
