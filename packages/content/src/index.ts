import { Pack, type Pack as PackT, type Lesson, type Minigame } from "./schema";

export * from "./schema";

export type ValidationIssue = { path: string; message: string };

/** Structural (Zod) + referential validation. Returns [] when the pack is valid. */
export function validatePack(raw: unknown): { pack?: PackT; issues: ValidationIssue[] } {
  const parsed = Pack.safeParse(raw);
  if (!parsed.success) {
    return { issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  }
  const pack = parsed.data;
  const issues: ValidationIssue[] = [];
  const skills = new Set(pack.skills.map((s) => s.id));
  const prayers = new Set(pack.prayers.map((p) => p.id));
  const minigames = new Map(pack.minigames.map((m) => [m.id, m] as const));
  const lessons = new Map(pack.lessons.map((l) => [l.id, l] as const));
  const weeks = new Set(pack.worlds.flatMap((w) => w.weeks));

  const dup = (arr: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of arr) {
      if (seen.has(id)) issues.push({ path: what, message: `duplicate id "${id}"` });
      seen.add(id);
    }
  };
  dup(pack.lessons.map((l) => l.id), "lessons");
  dup(pack.prayers.map((p) => p.id), "prayers");
  dup(pack.minigames.map((m) => m.id), "minigames");
  dup(pack.rewards.map((r) => r.id), "rewards");
  dup(pack.stories.map((st) => st.id), "stories");
  dup(pack.scenes.map((sc) => sc.id), "scenes");
  const stories = new Set(pack.stories.map((st) => st.id));
  const scenes = new Set(pack.scenes.map((sc) => sc.id));
  for (const st of pack.stories) for (const [i, pg] of st.pages.entries()) if (countWords(pg.text) > 22) issues.push({ path: `stories.${st.id}.pages.${i}`, message: "story page > 22 words; split the page" });
  for (const sc of pack.scenes) {
    if (sc.prayerId && !prayers.has(sc.prayerId)) issues.push({ path: `scenes.${sc.id}.prayerId`, message: `unknown prayer "${sc.prayerId}"` });
    if (sc.unlock.lessonId && !lessons.has(sc.unlock.lessonId)) issues.push({ path: `scenes.${sc.id}.unlock`, message: `unknown lesson "${sc.unlock.lessonId}"` });
  }

  for (const p of pack.prayers) {
    if (!skills.has(p.skillId)) issues.push({ path: `prayers.${p.id}.skillId`, message: `unknown skill "${p.skillId}"` });
    for (const [i, line] of p.lines.entries()) {
      if (countWords(line.text) > 14) issues.push({ path: `prayers.${p.id}.lines.${i}`, message: "line longer than 14 words (GDD §6.6 says ≤12)" });
    }
  }

  const usedMinigames = new Set<string>();
  const usedPrayers = new Set<string>();
  for (const l of pack.lessons) {
    const at = `lessons.${l.id}`;
    if (!skills.has(l.skillId)) issues.push({ path: `${at}.skillId`, message: `unknown skill "${l.skillId}"` });
    if (l.routine === "any") {
      if (!l.week || !l.day) issues.push({ path: at, message: "curriculum lesson needs week and day" });
      else if (!weeks.has(l.week)) issues.push({ path: `${at}.week`, message: `week "${l.week}" is not in any world` });
    }
    for (const [i, b] of l.beats.entries()) {
      const bat = `${at}.beats.${i}`;
      if (b.type === "avatar_say" && countWords(b.text) > 20) issues.push({ path: bat, message: "avatar_say text > 20 words; split the beat" });
      if (b.type === "repeat_after_me") {
        if (!prayers.has(b.prayerId)) issues.push({ path: bat, message: `unknown prayer "${b.prayerId}"` });
        usedPrayers.add(b.prayerId);
      }
      if (b.type === "minigame") {
        if (!minigames.has(b.minigameId)) issues.push({ path: bat, message: `unknown minigame "${b.minigameId}"` });
        usedMinigames.add(b.minigameId);
      }
      if (b.type === "story" && !stories.has(b.storyId)) issues.push({ path: bat, message: `unknown story "${b.storyId}"` });
    }
    if (l.scene && !scenes.has(l.scene)) issues.push({ path: `${at}.scene`, message: `unknown scene "${l.scene}"` });
    if (!l.beats.some((b) => b.type === "reward")) issues.push({ path: at, message: "lesson has no reward beat" });
  }
  for (const id of minigames.keys()) if (!usedMinigames.has(id)) issues.push({ path: `minigames.${id}`, message: "minigame not referenced by any lesson" });
  for (const m of pack.minigames) issues.push(...validateMinigame(m));

  if (!prayers.has(pack.routines.bedtime.closingPrayerId)) issues.push({ path: "routines.bedtime.closingPrayerId", message: "unknown prayer" });
  const bedtimeLesson = pack.routines.bedtime.lessonId ? lessons.get(pack.routines.bedtime.lessonId) : undefined;
  if (pack.routines.bedtime.lessonId && !bedtimeLesson) issues.push({ path: "routines.bedtime.lessonId", message: "unknown lesson" });
  if (bedtimeLesson && bedtimeLesson.routine !== "bedtime") issues.push({ path: "routines.bedtime.lessonId", message: "lesson must have routine: bedtime" });
  if (pack.routines.intro) {
    const intro = lessons.get(pack.routines.intro.lessonId);
    if (!intro) issues.push({ path: "routines.intro.lessonId", message: "unknown lesson" });
    else if (intro.routine !== "intro") issues.push({ path: "routines.intro.lessonId", message: "lesson must have routine: intro" });
  }
  const slots = new Set<string>();
  for (const l of pack.lessons) {
    if (l.routine !== "any") continue;
    const slot = `${l.week}d${l.day}`;
    if (slots.has(slot)) issues.push({ path: `lessons.${l.id}`, message: `duplicate slot ${slot}` });
    slots.add(slot);
  }
  if (!prayers.has(pack.routines.meal.prayerId)) issues.push({ path: "routines.meal.prayerId", message: "unknown prayer" });
  for (const r of pack.rewards) if (r.unlock.lessonId && !lessons.has(r.unlock.lessonId)) issues.push({ path: `rewards.${r.id}`, message: `unknown lesson "${r.unlock.lessonId}"` });
  for (const c of pack.calendar) for (const id of c.lessonIds) if (!lessons.has(id)) issues.push({ path: `calendar.${c.id}`, message: `unknown lesson "${id}"` });

  return { pack, issues };
}

