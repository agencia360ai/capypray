import type { Lesson } from "@capy/content";
import { useKid } from "@/store/kid";

// GDD §10.3 gating: entitlement `premium` (RevenueCat) → mirrored in Supabase via webhook → useEntitlement() here.
// The store flag is the single source the UI reads. The RevenueCat adapter (dev builds only, not Expo Go)
// updates that flag from `customerInfo.entitlements.active.premium`; see ./revenuecat.md.

export function useEntitlement(): { premium: boolean } {
  return { premium: useKid((s) => s.premium) };
}

export function isLessonLocked(lesson: Lesson, premium: boolean): boolean {
  return !lesson.free && !premium;
}
