import type { Lesson, Pack } from "@capy/content";
import { useKid } from "@/store/kid";
import type { HomeSectionId } from "@/store/home";

// GDD §10.3 gating: entitlement `premium` (RevenueCat) → mirrored in Supabase via webhook → useEntitlement() here.
// The store flag is the single source the UI reads. The RevenueCat adapter (dev builds only, not Expo Go)
// updates that flag from `customerInfo.entitlements.active.premium`; see ./revenuecat.md.

export function useEntitlement(): { premium: boolean } {
  return { premium: useKid((s) => s.premium) };
}

export function isLessonLocked(lesson: Lesson, premium: boolean): boolean {
  return !lesson.free && !premium;
}

/** A home door the pack marks `premium` (play, stories, places, pond): it still appears with progress, but only opens with the entitlement. */
export function isSectionLocked(pack: Pack, id: HomeSectionId, premium: boolean): boolean {
  return !premium && !!pack.companion.home?.some((s) => s.id === id && s.premium);
}

export const UNLOCK_HREF = { pathname: "/parent/gate", params: { next: "paywall" } } as const;
