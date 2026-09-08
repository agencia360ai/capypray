import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { validatePack, listAudio } from "./index";

const [cmd, target = "packs"] = process.argv.slice(2);

if (cmd !== "validate") {
  console.error("usage: content validate <packsDir|pack.json>");
  process.exit(2);
}

const root = resolve(target);
const files = statSync(root).isDirectory()
  ? readdirSync(root).map((d) => join(root, d, "pack.json")).filter((f) => existsSync(f))
  : [root];

let failed = 0;
for (const file of files) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const { pack, issues } = validatePack(raw);
  const audio = pack ? listAudio(pack) : [];
  const audioDir = join(file, "..", "audio");
  const missingAudio = audio.filter((a) => !existsSync(join(audioDir, a)));
  const label = pack ? `${pack.id}@${pack.version}` : file;
  if (issues.length) {
    failed++;
    console.error(`✗ ${label}`);
    for (const i of issues) console.error(`   ${i.path}: ${i.message}`);
  } else {
    console.log(`✓ ${label}: ${pack!.lessons.length} lessons, ${pack!.prayers.length} prayers, ${pack!.minigames.length} minigames, ${audio.length} audio refs`);
  }
  if (missingAudio.length) console.warn(`   ⚠ ${missingAudio.length} audio files not yet rendered (run tools/tts-batch)`);
}
process.exit(failed ? 1 : 0);
