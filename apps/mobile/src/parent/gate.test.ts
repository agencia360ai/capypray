import { describe, expect, it } from "vitest";
import { gate, isCorrect, makeChallenge } from "./gate";

describe("parental gate", () => {
  it("builds a challenge a 4–8 year old cannot guess: 4 options, one correct", () => {
    for (let i = 0; i < 50; i++) {
      const c = makeChallenge();
      expect(c.options).toHaveLength(4);
      expect(new Set(c.options).size).toBe(4);
      expect(c.options).toContain(c.answer);
      expect(c.answer).toBe(c.op === "+" ? c.a + c.b : c.a * c.b);
      expect(c.answer).toBeGreaterThanOrEqual(12);
    }
  });
  it("checks the pick", () => {
    const c = makeChallenge(() => 0.1);
    expect(isCorrect(c, c.answer)).toBe(true);
    expect(isCorrect(c, c.answer + 1)).toBe(false);
  });
  it("stays open for a few minutes, then closes", () => {
    gate.open(1000);
    expect(gate.isOpen(1000 + 60_000)).toBe(true);
    expect(gate.isOpen(1000 + 6 * 60_000)).toBe(false);
    gate.close();
    expect(gate.isOpen()).toBe(false);
  });
});
