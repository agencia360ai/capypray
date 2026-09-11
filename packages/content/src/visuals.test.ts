import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import raw from "../packs/christian-us-en-v1/pack.json";
import { Pack } from "./schema";
import { VisualCue } from "./visuals";

describe("narrative visuals", () => {
  it("accompanies every story page, moral and prayer line with valid bundled art", () => {
    const pack = Pack.parse(raw);
    for (const story of pack.stories) {
      const cues = [...story.pages.map(page => page.visual), story.moralVisual];
      expect(new Set(cues.map(cue => cue?.art)).size).toBeGreaterThanOrEqual(3);
      for (const cue of cues) {
        expect(cue?.symbol).toBeTruthy();
        expect(cue?.art).toBeTruthy();
        const asset = cue!.art === story.id ? "stories" : "pages";
        expect(existsSync(new URL(`../../../apps/mobile/assets/illustrations/${asset}/${cue!.art}.jpg`, import.meta.url))).toBe(true);
      }
    }
    for (const prayer of pack.prayers) {
      expect(prayer.lines.every(line => line.visual?.symbol)).toBe(true);
    }
  });

  it("rejects unknown art, symbols and motions at the content boundary", () => {
    expect(VisualCue.safeParse({ symbol: "heart", art: "missing" }).success).toBe(false);
    expect(VisualCue.safeParse({ symbol: "missing" }).success).toBe(false);
    expect(VisualCue.safeParse({ symbol: "heart", motion: "flash" }).success).toBe(false);
  });

  it("preserves cues across translated text and still accepts older packs", () => {
    const translated = structuredClone(raw);
    translated.prayers[0]!.lines[0]!.text = "Hola, Dios.";
    translated.stories[0]!.pages[0]!.text = "Había un pastor.";
    const pack = Pack.parse(translated);
    expect(pack.prayers[0]!.lines[0]!.visual).toEqual(raw.prayers[0]!.lines[0]!.visual);
    expect(pack.stories[0]!.pages[0]!.visual).toEqual(raw.stories[0]!.pages[0]!.visual);
    const legacy = JSON.parse(JSON.stringify(raw, (key, value) => key === "visual" || key === "moralVisual" ? undefined : value));
    expect(Pack.safeParse(legacy).success).toBe(true);
  });
});
