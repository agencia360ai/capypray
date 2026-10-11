import { Platform } from "react-native";
import Constants from "expo-constants";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useKid } from "@/store/kid";
import { gate } from "@/parent/gate";

export const PURCHASES_SANDBOX = __DEV__ && (Platform.OS === "web" || Constants.appOwnership === "expo");
export type Plan = "annual" | "monthly";
export type StorePlans = Partial<Record<Plan, PurchasesPackage>>;
/** Intended intro offers, mirrored in the store config (see release/setup-and-submission.md): the sandbox preview
 * and its copy use these; native builds show the store's own terms via `freeDays`. */
export const TRIAL_DAYS: Record<Plan, number> = { monthly: 3, annual: 7 };
const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
/** Length in days of a package's free trial as the store reports it, or null when there is none. */
export function freeDays(pkg: PurchasesPackage | undefined): number | null {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const days = intro.periodNumberOfUnits * (UNIT_DAYS[intro.periodUnit] ?? 0) * Math.max(1, intro.cycles);
  return days > 0 ? days : null;
}
let initializing: Promise<typeof import("react-native-purchases").default> | undefined;

function apply(info: CustomerInfo) {
  const active = !!info.entitlements.active.premium;
  // The SDK starts before saved progress loads, and a store write then would replace that progress on disk.
  // app/_layout.tsx re-reads access right after hydration.
  if (useKid.persist.hasHydrated()) useKid.getState().setPremium(active);
  return active;
}
/** Configures RevenueCat once; later calls reuse it. Anonymous app user ID and no device identifiers (Kids Category). */
function sdk() {
  if (!initializing) initializing = (async () => {
    const apiKey = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
    if (Platform.OS === "web" || Constants.appOwnership === "expo" || !apiKey || apiKey.startsWith("test_")) throw new Error("Store purchases unavailable");
    const Purchases = (await import("react-native-purchases")).default;
    Purchases.configure({ apiKey, automaticDeviceIdentifierCollectionEnabled: false });
    Purchases.addCustomerInfoUpdateListener(apply);
    return Purchases;
  })().catch(error => { initializing = undefined; throw error; });
  return initializing;
}
/**
 * Called once when the app starts (app/_layout.tsx), as RevenueCat recommends: the SDK can then finish purchases that
 * complete outside the paywall (pending payments, Play Store promo codes; Play refunds unacknowledged ones after three
 * days) and keep Premium current. Web and Expo Go have no store; the paywall reports that when opened.
 */
export function configurePurchases() {
  if (PURCHASES_SANDBOX) return;
  sdk().catch(() => {});
}
function requireParent() {
  if (!gate.isOpen()) throw new Error("Parent gate required");
}
export async function loadPlans(): Promise<StorePlans> {
  requireParent();
  if (PURCHASES_SANDBOX) return {};
  const offering = (await (await sdk()).getOfferings()).all.default;
  if (!offering) throw new Error("Default offering is not configured");
  return { annual: offering.annual ?? undefined, monthly: offering.monthly ?? undefined };
}
/** Store sheets determine eligibility and show applicable introductory offers. */
export async function startTrial(plan: Plan): Promise<boolean> {
  requireParent();
  if (PURCHASES_SANDBOX) { useKid.getState().setPremium(true); return true; }
  const selected = (await loadPlans())[plan];
  if (!selected) throw new Error("Plan unavailable");
  try {
    const result = await (await sdk()).purchasePackage(selected);
    if (!apply(result.customerInfo)) throw new Error("Purchase has no premium entitlement");
    return true;
  } catch (error) {
    if ((error as { userCancelled?: boolean }).userCancelled) return false;
    throw error;
  }
}
export async function restorePurchases(): Promise<boolean> {
  requireParent();
  if (PURCHASES_SANDBOX) return useKid.getState().premium;
  return apply(await (await sdk()).restorePurchases());
}
/** Re-reads verified access after launch and on foreground. No answer from the store means no Premium. */
export async function refreshPurchases() {
  if (PURCHASES_SANDBOX) return;
  try { apply(await (await sdk()).getCustomerInfo()); }
  catch { useKid.getState().setPremium(false); }
}
export async function subscriptionManagementURL(): Promise<string | null> {
  requireParent();
  if (PURCHASES_SANDBOX) return null;
  return (await (await sdk()).getCustomerInfo()).managementURL;
}

/** Read verified store access without treating a network failure as a free plan. */
export async function subscriptionStatus(): Promise<"premium" | "free" | "preview"> {
  requireParent();
  if (PURCHASES_SANDBOX) return "preview";
  return apply(await (await sdk()).getCustomerInfo()) ? "premium" : "free";
}
