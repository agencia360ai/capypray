import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { createRunner, estimateMs } from "./lessonRunner";

const { pack } = validatePack(rawPack);

describe("lessonRunner", () => {
  it("never exposes unresolved prayer variables after the shorter onboarding", () => {
    for (const lesson of pack!.lessons) for (const opts of [{}, { intentions: true }]) {
      const runner = createRunner(pack!, lesson, { kidName: "Mia" }, opts);
      let result = runner.start();
      for (let guard = 0; result.state.step.kind !== "done" && guard < 200; guard++) {
        if ("text" in result.state.step) expect(result.state.step.text).not.toMatch(/\{\w+\}/);
        result = runner.next();
      }
      expect(runner.summary().done).toBe(true);
    }
  });
  it("walks W1D1 beat by beat, line by line, and counts lanterns", () => {
    const lesson = pack!.lessons.find((l) => l.id === "w1d1")!;
    const r = createRunner(pack!, lesson, { kidName: "Mia" });
    const first = r.start();
    expect(first.state.step.kind).toBe("say");
    expect((first.state.step as { text: string }).text).toContain("Hi Mia!");
    expect(first.effects.map((e) => e.type)).toEqual(["mood", "speak"]);
    expect(first.effects[1]).toMatchObject({ type: "speak", clip: "wave_hello" });

    r.next(); // second say
    // story: one step per page, then the moral
    const story = r.next();
    expect(story.state.step.kind).toBe("story");
    const pages = (story.state.step as { story: { pages: unknown[] } }).story.pages.length;
    for (let i = 0; i < pages - 1; i++) expect(r.next().state.step.kind).toBe("story");
    const moral = r.next();
    expect(moral.state.step).toMatchObject({ kind: "story", last: true });
    expect(moral.effects[0]).toMatchObject({ type: "speak", clip: "heart" });
    const rep1 = r.next();
    expect(rep1.state.step.kind).toBe("repeat");
    expect((rep1.state.step as { text: string }).text).toBe("Hi God, it's me, Mia.");
    r.next();
    const rep3 = r.next();
    expect((rep3.state.step as { lineIndex: number }).lineIndex).toBe(2);

    const mg = r.next();
    expect(mg.state.step).toEqual({ kind: "minigame", minigameId: "mg_w1d1_who_listens" });
    const quiet = r.next();
    expect(quiet.state.step).toMatchObject({ kind: "listen", clip: "kneel_pray" });
    expect(quiet.effects[0]).toMatchObject({ type: "play", clip: "kneel_pray", loop: true });
    const reward = r.next();
    expect(reward.state.step).toEqual({ kind: "reward", lanterns: 1 });
    r.next(); // closing say
    const done = r.next();
    expect(done.state.step.kind).toBe("done");
    expect(r.summary().lanterns).toBe(1);
    expect(r.summary().done).toBe(true);
  });

  it("Meet Capy reaches a personalized prayer after two welcoming lines", () => {
    const intro = pack!.lessons.find(l => l.id === "meet-capy")!;
    const runner = createRunner(pack!, intro, { kidName: "Leo" });
    expect(runner.start().state.step).toMatchObject({ kind: "say" });
    expect(runner.next().state.step.kind).toBe("say");
    expect(runner.next().state.step).toMatchObject({ kind: "repeat", text: "Hi God, it’s me, Leo." });
    runner.next(); runner.next();
    expect(runner.next().state.step.kind).toBe("reward");
    runner.next(); runner.next();
    expect(runner.summary()).toMatchObject({ lanterns: 1, done: true });
  });

  it("estimates speech duration slowly", () => {
    expect(estimateMs("Hi")).toBe(1500);
    expect(estimateMs("one two three four five six seven eight nine ten")).toBeGreaterThan(3500);
  });
});

describe("the prayer choice", () => {
  const lesson = () => pack!.lessons.find((l) => l.id === "w1d4")!;
  /** Run to the beat before the prayer, answering nothing. */
  const runTo = (kind: string, opts?: { intentions?: boolean }) => {
    const r = createRunner(pack!, lesson(), { kidName: "Mia" }, opts);
    let res = r.start();
    for (let guard = 0; res.state.step.kind !== kind && res.state.step.kind !== "done" && guard < 60; guard++) res = r.next();
    return { r, res };
  };

  it("is not asked at all when the app runs without intentions", () => {
    const { r, res } = runTo("repeat");
    expect(res.state.step.kind).toBe("repeat");
    expect((res.state.step as { prayer: { id: string } }).prayer.id).toBe("thank-you-v1"); // the lesson's own prayer
    expect(r.intention).toBeUndefined();
  });

  it("offers both options and swaps in the one the child picks", () => {
    const { r, res } = runTo("choose_intention", { intentions: true });
    expect(res.state.step).toMatchObject({ kind: "choose_intention", clip: "think" });
    expect((res.state.step as { options: { id: string }[] }).options.map((o) => o.id)).toEqual(["people", "world"]);

    r.choose("world");
    const echo = r.next(); // Capy says the choice back before the prayer starts
    expect(echo.state.step).toMatchObject({ kind: "say", clip: "heart" });
    expect((echo.state.step as { text: string }).text).toContain("the world outside");

    const prayer = r.next();
    expect((prayer.state.step as { prayer: { id: string } }).prayer.id).toBe("thank-you-world-v1");
    expect(r.intention).toBe("thank-you-world-v1");
  });

  it("keeps the lesson's own prayer when the child is asked but picks nothing", () => {
    const { r, res } = runTo("choose_intention", { intentions: true });
    expect(res.state.step.kind).toBe("choose_intention");
    const prayer = r.next(); // the screen moved on without a tap
    expect((prayer.state.step as { prayer: { id: string } }).prayer.id).toBe("thank-you-v1");
  });

  it("prays every line of the chosen variant and reaches the end of the lesson", () => {
    const { r } = runTo("choose_intention", { intentions: true });
    r.choose("people");
    let res = r.next();
    const lines: string[] = [];
    for (let guard = 0; res.state.step.kind !== "done" && guard < 60; guard++) {
      if (res.state.step.kind === "repeat") lines.push(res.state.step.text);
      res = r.next();
    }
    expect(lines).toEqual(pack!.prayers.find((p) => p.id === "thank-you-people-v1")!.lines.map((l) => l.text.replace("{person}", pack!.companion.prayerDefaults.person ?? "")));
    expect(r.summary().done).toBe(true);
  });

  it("ignores an option that is not on the card the child was shown", () => {
    const { r } = runTo("choose_intention", { intentions: true });
    r.choose("nope");
    const next = r.next();
    expect((next.state.step as { prayer: { id: string } }).prayer.id).toBe("thank-you-v1");
  });
});
