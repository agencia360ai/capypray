import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
import { unlockedRewards } from "./rewards";

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
