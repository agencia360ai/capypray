import { describe, expect, it } from "vitest";
import raw from "../packs/christian-us-en-v1/pack.json";
import { listAudio, validatePack } from "./index";

describe("companion content", () => {
  it("ships eight free, replayable moments and a three-line first prayer", () => {
    const { pack, issues } = validatePack(raw);
    expect(issues).toEqual([]);
    expect(pack!.companion.moments).toHaveLength(8);
    expect(pack!.lessons.filter(l => l.routine === "moment")).toHaveLength(8);
    expect(pack!.prayers.find(p => p.id === "first-prayer")!.lines).toHaveLength(3);
    for (const moment of pack!.companion.moments) {
      const lesson = pack!.lessons.find(l => l.id === moment.lessonId)!;
      expect(lesson.free).toBe(true);
      expect(lesson.beats.some(b => b.type === "repeat_after_me")).toBe(true);
    }
  });
  it("rejects missing and paywalled emotion destinations", () => {
    const missing = structuredClone(raw);
    missing.companion.feelings[0]!.lessonId = "missing";
    expect(validatePack(missing).issues.some(i => i.path.startsWith("companion."))).toBe(true);
    const paid = structuredClone(raw);
    paid.lessons.find(l => l.id === paid.companion.feelings[0]!.lessonId)!.free = false;
    expect(validatePack(paid).issues.some(i => i.path.startsWith("companion."))).toBe(true);
  });
  it("exports locale-specific audio refs for the new content pipeline", () => {
    const { pack } = validatePack(raw);
    expect(listAudio(pack!)).toContain("moment_worried_prayer_v08_1.mp3");
    expect(listAudio(pack!)).toContain("meet_capy_v08_1.mp3");
  });
});
