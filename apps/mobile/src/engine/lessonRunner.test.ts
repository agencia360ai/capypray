import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { createRunner, estimateMs } from "./lessonRunner";

const { pack } = validatePack(rawPack);

describe("lessonRunner", () => {
  it("walks W1D1 beat by beat, line by line, and counts lanterns", () => {
    const lesson = pack!.lessons[0]!;
    const r = createRunner(pack!, lesson, { kidName: "Mia" });
    const first = r.start();
    expect(first.state.step.kind).toBe("say");
    expect((first.state.step as { text: string }).text).toContain("Hi Mia!");
    expect(first.effects.map((e) => e.type)).toEqual(["mood", "play", "speak"]);

    r.next(); // second say
    const rep1 = r.next();
    expect(rep1.state.step.kind).toBe("repeat");
    expect((rep1.state.step as { text: string }).text).toBe("Hi God, it's me, Mia.");
    r.next();
    const rep3 = r.next();
    expect((rep3.state.step as { lineIndex: number }).lineIndex).toBe(2);

    const mg = r.next();
    expect(mg.state.step).toEqual({ kind: "minigame", minigameId: "mg_w1d1_who_listens" });
    const reward = r.next();
    expect(reward.state.step).toEqual({ kind: "reward", lanterns: 1 });
    r.next(); // closing say
    const done = r.next();
    expect(done.state.step.kind).toBe("done");
    expect(r.summary().lanterns).toBe(1);
    expect(r.summary().done).toBe(true);
  });

  it("estimates speech duration slowly", () => {
    expect(estimateMs("Hi")).toBe(1500);
    expect(estimateMs("one two three four five six seven eight nine ten")).toBeGreaterThan(3500);
  });
});
