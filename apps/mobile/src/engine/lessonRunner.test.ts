import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { createRunner, estimateMs } from "./lessonRunner";

const { pack } = validatePack(rawPack);

describe("lessonRunner", () => {
  it("never exposes unresolved prayer variables after the shorter onboarding", () => {
    for (const lesson of pack!.lessons) {
      const runner = createRunner(pack!, lesson, { kidName: "Mia" });
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
