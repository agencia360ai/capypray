import type { Pack } from "@capy/content";

/** Rewards unlocked purely by progress (GDD §9: never by money). */
export function unlockedRewards(pack: Pack, s: { beacons: number; completed: Record<string, unknown> }): Set<string> {
  const out = new Set<string>();
  for (const r of pack.rewards) {
    const byBeacons = r.unlock.beacons !== undefined && s.beacons >= r.unlock.beacons;
    const byLesson = r.unlock.lessonId !== undefined && r.unlock.lessonId in s.completed;
    if (byBeacons || byLesson) out.add(r.id);
  }
  return out;
}
