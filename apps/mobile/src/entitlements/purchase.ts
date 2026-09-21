import { useKid } from "@/store/kid";
import { track } from "@/backend/events";

// The purchase seam. Expo Go has no native purchases module, so until the RevenueCat adapter lands with dev builds
// (./revenuecat.md) these flip the same store flag the entitlement mirror will: the rest of the app never knows
// which one it is talking to. Reached only behind the parental gate (GDD §11).

export type Plan = "annual" | "monthly";

/** Start the 7-day trial on the chosen plan. */
export async function startTrial(plan: Plan): Promise<void> {
  void track("trial_start", { plan, sandbox: true });
  useKid.getState().setPremium(true);
}

/** Restore an earlier purchase on a new device. Nothing to restore in the sandbox; the adapter fills this in. */
export async function restorePurchases(): Promise<boolean> {
  void track("restore_purchases", { sandbox: true });
  return useKid.getState().premium;
}
