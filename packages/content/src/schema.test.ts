import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validatePack, listAudio, interpolate, getLesson } from "./index";

const load = () => JSON.parse(readFileSync(join(__dirname, "../packs/christian-us-en-v1/pack.json"), "utf8"));

describe("christian-us-en-v1", () => {
  it("validates", () => {
    const { pack, issues } = validatePack(load());
    expect(issues).toEqual([]);
    expect(pack?.lessons.map((l) => l.id)).toEqual(["w1d1", "w1d2", "w1d3"]);
  });

  it("lists audio refs", () => {
    const { pack } = validatePack(load());
    const audio = listAudio(pack!);
    expect(audio.length).toBeGreaterThan(10);
    expect(audio.every((a) => a.endsWith(".mp3"))).toBe(true);
  });

  it("every lesson has a reward and starts with Capy speaking", () => {
    const { pack } = validatePack(load());
    for (const l of pack!.lessons) {
      expect(l.beats[0]?.type).toBe("avatar_say");
      expect(l.beats.some((b) => b.type === "reward")).toBe(true);
    }
  });
});

describe("validatePack referential checks", () => {
  it("catches unknown prayer and minigame ids", () => {
    const raw = load();
    raw.lessons[0].beats[2].prayerId = "nope";
    raw.lessons[0].beats[3].minigameId = "nope";
    const { issues } = validatePack(raw);
    expect(issues.map((i) => i.message)).toEqual(expect.arrayContaining([expect.stringContaining('unknown prayer "nope"'), expect.stringContaining('unknown minigame "nope"')]));
  });

  it("requires exactly one correct card in tap_choice", () => {
    const raw = load();
    const mg = raw.minigames.find((m: { type: string }) => m.type === "tap_choice");
    for (const c of mg.cards) c.correct = true;
    const { issues } = validatePack(raw);
    expect(issues.some((i) => i.message.includes("exactly 1 correct"))).toBe(true);
  });

  it("rejects hardcoded-looking long beats", () => {
    const raw = load();
    raw.lessons[0].beats[0].text = Array.from({ length: 21 }, () => "hi").join(" ");
    const { issues } = validatePack(raw);
    expect(issues.some((i) => i.message.includes("> 20 words"))).toBe(true);
  });
});

describe("helpers", () => {
  it("interpolates variables", () => {
    expect(interpolate("Hi God, it's me, {kidName}.", { kidName: "Mia" })).toBe("Hi God, it's me, Mia.");
    expect(interpolate("Thank you for {thankfulFor}.", {})).toBe("Thank you for {thankfulFor}.");
  });
  it("getLesson", () => {
    const { pack } = validatePack(load());
    expect(getLesson(pack!, "w1d2")?.title).toBe("You Can Pray Anywhere");
  });
});
