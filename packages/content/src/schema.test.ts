import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validatePack, listAudio, interpolate, getLesson } from "./index";

const load = () => JSON.parse(readFileSync(join(__dirname, "../packs/christian-us-en-v1/pack.json"), "utf8"));

describe("christian-us-en-v1", () => {
  it("validates", () => {
    const { pack, issues } = validatePack(load());
    expect(issues).toEqual([]);
    const world1 = new Set(pack?.worlds[0]?.weeks);
    expect(pack?.lessons.filter((l) => l.routine === "any" && world1.has(l.week!)).map((l) => l.id)).toEqual([...[1, 2, 3, 4].flatMap((w) => [1, 2, 3, 4, 5, 6, 7].map((d) => `w${w}d${d}`))]);
    expect(pack?.stories.length).toBeGreaterThanOrEqual(8);
    expect(pack?.scenes.map((sc) => sc.id)).toContain("kitchen");
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
    w1d1.beats.find((b: { type: string }) => b.type === "repeat_after_me").prayerId = "nope";
    w1d1.beats.find((b: { type: string }) => b.type === "minigame").minigameId = "nope";
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
    const free = pack!.lessons.filter((l) => l.free && l.routine !== "moment").map((l) => l.id);
    expect(free).toEqual(["meet-capy", "w1d1", "bedtime-w1"]);
  });
  it("bedtime routine ends with lights_out and is free", () => {
    const { pack } = validatePack(load());
    const bed = pack!.lessons.find((l) => l.id === "bedtime-w1")!;
    expect(bed.free).toBe(true);
    expect(bed.beats[bed.beats.length - 1]?.type).toBe("lights_out");
  });
});

describe("the opening (Meet Capy)", () => {
  it("is Capy alone telling a short story, then a short first prayer, with no questionnaire", () => {
    const { pack } = validatePack(load());
    const intro = pack!.lessons.find((l) => l.id === pack!.routines.intro!.lessonId)!;
    expect(intro.beats.filter((b) => b.type === "ask")).toHaveLength(0);
    const prayerAt = intro.beats.findIndex((b) => b.type === "repeat_after_me");
    expect(prayerAt).toBe(7);
    // every line before the prayer is Capy talking, voiced, and short enough to read on one screen
    for (const b of intro.beats.slice(0, prayerAt)) {
      expect(b.type).toBe("avatar_say");
      if (b.type === "avatar_say") { expect(b.audio).toMatch(/\.mp3$/); expect(b.text.split(/\s+/).length).toBeLessThanOrEqual(20); }
    }
    const prayer = pack!.prayers.find((p) => p.id === "first-prayer")!;
    expect(prayer.variables).toEqual(["kidName"]);
    expect(prayer.lines).toHaveLength(3);
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

describe("the prayer choice", () => {
  const choiceLesson = (raw: ReturnType<typeof load>) => raw.lessons.find((l: { id: string }) => l.id === "w1d4");
  const choice = (raw: ReturnType<typeof load>) => choiceLesson(raw).beats.find((b: { type: string }) => b.type === "choose_intention");

  it("ships one, with two authored prayers of the same skill", () => {
    const { pack } = validatePack(load());
    const beat = pack!.lessons.find((l) => l.id === "w1d4")!.beats.find((b) => b.type === "choose_intention")!;
    expect(beat.type).toBe("choose_intention");
    if (beat.type !== "choose_intention") return;
    expect(beat.options).toHaveLength(2);
    const prayers = new Map(pack!.prayers.map((p) => [p.id, p]));
    for (const o of beat.options) {
      expect(prayers.get(o.prayerId)?.skillId).toBe("thank-you");
      expect(o.echo.length).toBeGreaterThan(0);
    }
    expect(listAudio(pack!)).toEqual(expect.arrayContaining(beat.options.map((o) => o.echoAudio!)));
  });

  it("rejects an option that would change what the lesson teaches", () => {
    const raw = load();
    choice(raw).options[0].prayerId = "sorry-v1"; // saying sorry is a different lesson, not another way to give thanks
    const { issues } = validatePack(raw);
    expect(issues.some((i) => i.message.includes('teaches'))).toBe(true);
  });

  it("rejects an unknown prayer and a choice with no prayer to change", () => {
    const raw = load();
    choice(raw).options[1].prayerId = "nope";
    const lesson = choiceLesson(raw);
    lesson.beats = lesson.beats.filter((b: { type: string }) => b.type !== "repeat_after_me");
    const { issues } = validatePack(raw);
    expect(issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([expect.stringContaining('unknown prayer "nope"'), expect.stringContaining("needs a repeat_after_me beat after it")]),
    );
  });

  it("rejects two intention questions in one lesson", () => {
    const raw = load();
    const lesson = choiceLesson(raw);
    lesson.beats.splice(lesson.beats.indexOf(choice(raw)), 0, JSON.parse(JSON.stringify(choice(raw))));
    const { issues } = validatePack(raw);
    expect(issues.some((i) => i.message.includes("only ask for one intention"))).toBe(true);
  });
});

describe("authored variation validation", () => {
  it("rejects missing, duplicate and different-skill prayer alternatives", () => {
    for (const id of ["missing-prayer", "hello-god-v1", "sorry-v1"]) {
      const raw = load();
      raw.lessons.find((l: { id: string }) => l.id === "w1d1").beats.find((b: { type: string }) => b.type === "repeat_after_me").prayerVariants = [id];
      expect(validatePack(raw).issues.some(i => i.path.startsWith("lessons.w1d1"))).toBe(true);
    }
  });
  it("inventories spoken UI and title recordings, not only lesson audio", () => {
    const { pack } = validatePack(load());
    const audio = listAudio(pack!);
    expect(audio).toContain(pack!.companion.ui.savedAudio);
    for (const item of [...pack!.stories, ...pack!.scenes]) expect(audio).toContain(item.titleAudio);
    for (const lesson of pack!.lessons) for (const beat of lesson.beats)
      if (beat.type === "avatar_say") for (const line of beat.variations ?? []) expect(audio).toContain(line.audio);
  });
});
