import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@/store/persistence";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useKid } from "@/store/kid";
import { gate } from "@/parent/gate";

export const PURCHASES_SANDBOX = __DEV__ && (Platform.OS === "web" || Constants.appOwnership === "expo");
export type Plan = "annual" | "monthly";
export type StorePlans = Partial<Record<Plan, PurchasesPackage>>;
const ACTIVATED = "parent-purchases-activated";
let initializing: Promise<typeof import("react-native-purchases").default> | undefined;

function apply(info: CustomerInfo) {
  const active = !!info.entitlements.active.premium;
  useKid.getState().setPremium(active);
  return active;
}
function sdk() {
  if (!initializing) initializing = (async () => {
    const apiKey = Platform.OS === "ios" ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
    if (Platform.OS === "web" || Constants.appOwnership === "expo" || !apiKey || apiKey.startsWith("test_")) throw new Error("Store purchases unavailable");
    const Purchases = (await import("react-native-purchases")).default;
    Purchases.configure({ apiKey, automaticDeviceIdentifierCollectionEnabled: false });
    Purchases.addCustomerInfoUpdateListener(apply);
    await AsyncStorage.setItem(ACTIVATED, "1");
    return Purchases;
  })().catch(error => { initializing = undefined; throw error; });
  return initializing;
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
/** Only reconnect after a parent has previously opened purchases. */
export async function refreshPurchases() {
  if (PURCHASES_SANDBOX) return;
  try {
    if (await AsyncStorage.getItem(ACTIVATED) !== "1") { useKid.getState().setPremium(false); return; }
    apply(await (await sdk()).getCustomerInfo());
  }
  catch { useKid.getState().setPremium(false); }
}
export async function subscriptionManagementURL(): Promise<string | null> {
  requireParent();
  if (PURCHASES_SANDBOX) return null;
  return (await (await sdk()).getCustomerInfo()).managementURL;
}
