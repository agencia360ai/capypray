import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validatePack, listAudio, interpolate, getLesson } from "./index";

const load = () => JSON.parse(readFileSync(join(__dirname, "../packs/christian-us-en-v1/pack.json"), "utf8"));

describe("christian-us-en-v1", () => {
  it("validates", () => {
    const { pack, issues } = validatePack(load());
    expect(issues).toEqual([]);
    expect(pack?.lessons.filter((l) => l.routine === "any").map((l) => l.id)).toEqual([...[1, 2, 3, 4].flatMap((w) => [1, 2, 3, 4, 5, 6, 7].map((d) => `w${w}d${d}`))]);
    expect(pack?.routines.bedtime.lessonId).toBe("bedtime-w1");
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
    const w1d1 = raw.lessons.find((l: { id: string }) => l.id === "w1d1");
    w1d1.beats[2].prayerId = "nope";
    w1d1.beats[3].minigameId = "nope";
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
    raw.lessons.find((l: { id: string }) => l.id === "w1d1").beats[0].text = Array.from({ length: 21 }, () => "hi").join(" ");
    const { issues } = validatePack(raw);
    expect(issues.some((i) => i.message.includes("> 20 words"))).toBe(true);
  });
});

describe("World 1 complete (GDD §7.1: 28 sessions)", () => {
  it("covers every skill of §5.1 (1–6 + shared) across the 4 weeks", () => {
    const { pack } = validatePack(load());
    const skills = new Set(pack!.lessons.filter((l) => l.routine === "any").map((l) => l.skillId));
    for (const s of ["hello", "thank-you", "sorry", "please-help", "others", "listen", "shared", "review"]) expect(skills.has(s)).toBe(true);
  });
  it("Beacon Days sit on day 7 of each week", () => {
    const { pack } = validatePack(load());
    for (const l of pack!.lessons.filter((l) => l.routine === "any")) expect(l.skillId === "review").toBe(l.day === 7);
  });
});

describe("week 1 curriculum (GDD §7.1)", () => {
  it("uses all 6 minigame types across week 1 + bedtime", () => {
    const { pack } = validatePack(load());
    const types = new Set(pack!.minigames.map((m) => m.type));
    expect([...types].sort()).toEqual(["collect", "fill_blank", "listen_timer", "people_picker", "sequence", "tap_choice"]);
  });
  it("only W1 and bedtime are free (GDD §10.1: paywall B with bedtime escape)", () => {
    const { pack } = validatePack(load());
    const free = pack!.lessons.filter((l) => l.free).map((l) => l.id);
    expect(free).toEqual(["meet-capy", "w1d1", "bedtime-w1"]);
  });
  it("bedtime routine ends with lights_out and is free", () => {
    const { pack } = validatePack(load());
    const bed = pack!.lessons.find((l) => l.id === "bedtime-w1")!;
    expect(bed.free).toBe(true);
    expect(bed.beats[bed.beats.length - 1]?.type).toBe("lights_out");
  });
});

describe("Meet Capy intro (get-to-know-you)", () => {
  it("asks 3 things and uses two of them in the first prayer", () => {
    const { pack } = validatePack(load());
    const intro = pack!.lessons.find((l) => l.id === pack!.routines.intro!.lessonId)!;
    const asks = intro.beats.filter((b) => b.type === "ask");
    expect(asks).toHaveLength(3);
    const prayer = pack!.prayers.find((p) => p.id === "first-prayer")!;
    expect(prayer.variables).toEqual(expect.arrayContaining(["thankfulFor", "feeling"]));
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
