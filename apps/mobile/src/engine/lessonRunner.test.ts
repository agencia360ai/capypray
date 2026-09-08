import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { createRunner, estimateMs } from "./lessonRunner";

const { pack } = validatePack(rawPack);

describe("lessonRunner", () => {
  it("walks W1D1 beat by beat, line by line, and counts lanterns", () => {
    const lesson = pack!.lessons.find((l) => l.id === "w1d1")!;
    const r = createRunner(pack!, lesson, { kidName: "Mia" });
    const first = r.start();
    expect(first.state.step.kind).toBe("say");
    expect((first.state.step as { text: string }).text).toContain("Hi Mia!");
    expect(first.effects.map((e) => e.type)).toEqual(["mood", "speak"]);
    expect(first.effects[1]).toMatchObject({ type: "speak", clip: "wave_hello" });

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

  it("Meet Capy: answers flow into the first prayer", () => {
    const intro = pack!.lessons.find((l) => l.id === "meet-capy")!;
    const r = createRunner(pack!, intro, { kidName: "Leo" });
    r.start();
    let s = r.next();
    s = r.next(); // first ask: favorite
    expect(s.state.step.kind).toBe("ask");
    r.answer("favorite", "Dogs");
    s = r.next();
    expect((s.state.step as { text: string }).text).toContain("Dogs!");
    s = r.next(); // ask thankfulFor
    r.answer("thankfulFor", "Hugs");
    s = r.next(); // ask feeling
    r.answer("feeling", "Happy");
    r.next();
    r.next();
    s = r.next(); // repeat line 1
    expect(s.state.step.kind).toBe("repeat");
    s = r.next();
    expect((s.state.step as { text: string }).text).toBe("Thank you for Hugs.");
    s = r.next();
    expect((s.state.step as { text: string }).text).toBe("I feel Happy today.");
    expect(r.vars.favorite).toBe("Dogs");
  });

  it("estimates speech duration slowly", () => {
    expect(estimateMs("Hi")).toBe(1500);
    expect(estimateMs("one two three four five six seven eight nine ten")).toBeGreaterThan(3500);
  });
});
