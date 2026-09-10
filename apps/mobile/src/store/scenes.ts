import type { Pack, Scene } from "@capy/content";

type Progress = { beacons: number; completed: Record<string, unknown> };

export function sceneById(pack: Pack, id?: string): Scene | undefined {
  return pack.scenes.find((s) => s.id === id) ?? pack.scenes[0];
}

/** Scenes the kid can visit now (GDD: places open with progress, never with money). */
export function unlockedScenes(pack: Pack, s: Progress): Scene[] {
  return pack.scenes.filter((sc) => {
    if (sc.unlock.lessonId) return sc.unlock.lessonId in s.completed;
    if (sc.unlock.beacons !== undefined) return s.beacons >= sc.unlock.beacons;
    return true;
  });
}

/** Day/night for a scene: fixed by the scene, or by the clock around the family's bedtime. */
export function isNight(scene: Scene | undefined, bedtimeHour: number, now = new Date()): boolean {
  if (!scene || scene.time === "day") return false;
  if (scene.time === "night") return true;
  const h = now.getHours();
  return h >= bedtimeHour - 1 || h < 6;
}

/** Curriculum pacing: one new Prayer Moment per calendar day (GDD §4.2), unless the parent enabled free play. */
export function lessonDoneToday(completed: Record<string, { at: number }>, curriculumIds: Set<string>, today = new Date()): boolean {
  const d = today.toDateString();
  return Object.entries(completed).some(([id, c]) => curriculumIds.has(id) && new Date(c.at).toDateString() === d);
}
