import { describe, expect, it } from "vitest";
import { breathingFrame, breathingKeyframes } from "./breathing";

describe("guided breathing timing", () => {
  it.each([15000, 20000, 45000, 90000])("finishes %i ms on an exhale without a partial breath", duration => {
    const { cycles } = breathingFrame(0, duration);
    const keys = breathingKeyframes(duration);
    expect(keys.inputRange.at(-1)).toBe(duration);
    expect(keys.outputRange.at(-1)).toBeCloseTo(0);
    for (let cycle = 0; cycle < cycles; cycle++) {
      const start = cycle * duration / cycles;
      expect(breathingFrame(start + 1, duration)).toMatchObject({ current: cycle + 1, inhale: true });
      expect(breathingFrame(start + duration / cycles * 0.75, duration).inhale).toBe(false);
      expect(keys.outputRange[cycle * 16 + 8]).toBeCloseTo(1);
    }
    expect(breathingFrame(duration, duration)).toMatchObject({ current: cycles, inhale: false, complete: true });
  });
  it("keeps the same phase when resuming at the paused time", () => {
    const pausedAt = 5600;
    expect(breathingFrame(pausedAt, 15000)).toMatchObject({ current: 1, inhale: false, complete: false });
    expect(breathingFrame(pausedAt + 2000, 15000)).toMatchObject({ current: 2, inhale: true });
    expect(breathingFrame(16000, 15000)).toMatchObject({ current: 2, complete: true });
  });
});
