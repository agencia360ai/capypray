import type { Pack } from "@capy/content";

// The home opens up one door at a time (pack.companion.home). Derived from progress every time, never stored:
// the only thing the app remembers is which doors Capy already announced, and that is cosmetic.

type Progress = { beacons: number; completed: Record<string, unknown> };
export type HomeSection = NonNullable<Pack["companion"]["home"]>[number];
export type HomeSectionId = HomeSection["id"];

const EVERYTHING: HomeSectionId[] = ["today", "bedtime", "journey", "stories", "feelings", "moments", "places", "pond", "memories"];

/** Same rule as rewards (GDD §9): no condition, or any condition met. Progress only — money never opens a door. */
const isOpen = (unlock: HomeSection["unlock"], s: Progress) =>
  (unlock.lessonId === undefined && unlock.beacons === undefined) ||
  (unlock.lessonId !== undefined && unlock.lessonId in s.completed) ||
  (unlock.beacons !== undefined && s.beacons >= unlock.beacons);

/** The sections the child can see right now, in pack order. A pack without `home` shows everything, as before. */
export function homeSections(pack: Pack, s: Progress): HomeSection[] {
  const home = pack.companion.home ?? EVERYTHING.map((id) => ({ id, unlock: {} }));
  return home.filter((sct) => isOpen(sct.unlock, s));
}

/** Open sections the child has not been shown yet. */
export function freshSections(pack: Pack, s: Progress, revealed: Record<string, true>): HomeSection[] {
  return homeSections(pack, s).filter((sct) => !revealed[sct.id]);
}

/**
 * What Capy says on this visit: the first fresh section that has a line, one per visit so two doors opening on the
 * same day never turn into a speech. Nothing on the very first visit — there is nothing to announce when the child
 * has not yet seen the home, and a family upgrading mid-curriculum should not hear every door at once either.
 */
export function pendingReveal(pack: Pack, s: Progress, revealed: Record<string, true>): HomeSection | undefined {
  if (!Object.keys(revealed).length) return undefined;
  return freshSections(pack, s, revealed).find((sct) => sct.reveal);
}
