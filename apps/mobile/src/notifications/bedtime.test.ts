import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pack } from "@capy/content";
const mocks = vi.hoisted(() => ({ requestPermissionsAsync: vi.fn(), scheduleNotificationAsync: vi.fn(), cancelScheduledNotificationAsync: vi.fn(), SchedulableTriggerInputTypes: { DAILY: "daily" } }));
vi.mock("expo-notifications", () => mocks);
const pack = { avatar: { id: "capy-default" }, routines: { bedtime: { defaultHour: 20, notificationText: "Time to pray" } } } as Pack;
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); mocks.requestPermissionsAsync.mockResolvedValue({ status: "granted" }); });
describe("bedtime reminder failures", () => {
  it("does not schedule when permission is denied", async () => {
    mocks.requestPermissionsAsync.mockResolvedValue({ status: "denied" });
    const m = await import("./bedtime"); expect(await m.scheduleBedtimeReminder(pack)).toBe(false); expect(mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
  it("reuses the reminder identifier without deleting the existing reminder first", async () => {
    const m = await import("./bedtime"); expect(await m.scheduleBedtimeReminder(pack, 21)).toBe(true);
    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ identifier: "bedtime", trigger: { type: "daily", hour: 21, minute: 0 } }));
    expect(mocks.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
  it("surfaces scheduling errors to keep settings from claiming success", async () => {
    mocks.scheduleNotificationAsync.mockRejectedValue(new Error("schedule failed"));
    const m = await import("./bedtime"); await expect(m.scheduleBedtimeReminder(pack)).rejects.toThrow("schedule failed");
  });
  it("surfaces cancellation errors instead of claiming a disabled reminder", async () => {
    mocks.cancelScheduledNotificationAsync.mockRejectedValue(new Error("cancel failed"));
    const m = await import("./bedtime"); await expect(m.cancelBedtimeReminder()).rejects.toThrow("cancel failed");
  });
});
