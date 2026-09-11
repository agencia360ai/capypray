import { describe, expect, it } from "vitest";
import { validatePack } from "@capy/content";
import raw from "@capy/content/packs/christian-us-en-v1/pack.json";
import { availableStoryIds } from "./stories";
const pack = validatePack(raw).pack!;
describe("story shelf", () => {
  it("has two stories to explore on day one", () => {
    expect([...availableStoryIds(pack, {})].sort()).toEqual(["jesus-children", "lost-sheep"]);
  });
  it("opens a story when its curriculum lesson is completed", () => {
    const lesson = pack.lessons.find(l => l.beats.some(b => b.type === "story" && b.storyId === "good-samaritan"))!;
    expect(availableStoryIds(pack, {}).has("good-samaritan")).toBe(false);
    expect(availableStoryIds(pack, { [lesson.id]: {} }).has("good-samaritan")).toBe(true);
  });
});
