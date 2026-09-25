import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ setPremium: vi.fn(), configure: vi.fn(), getOfferings: vi.fn(), purchasePackage: vi.fn(), restorePurchases: vi.fn(), getCustomerInfo: vi.fn(), addCustomerInfoUpdateListener: vi.fn() }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-constants", () => ({ default: { appOwnership: null } }));
vi.mock("react-native-purchases", () => ({ default: mocks }));
vi.mock("@/store/kid", () => ({ useKid: { getState: () => ({ setPremium: mocks.setPremium, premium: false }) } }));
import storage from "@/store/persistence";
const info = (active: boolean) => ({ entitlements: { active: active ? { premium: {} } : {} } });
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); vi.stubGlobal("__DEV__", false);
  vi.stubEnv("EXPO_PUBLIC_RC_IOS_KEY", "appl_unit_test");
  await storage.removeItem("parent-purchases-activated");
});
async function adapter(open = true) {
  const parent = await import("@/parent/gate"); open ? parent.gate.open() : parent.gate.close();
  return import("./purchase");
}
describe("store entitlement boundary", () => {
  it("rejects direct purchases without the parent gate", async () => { const p = await adapter(false); await expect(p.startTrial("annual")).rejects.toThrow("Parent gate"); expect(mocks.configure).not.toHaveBeenCalled(); });
  it("never enables premium if a key is missing", async () => { vi.stubEnv("EXPO_PUBLIC_RC_IOS_KEY", ""); const p = await adapter(); await expect(p.startTrial("annual")).rejects.toThrow(); expect(mocks.setPremium).not.toHaveBeenCalledWith(true); });
  it("uses the configured offering and verified entitlement", async () => { const annual = { identifier: "$rc_annual" }; mocks.getOfferings.mockResolvedValue({ all: { default: { annual } } }); mocks.purchasePackage.mockResolvedValue({ customerInfo: info(true) }); const p = await adapter(); expect(await p.startTrial("annual")).toBe(true); expect(mocks.purchasePackage).toHaveBeenCalledWith(annual); expect(mocks.configure).toHaveBeenCalledWith({ apiKey: "appl_unit_test", automaticDeviceIdentifierCollectionEnabled: false }); });
  it("cancellation keeps the offer open and grants nothing", async () => { mocks.getOfferings.mockResolvedValue({ all: { default: { annual: {} } } }); mocks.purchasePackage.mockRejectedValue({ userCancelled: true }); const p = await adapter(); expect(await p.startTrial("annual")).toBe(false); expect(mocks.setPremium).not.toHaveBeenCalledWith(true); });
  it("restoring an expired subscription removes access", async () => { mocks.restorePurchases.mockResolvedValue(info(false)); const p = await adapter(); expect(await p.restorePurchases()).toBe(false); expect(mocks.setPremium).toHaveBeenCalledWith(false); });
  it("does not start the SDK on a new child launch", async () => { const p = await adapter(false); await p.refreshPurchases(); expect(mocks.configure).not.toHaveBeenCalled(); expect(mocks.setPremium).toHaveBeenCalledWith(false); });
  it("refreshes prior parent purchases and revokes expired access", async () => { await (await import("@/store/persistence")).default.setItem("parent-purchases-activated", "1"); mocks.getCustomerInfo.mockResolvedValue(info(false)); const p = await adapter(false); await p.refreshPurchases(); expect(mocks.getCustomerInfo).toHaveBeenCalled(); expect(mocks.setPremium).toHaveBeenCalledWith(false); });
});
