import { beforeEach, expect, it } from "vitest";
import { useKid } from "./kid";
beforeEach(() => useKid.getState().reset());
it("saves each game-level win once without changing prayer progress", () => {
  const s = useKid.getState(); s.recordGameWin("sort", 1); s.recordGameWin("sort", 1); s.recordGameWin("memory", 1);
  expect(Object.keys(useKid.getState().gameWins)).toHaveLength(2);
  expect(useKid.getState().gameLevels.sort).toBe(2);
  expect(useKid.getState().lanterns).toBe(0);
  expect(useKid.getState().completed).toEqual({});
});
it("rejects invalid wins and clears badges with child data", () => {
  useKid.getState().recordGameWin("invalid", 1); useKid.getState().recordGameWin("sort", -1);
  expect(useKid.getState().gameWins).toEqual({});
  useKid.getState().recordGameWin("sort", 1); useKid.getState().reset();
  expect(useKid.getState().gameWins).toEqual({});
});
