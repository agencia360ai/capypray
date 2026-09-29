import { describe, expect, it, vi } from "vitest";
import { validatePack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";
vi.mock("@/store/kid", () => ({ useKid: () => false }));
import { isLessonLocked, isSectionLocked } from "./index";

const { pack } = validatePack(rawPack);

describe("free prayers, premium everything else", () => {
  it("locks play, stories, places and the pond without the entitlement", () => {
    for (const id of ["games", "stories", "places", "pond"] as const) {
      expect(isSectionLocked(pack!, id, false)).toBe(true);
      expect(isSectionLocked(pack!, id, true)).toBe(false);
    }
  });
  it("keeps every prayer door open for free", () => {
    for (const id of ["today", "bedtime", "feelings", "moments", "journey", "memories"] as const) expect(isSectionLocked(pack!, id, false)).toBe(false);
    const free = pack!.lessons.filter((l) => !isLessonLocked(l, false));
    expect(new Set(free.map((l) => l.routine))).toEqual(new Set(["intro", "any", "bedtime", "moment"]));
    expect(free.filter((l) => l.routine === "any").map((l) => l.id)).toEqual(["w1d1"]);
  });
  it("locks nothing when a pack has no home plan", () => {
    expect(isSectionLocked({ ...pack!, companion: { ...pack!.companion, home: undefined } }, "games", false)).toBe(false);
  });
});
