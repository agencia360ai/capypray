import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesPackage } from "react-native-purchases";
import { useKid } from "@/store/kid";
import { track } from "@/backend/events";
import { setUserProps } from "@/analytics/ga4";

// The purchase seam (GDD §10.3), reached only behind the parental gate. RevenueCat in dev/production builds; in Expo Go,
// on web, or without keys it falls back to the sandbox that flips the same store flag. Kids Category (GDD §11): RevenueCat's
// own anonymous app user id, no collectDeviceIdentifiers(), no attributes, no ad-network integrations.

const ENTITLEMENT = "premium";
const API_KEY = Platform.select({ ios: process.env.EXPO_PUBLIC_RC_IOS_KEY, android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY });
const expoGo = !!(globalThis as { expo?: { modules?: { ExpoGo?: unknown } } }).expo?.modules?.ExpoGo;

export const PURCHASES_SANDBOX = !API_KEY || expoGo || Platform.OS === "web";

export type Plan = "annual" | "monthly";
export type PlanPrice = { price: string; perMonth?: string };

export class PurchaseCancelled extends Error {}

let configured = false;
let packages: Partial<Record<Plan, PurchasesPackage>> = {};

const apply = (info: CustomerInfo) => {
  const premium = !!info.entitlements.active[ENTITLEMENT];
  useKid.getState().setPremium(premium);
  setUserProps({ premium });
  return premium;
};

export async function initPurchases() {
  if (PURCHASES_SANDBOX || configured) return;
  configured = true;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: API_KEY! });
    Purchases.addCustomerInfoUpdateListener(apply);
    apply(await Purchases.getCustomerInfo());
  } catch {
    configured = false;
  }
}

/** Store prices, localized by Apple/Google. Null in the sandbox or when offerings can't load (paywall keeps its copy). */
export async function loadPrices(): Promise<Partial<Record<Plan, PlanPrice>> | null> {
  if (PURCHASES_SANDBOX) return null;
  await initPurchases();
  try {
    const current = (await Purchases.getOfferings()).current;
    if (!current) return null;
    packages = { annual: current.annual ?? undefined, monthly: current.monthly ?? undefined };
    const out: Partial<Record<Plan, PlanPrice>> = {};
    if (packages.annual) out.annual = { price: packages.annual.product.priceString, perMonth: packages.annual.product.pricePerMonthString ?? undefined };
    if (packages.monthly) out.monthly = { price: packages.monthly.product.priceString };
    return out;
  } catch {
    return null;
  }
}

/** Start the 7-day trial on the chosen plan (the intro offer lives in App Store Connect / Play Console). */
export async function startTrial(plan: Plan): Promise<void> {
  if (PURCHASES_SANDBOX) {
    void track("trial_start", { plan, sandbox: true });
    useKid.getState().setPremium(true);
    return;
  }
  if (!packages[plan]) await loadPrices();
  const pkg = packages[plan];
  if (!pkg) throw new Error("offering not available");
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const premium = apply(customerInfo);
    void track("trial_start", { plan, premium, currency: pkg.product.currencyCode, price: pkg.product.price });
  } catch (e) {
    const err = e as { userCancelled?: boolean; code?: string };
    if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      void track("purchase_cancel", { plan });
      throw new PurchaseCancelled();
    }
    void track("purchase_error", { plan, code: String(err.code ?? "unknown") });
    throw e;
  }
}

/** Restore an earlier purchase (same Apple ID / Google account). */
export async function restorePurchases(): Promise<boolean> {
  if (PURCHASES_SANDBOX) {
    void track("restore_purchases", { sandbox: true });
    return useKid.getState().premium;
  }
  await initPurchases();
  const premium = apply(await Purchases.restorePurchases());
  void track("restore_purchases", { premium });
  return premium;
}
