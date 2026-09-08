import type { Pack } from "@capy/content";

type Progress = { beacons: number; completed: Record<string, unknown> };

/** Rewards unlocked purely by progress (GDD §9: never by money). */
export function unlockedRewards(pack: Pack, s: Progress): Set<string> {
  const out = new Set<string>();
  for (const r of pack.rewards) {
    const byBeacons = r.unlock.beacons !== undefined && s.beacons >= r.unlock.beacons;
    const byLesson = r.unlock.lessonId !== undefined && r.unlock.lessonId in s.completed;
    if (byBeacons || byLesson) out.add(r.id);
  }
  return out;
}

/** Reward ids that `after` has and `before` lacks — what to reveal on the beacon screen. */
export function newlyUnlocked(pack: Pack, before: Progress, after: Progress): string[] {
  const was = unlockedRewards(pack, before);
  return [...unlockedRewards(pack, after)].filter((id) => !was.has(id));
}

/** Stage background: the kid's pick if still unlocked, else the richest unlocked biome, else the pack default. */
export function biomeFor(pack: Pack, s: Progress & { biomeId?: string }): string {
  if (s.biomeId === pack.theme.pond) return pack.theme.pond; // explicit "home" pick
  const unlocked = unlockedRewards(pack, s);
  const biomes = pack.rewards.filter((r) => r.type === "biome" && r.biome && unlocked.has(r.id));
  const picked = biomes.find((r) => r.id === s.biomeId);
  if (picked?.biome) return picked.biome;
  const best = biomes.sort((a, b) => (b.unlock.beacons ?? 0) - (a.unlock.beacons ?? 0))[0];
  return best?.biome ?? pack.theme.pond;
}
