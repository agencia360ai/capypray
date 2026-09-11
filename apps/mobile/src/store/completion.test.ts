import { beforeEach, describe, expect, it } from "vitest";
import { useKid } from "./kid";
import { completionKey } from "./completion";

describe("replayable companion moments", () => {
  beforeEach(() => useKid.getState().reset());
  it("lets a moment earn one light per local day, not on every replay", () => {
    const moment = { id: "moment-worried", routine: "moment" as const };
    const key = completionKey(moment, new Date(2026, 8, 10, 23, 55));
    expect(key).toBe("moment-worried:2026-09-10");
    useKid.getState().completeLesson(key, 1);
    useKid.getState().completeLesson(key, 1);
    expect(useKid.getState().lanterns).toBe(1);
    const tomorrow = completionKey(moment, new Date(2026, 8, 11, 0, 5));
    useKid.getState().completeLesson(tomorrow, 1);
    expect(useKid.getState().lanterns).toBe(2);
  });
  it("keeps curriculum and introductory rewards permanent", () => {
    expect(completionKey({ id: "meet-capy", routine: "intro" })).toBe("meet-capy");
    expect(completionKey({ id: "w1d1", routine: "any" })).toBe("w1d1");
    useKid.getState().completeLesson("w1d1", 1);
    useKid.getState().completeLesson("w1d1", 1);
    expect(useKid.getState().lanterns).toBe(1);
  });
});
