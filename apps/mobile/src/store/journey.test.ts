import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { journeyNodes, journeyView } from "./journey";

const { pack } = validatePack(rawPack);
const p = pack!;
const done = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { at: "2026-09-20" }]));

describe("journeyNodes", () => {
  it("only curriculum lessons become stops", () => {
    const nodes = journeyNodes(p);
    const curriculum = p.lessons.filter((l) => l.routine === "any");
    expect(nodes).toHaveLength(curriculum.length);
    const ids = new Set(nodes.map((n) => n.id));
    for (const l of p.lessons.filter((l) => l.routine !== "any")) expect(ids.has(l.id)).toBe(false);
  });
  it("orders by world, then the week order that world lists, then day", () => {
    const nodes = journeyNodes(p);
    expect(nodes.slice(0, 3).map((n) => n.id)).toEqual(["w1d1", "w1d2", "w1d3"]);
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1]!, b = nodes[i]!;
      if (a.week === b.week) expect(b.day).toBeGreaterThan(a.day);
    }
    expect(nodes[0]!.worldId).toBe(p.worlds[0]!.id);
  });
  it("phase 1 builds the first seven stops only", () => {
    expect(journeyNodes(p, { limit: 7 }).map((n) => n.id)).toEqual(["w1d1", "w1d2", "w1d3", "w1d4", "w1d5", "w1d6", "w1d7"]);
  });
});

describe("journeyView", () => {
  it("a fresh save starts on the first stop", () => {
    const v = journeyView(p, {});
    expect(v.doneCount).toBe(0);
    expect(v.next?.id).toBe("w1d1");
    expect(v.nodes[0]!.state).toBe("next");
    expect(v.nodes[1]!.state).toBe("ahead");
  });
  it("the next stop is the first one not completed", () => {
    const v = journeyView(p, done("w1d1", "w1d2"));
    expect(v.next?.id).toBe("w1d3");
    expect(v.nodes[0]!.state).toBe("done");
  });
  it("counts out-of-order historical completions without moving the next stop past a gap", () => {
    const v = journeyView(p, done("w1d1", "w1d4", "w2d1"));
    expect(v.doneCount).toBe(3);
    expect(v.next?.id).toBe("w1d2"); // the gap is still the next thing to pray, so nothing is skipped
    expect(v.nodes.find((n) => n.id === "w1d4")!.state).toBe("done");
  });
  it("finishing every stop leaves no next stop", () => {
    const all = done(...journeyNodes(p, { limit: 7 }).map((n) => n.id));
    const v = journeyView(p, all, { limit: 7 });
    expect(v.next).toBeUndefined();
    expect(v.doneCount).toBe(7);
    expect(v.milestone).toBeUndefined();
  });
  it("draws a small window that keeps its size at both ends of the trail", () => {
    const start = journeyView(p, {}, { windowSize: 5 });
    expect(start.window).toHaveLength(5);
    expect(start.window[0]!.id).toBe("w1d1");
    const nearEnd = journeyView(p, done(...journeyNodes(p).slice(0, -1).map((n) => n.id)), { windowSize: 5 });
    expect(nearEnd.window).toHaveLength(5);
    expect(nearEnd.window.at(-1)!.id).toBe(journeyNodes(p).at(-1)!.id);
  });
  it("previews the end of the current week as the next milestone", () => {
    const v = journeyView(p, done("w1d1", "w1d2"));
    expect(v.milestone?.node.id).toBe("w1d7");
    expect(v.milestone?.stepsAway).toBe(5); // w1d3 … w1d7
  });
  it("situational moments and bedtime never advance the trail", () => {
    const before = journeyView(p, done("w1d1"));
    const after = journeyView(p, done("w1d1", p.routines.bedtime.lessonId!, p.companion.moments[0]!.lessonId));
    expect(after.next?.id).toBe(before.next?.id);
    expect(after.doneCount).toBe(before.doneCount);
  });
});