function validateMinigame(m: Minigame): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const at = `minigames.${m.id}`;
  switch (m.type) {
    case "tap_choice": {
      const correct = m.cards.filter((c) => c.correct).length;
      if (correct !== 1) issues.push({ path: at, message: `tap_choice needs exactly 1 correct card (has ${correct})` });
      break;
    }
    case "sequence": {
      const ids = new Set(m.cards.map((c) => c.id));
      if (m.order.length !== m.cards.length || !m.order.every((id) => ids.has(id))) issues.push({ path: at, message: "sequence.order must list every card id once" });
      break;
    }
    case "fill_blank":
      if (!m.options.includes(m.answer)) issues.push({ path: at, message: "fill_blank.answer must be one of options" });
      if (!m.sentence.includes("___")) issues.push({ path: at, message: 'fill_blank.sentence must contain "___"' });
      break;
    case "collect":
      if (m.target > m.items.length) issues.push({ path: at, message: "collect.target > items" });
      break;
    case "people_picker":
      if (m.min > m.max) issues.push({ path: at, message: "people_picker.min > max" });
      break;
    case "listen_timer":
      break;
  }
  return issues;
}

/** Every audio path a pack references (for the TTS batch + pre-download). */
export function listAudio(pack: PackT): string[] {
  const out = new Set<string>();
  const add = (a?: string) => a && out.add(a);
  for (const l of pack.lessons) for (const b of l.beats) if ("audio" in b) add(b.audio);
  for (const p of pack.prayers) for (const line of p.lines) add(line.audio);
  for (const t of pack.ui.tapLines) add(t.audio);
  for (const st of pack.stories) {
    for (const pg of st.pages) add(pg.audio);
    add(st.moralAudio);
  }
  for (const m of pack.minigames) {
    add(m.prompt.audio);
    if ("successLine" in m) add(m.successLine.audio);
    if ("retryLine" in m) add(m.retryLine.audio);
    if ("closingLine" in m) add(m.closingLine.audio);
  }
  return [...out].sort();
}

export function getLesson(pack: PackT, id: string): Lesson | undefined {
  return pack.lessons.find((l) => l.id === id);
}

/** Replace {kidName} etc. Unknown variables are left untouched so the validator can catch them. */
export function interpolate(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
