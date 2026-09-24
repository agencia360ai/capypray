import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { freshSections, homeSections, pendingReveal } from "./home";

const { pack } = validatePack(rawPack);
const done = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, { at: 1, lanterns: 1 }]));
const ids = (s: { id: string }[]) => s.map((x) => x.id);

describe("the home opens up one door at a time", () => {
  it("starts with only today's prayer and bedtime", () => {
    expect(ids(homeSections(pack!, { beacons: 0, completed: {} }))).toEqual(["today", "bedtime"]);
  });
  it("opens the path, the stories and the games after the first lesson, feelings after the second, places after the third", () => {
    expect(ids(homeSections(pack!, { beacons: 0, completed: done("w1d1") }))).toEqual(["today", "bedtime", "journey", "stories", "games"]);
    expect(ids(homeSections(pack!, { beacons: 0, completed: done("w1d1", "w1d2") }))).toContain("feelings");
    expect(ids(homeSections(pack!, { beacons: 0, completed: done("w1d1", "w1d2") }))).toContain("moments");
    expect(ids(homeSections(pack!, { beacons: 0, completed: done("w1d1", "w1d2", "w1d3") }))).toContain("places");
  });
  it("opens the pond with the first beacon and never for money", () => {
    expect(ids(homeSections(pack!, { beacons: 0, completed: done("w1d1", "w1d2", "w1d3") }))).not.toContain("pond");
    expect(ids(homeSections(pack!, { beacons: 1, completed: {} }))).toContain("pond");
  });
  it("shows everything when a pack has no home plan", () => {
    const bare = { ...pack!, companion: { ...pack!.companion, home: undefined } };
    expect(homeSections(bare, { beacons: 0, completed: {} })).toHaveLength(10);
  });
});

describe("what Capy announces", () => {
  it("says nothing on the very first visit, then one door per visit", () => {
    const s = { beacons: 0, completed: done("w1d1") };
    expect(pendingReveal(pack!, s, {})).toBeUndefined();
    expect(ids(freshSections(pack!, s, {}))).toEqual(["today", "bedtime", "journey", "stories", "games"]);
    const seen = { today: true, bedtime: true } as const;
    expect(pendingReveal(pack!, s, seen)?.id).toBe("journey");
    expect(pendingReveal(pack!, s, { ...seen, journey: true })?.id).toBe("stories");
    expect(pendingReveal(pack!, s, { ...seen, journey: true, stories: true })?.id).toBe("games");
    expect(pendingReveal(pack!, s, { ...seen, journey: true, stories: true, games: true })).toBeUndefined();
  });
  it("skips a fresh section that has no line to say", () => {
    const s = { beacons: 0, completed: done("w1d1", "w1d2") };
    const seen = { today: true, bedtime: true, journey: true, stories: true, games: true, feelings: true } as const;
    expect(ids(freshSections(pack!, s, seen))).toEqual(["moments"]);
    expect(pendingReveal(pack!, s, seen)).toBeUndefined();
  });
});
