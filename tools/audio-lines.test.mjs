import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
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

test("missing narration includes changed instructions and excludes available recordings", () => {
  const missing = new Set(lines("--missing").map(line => line.file));
  assert.ok(missing.has("mg_w1d2_prompt_v08.mp3"));
  assert.ok(!missing.has("w1d1_01.mp3"));
  assert.ok(!missing.has("tap_01.mp3"));
});
