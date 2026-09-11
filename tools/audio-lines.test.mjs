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
  for (const story of pack.stories) assert.ok(files.has(story.moralAudio), story.id);
  for (const line of pack.ui.tapLines) assert.ok(files.has(line.audio), line.audio);
  for (const line of all) assert.doesNotMatch(line.text, /\{\w+\}/, line.file);
});

test("every spoken line has a recording, and the retired drag instruction has none", () => {
  assert.deepEqual(lines("--missing"), []);
  const urls = JSON.parse(readFileSync(resolve(packDir, "audio/urls.json"), "utf8"));
  // the old wording told the child to drag; the screen taps, so neither the pack nor the url list may carry it
  assert.ok(!("mg_w1d2_prompt.mp3" in urls));
  const files = new Set(lines().map(line => line.file));
  assert.ok(!files.has("mg_w1d2_prompt.mp3"));
});
