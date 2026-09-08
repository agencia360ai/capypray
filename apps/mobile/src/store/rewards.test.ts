import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { biomeFor, newlyUnlocked, unlockedRewards } from "./rewards";

const { pack } = validatePack(rawPack);

describe("unlockedRewards", () => {
  it("nothing at start", () => {
    expect(unlockedRewards(pack!, { beacons: 0, completed: {} }).size).toBe(0);
  });
  it("first beacon unlocks the flower skin", () => {
    expect(unlockedRewards(pack!, { beacons: 1, completed: {} })).toEqual(new Set(["hat-flower"]));
  });
  it("lesson unlocks pond decoration", () => {
    expect(unlockedRewards(pack!, { beacons: 0, completed: { w1d3: {} } })).toEqual(new Set(["lily-pad"]));
  });
});

describe("biomes and beacon reveals", () => {
  it("meadow until the river opens at 4 beacons, mountain lake at 8", () => {
    expect(biomeFor(pack!, { beacons: 0, completed: {} })).toBe("meadow");
    expect(biomeFor(pack!, { beacons: 4, completed: {} })).toBe("river");
    expect(biomeFor(pack!, { beacons: 8, completed: {} })).toBe("mountain");
  });
  it("kid's pick wins while unlocked, home pick always wins", () => {
    expect(biomeFor(pack!, { beacons: 8, completed: {}, biomeId: "biome-river" })).toBe("river");
    expect(biomeFor(pack!, { beacons: 2, completed: {}, biomeId: "biome-river" })).toBe("meadow");
    expect(biomeFor(pack!, { beacons: 8, completed: {}, biomeId: "meadow" })).toBe("meadow");
  });
  it("newlyUnlocked lists only what the last lesson opened", () => {
    const before = { beacons: 3, completed: { w1d1: {} } };
    const after = { beacons: 4, completed: { w1d1: {}, w1d3: {} } };
    expect(newlyUnlocked(pack!, before, after).sort()).toEqual(["badge-pond-keeper", "biome-river", "lily-pad"]);
    expect(newlyUnlocked(pack!, after, after)).toEqual([]);
  });
});
