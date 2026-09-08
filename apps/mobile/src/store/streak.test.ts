import { describe, expect, it } from "vitest";
import { bumpStreak } from "./kid";

describe("Capy Streak with Grace Days (GDD §5.3)", () => {
  const base = { current: 3, best: 3, lastActive: "2026-09-07", graceUsedWeek: 0, weekStart: "2026-09-07" };

  it("consecutive day increments", () => {
    expect(bumpStreak(base, "2026-09-08").current).toBe(4);
  });
  it("same day is a no-op", () => {
    expect(bumpStreak(base, "2026-09-07")).toBe(base);
  });
  it("one missed day uses a grace day, streak survives", () => {
    const s = bumpStreak(base, "2026-09-09");
    expect(s.current).toBe(4);
    expect(s.graceUsedWeek).toBe(1);
  });
  it("two missed days use both grace days", () => {
    const s = bumpStreak(base, "2026-09-10");
    expect(s.current).toBe(4);
    expect(s.graceUsedWeek).toBe(2);
  });
  it("three missed days reset to 1 but keep best", () => {
    const s = bumpStreak(base, "2026-09-11");
    expect(s.current).toBe(1);
    expect(s.best).toBe(3);
  });
  it("grace budget resets on a new week", () => {
    const spent = { ...base, graceUsedWeek: 2, lastActive: "2026-09-13", weekStart: "2026-09-07" };
    const s = bumpStreak(spent, "2026-09-15"); // Tuesday of next week, one day missed
    expect(s.current).toBe(4);
    expect(s.graceUsedWeek).toBe(1);
    expect(s.weekStart).toBe("2026-09-14");
  });
});
