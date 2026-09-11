import { describe, expect, it } from "vitest";
import { formatCopy, formatHour, getCopy } from "./index";
describe("localization boundary", () => {
  it("falls back to English for unsupported locales without claiming a translated pack", () => {
    expect(getCopy("es-PA")).toEqual(getCopy("en-US"));
  });
  it("allows a translator to reorder variables", () => {
    expect(formatCopy("{total} steps; you’re on {current}", { current: 2, total: 4 })).toBe("4 steps; you’re on 2");
  });
  it("formats the selected hour using the pack locale", () => {
    expect(formatHour(19, "en-US")).toMatch(/7:00\s?PM/);
    expect(formatHour(19, "es-ES")).toBe("19:00");
  });
});
