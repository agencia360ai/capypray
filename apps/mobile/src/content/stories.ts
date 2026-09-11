import type { Pack } from "@capy/content";
export function availableStoryIds(pack: Pack, completed: Record<string, unknown>) {
  const available = new Set(pack.stories.filter(story => story.free).map(story => story.id));
  for (const lesson of pack.lessons) {
    if (!completed[lesson.id]) continue;
    for (const beat of lesson.beats) if (beat.type === "story") available.add(beat.storyId);
  }
  return available;
}
