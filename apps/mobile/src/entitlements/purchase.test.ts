import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ hydrated: true, setPremium: vi.fn(), configure: vi.fn(), getOfferings: vi.fn(), purchasePackage: vi.fn(), restorePurchases: vi.fn(), getCustomerInfo: vi.fn(), addCustomerInfoUpdateListener: vi.fn() }));
vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-constants", () => ({ default: { appOwnership: null } }));
vi.mock("react-native-purchases", () => ({ default: mocks }));
vi.mock("@/store/kid", () => ({ useKid: { getState: () => ({ setPremium: mocks.setPremium, premium: false }), persist: { hasHydrated: () => mocks.hydrated } } }));
const info = (active: boolean) => ({ entitlements: { active: active ? { premium: {} } : {} } });
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.stubGlobal("__DEV__", false); mocks.hydrated = true;
  vi.stubEnv("EXPO_PUBLIC_RC_IOS_KEY", "appl_unit_test");
});
async function adapter(open = true) {
  const parent = await import("@/parent/gate"); open ? parent.gate.open() : parent.gate.close();
  return import("./purchase");
}
describe("store entitlement boundary", () => {
  it("rejects direct purchases without the parent gate", async () => { const p = await adapter(false); await expect(p.startTrial("annual")).rejects.toThrow("Parent gate"); expect(mocks.purchasePackage).not.toHaveBeenCalled(); });
  it("never enables premium if a key is missing", async () => { vi.stubEnv("EXPO_PUBLIC_RC_IOS_KEY", ""); const p = await adapter(); await expect(p.startTrial("annual")).rejects.toThrow(); expect(mocks.setPremium).not.toHaveBeenCalledWith(true); });
  it("uses the configured offering and verified entitlement", async () => { const annual = { identifier: "$rc_annual" }; mocks.getOfferings.mockResolvedValue({ all: { default: { annual } } }); mocks.purchasePackage.mockResolvedValue({ customerInfo: info(true) }); const p = await adapter(); expect(await p.startTrial("annual")).toBe(true); expect(mocks.purchasePackage).toHaveBeenCalledWith(annual); });
  it("cancellation keeps the offer open and grants nothing", async () => { mocks.getOfferings.mockResolvedValue({ all: { default: { annual: {} } } }); mocks.purchasePackage.mockRejectedValue({ userCancelled: true }); const p = await adapter(); expect(await p.startTrial("annual")).toBe(false); expect(mocks.setPremium).not.toHaveBeenCalledWith(true); });
  it("restoring an expired subscription removes access", async () => { mocks.restorePurchases.mockResolvedValue(info(false)); const p = await adapter(); expect(await p.restorePurchases()).toBe(false); expect(mocks.setPremium).toHaveBeenCalledWith(false); });
});

describe("app launch", () => {
  it("configures RevenueCat once, without device identifiers or the parent gate", async () => {
    mocks.getCustomerInfo.mockResolvedValue(info(false));
    const p = await adapter(false); p.configurePurchases(); p.configurePurchases(); await p.refreshPurchases();
    expect(mocks.configure).toHaveBeenCalledTimes(1);
    expect(mocks.configure).toHaveBeenCalledWith({ apiKey: "appl_unit_test", automaticDeviceIdentifierCollectionEnabled: false });
    expect(mocks.addCustomerInfoUpdateListener).toHaveBeenCalledTimes(1);
  });
  it("grants Premium bought outside the paywall, such as a Play Store promo code", async () => { mocks.getCustomerInfo.mockResolvedValue(info(true)); const p = await adapter(false); p.configurePurchases(); await p.refreshPurchases(); expect(mocks.setPremium).toHaveBeenCalledWith(true); });
  it("revokes expired access and keeps Premium off without an answer", async () => {
    const p = await adapter(false);
    mocks.getCustomerInfo.mockResolvedValue(info(false)); await p.refreshPurchases(); expect(mocks.setPremium).toHaveBeenLastCalledWith(false);
    mocks.getCustomerInfo.mockRejectedValue(new Error("offline")); mocks.setPremium.mockClear(); await p.refreshPurchases(); expect(mocks.setPremium).toHaveBeenCalledWith(false);
  });
  it("never writes access before saved progress loads", async () => {
    mocks.hydrated = false; mocks.getCustomerInfo.mockResolvedValue(info(true));
    const p = await adapter(false); p.configurePurchases(); await p.refreshPurchases();
    const listener = mocks.addCustomerInfoUpdateListener.mock.calls[0]![0] as (i: ReturnType<typeof info>) => void; listener(info(true));
    expect(mocks.setPremium).not.toHaveBeenCalled();
  });
  it("starts without RevenueCat when the build has no store key", async () => {
    vi.stubEnv("EXPO_PUBLIC_RC_IOS_KEY", ""); const p = await adapter(false);
    expect(() => p.configurePurchases()).not.toThrow(); await p.refreshPurchases();
    expect(mocks.configure).not.toHaveBeenCalled(); expect(mocks.setPremium).toHaveBeenCalledWith(false);
  });
});

describe("parent subscription status", () => {
  it("reads a new profile as free from the store", async () => { mocks.getCustomerInfo.mockResolvedValue(info(false)); const p = await adapter(); expect(await p.subscriptionStatus()).toBe("free"); });
  it("shows verified premium and never guesses on a service error", async () => {
    const p = await adapter();
    mocks.getCustomerInfo.mockResolvedValue(info(true)); expect(await p.subscriptionStatus()).toBe("premium");
    mocks.getCustomerInfo.mockRejectedValue(new Error("offline")); await expect(p.subscriptionStatus()).rejects.toThrow("offline");
  });
  it("requires the parent gate for status and restore", async () => {
    const p = await adapter(false); await expect(p.subscriptionStatus()).rejects.toThrow("Parent gate"); await expect(p.restorePurchases()).rejects.toThrow("Parent gate");
  });
});
