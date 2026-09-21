import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packDir = resolve(root, "packages/content/packs/christian-us-en-v1");
const pack = JSON.parse(readFileSync(resolve(packDir, "pack.json"), "utf8"));
const lines = (...args) => JSON.parse(execFileSync(process.execPath, [resolve(root, "tools/audio-lines.mjs"), packDir, ...args], { encoding: "utf8" }));

test("narration inventory includes story endings and tap reactions with resolved variables", () => {
  const all = lines();
  const files = new Set(all.map(line => line.file));
  for (const story of pack.stories) {
    assert.ok(files.has(story.moralAudio), story.id);
    assert.ok(files.has(story.titleAudio), story.id);
  }
  for (const scene of pack.scenes) assert.ok(files.has(scene.titleAudio), scene.id);
  for (const key of ["beaconLine", "nudgeTap", "nudgeRepeat", "nudgeChoose"]) assert.ok(files.has(pack.ui[key + "Audio"]), key);
  assert.ok(files.has(pack.companion.ui.savedAudio));
  for (const line of pack.ui.tapLines) assert.ok(files.has(line.audio), line.audio);
  for (const line of all) assert.doesNotMatch(line.text, /\{\w+\}/, line.file);
});

test("recording gaps match the explicit queue, with no invisible unlinked lines", () => {
  const pending = JSON.parse(readFileSync(resolve(root, "docs/voice-recording-queue.json"), "utf8"));
  assert.deepEqual(lines("--missing"), pending.map(({ file, text }) => ({ file, text })));
  assert.ok(lines("--audit").every(line => line.file), "spoken line without a stable audio ID");
  const urls = JSON.parse(readFileSync(resolve(packDir, "audio/urls.json"), "utf8"));
  // the old wording told the child to drag; the screen taps, so neither the pack nor the url list may carry it
  assert.ok(!("mg_w1d2_prompt.mp3" in urls));
  const files = new Set(lines().map(line => line.file));
  assert.ok(!files.has("mg_w1d2_prompt.mp3"));
});
