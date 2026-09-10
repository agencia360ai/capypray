import type { Beat, Lesson, Pack, Prayer, Story } from "@capy/content";
import { interpolate } from "@capy/content";

// Pure, testable lesson runner (GDD §4.1, §6.3). UI subscribes; avatar commands are emitted as effects.

export type Vars = { kidName: string; person?: string; thankfulFor?: string; mistake?: string; feeling?: string; need?: string; favorite?: string };
export type AskKey = Exclude<keyof Vars, "kidName">;

export type Step =
  | { kind: "say"; text: string; audio?: string; clip: string; mood?: string }
  | { kind: "repeat"; prayer: Prayer; lineIndex: number; text: string; audio?: string; clip: string }
  | { kind: "minigame"; minigameId: string }
  | { kind: "listen"; seconds: number; text: string; audio?: string; clip: string }
  | { kind: "story"; story: Story; pageIndex: number; text: string; icon: string; audio?: string; last: boolean }
  | { kind: "choose_people"; min: number; max: number; text: string; audio?: string }
  | { kind: "reward"; lanterns: number }
  | { kind: "ask"; key: AskKey; text: string; audio?: string; clip: string; options: { id: string; label: string; icon: string }[] }
  | { kind: "parent_prompt"; text: string }
  | { kind: "lights_out"; seconds: number; text: string; audio?: string }
  | { kind: "done" };

export type RunnerState = { beatIndex: number; lineIndex: number; step: Step; lanternsEarned: number; startedAt: number };

export type AvatarEffect =
  | { type: "play"; clip: string; loop?: boolean }
  | { type: "speak"; durationMs: number; clip?: string }
  | { type: "mood"; value: "calm" | "happy" | "sad" | "sleepy" }
  | { type: "idle" }
  | { type: "lights_out" };

export function createRunner(pack: Pack, lesson: Lesson, initialVars: Vars, now = () => Date.now()) {
  const vars: Vars = { ...initialVars };
  const prayers = new Map(pack.prayers.map((p) => [p.id, p]));
  const stories = new Map(pack.stories.map((st) => [st.id, st]));
  let state: RunnerState = { beatIndex: -1, lineIndex: 0, step: { kind: "done" }, lanternsEarned: 0, startedAt: now() };

  const buildStep = (beat: Beat, lineIndex: number): Step => {
    switch (beat.type) {
      case "avatar_say":
        return { kind: "say", text: interpolate(beat.text, vars), audio: beat.audio, clip: beat.clip, mood: beat.mood };
      case "repeat_after_me": {
        const prayer = prayers.get(beat.prayerId)!;
        const line = prayer.lines[lineIndex]!;
        return { kind: "repeat", prayer, lineIndex, text: interpolate(line.text, vars), audio: line.audio, clip: beat.clip };
      }
      case "minigame":
        return { kind: "minigame", minigameId: beat.minigameId };
      case "story": {
        const story = stories.get(beat.storyId)!;
        const last = lineIndex >= story.pages.length; // one extra "page" for the moral
        const page = story.pages[Math.min(lineIndex, story.pages.length - 1)]!;
        return { kind: "story", story, pageIndex: lineIndex, text: last ? story.moral : page.text, icon: last ? story.icon : page.icon, audio: last ? story.moralAudio : page.audio, last };
      }
      case "listen_timer":
        return { kind: "listen", seconds: beat.seconds, text: beat.text, audio: beat.audio, clip: beat.clip };
      case "choose_people":
        return { kind: "choose_people", min: beat.min, max: beat.max, text: beat.text, audio: beat.audio };
      case "reward":
        return { kind: "reward", lanterns: beat.lantern };
      case "ask":
        return { kind: "ask", key: beat.key, text: interpolate(beat.text, vars), audio: beat.audio, clip: beat.clip, options: beat.options };
      case "parent_prompt":
        return { kind: "parent_prompt", text: beat.text };
      case "lights_out":
        return { kind: "lights_out", seconds: beat.seconds, text: beat.text, audio: beat.audio };
    }
  };

  const effectsFor = (step: Step): AvatarEffect[] => {
    switch (step.kind) {
      case "say":
        return [...(step.mood ? [{ type: "mood", value: step.mood } as AvatarEffect] : []), { type: "speak", durationMs: estimateMs(step.text) * 2, clip: step.clip }];
      case "repeat":
        return [{ type: "speak", durationMs: estimateMs(step.text) * 2, clip: step.clip }];
      case "listen":
        return [{ type: "play", clip: step.clip, loop: true }];
      case "story":
        return [{ type: "speak", durationMs: estimateMs(step.text) * 2, clip: step.last ? "heart" : step.pageIndex % 2 ? "listen_nod" : "think" }];
      case "reward":
        return [{ type: "mood", value: "happy" }, { type: "play", clip: "celebrate", loop: false }];
      case "ask":
        return [{ type: "speak", durationMs: estimateMs(step.text) * 2, clip: step.clip }];
      case "lights_out":
        // Capy says goodnight first; the screen triggers lights_out (yawn → lie down → sleep) when the voice ends
        return [{ type: "mood", value: "sleepy" }, { type: "speak", durationMs: estimateMs(step.text) * 2 }];
      case "minigame":
      case "choose_people":
        return [{ type: "idle" }];
      case "parent_prompt":
      case "done":
        return [];
    }
  };

  const advance = (): { state: RunnerState; effects: AvatarEffect[] } => {
    const cur = lesson.beats[state.beatIndex];
    if (cur?.type === "repeat_after_me") {
      const prayer = prayers.get(cur.prayerId)!;
      if (state.lineIndex + 1 < prayer.lines.length) {
        state = { ...state, lineIndex: state.lineIndex + 1, step: buildStep(cur, state.lineIndex + 1) };
        return { state, effects: effectsFor(state.step) };
      }
    }
    if (cur?.type === "story") {
      const story = stories.get(cur.storyId)!;
      if (state.lineIndex < story.pages.length) {
        state = { ...state, lineIndex: state.lineIndex + 1, step: buildStep(cur, state.lineIndex + 1) };
        return { state, effects: effectsFor(state.step) };
      }
    }
    if (cur?.type === "reward") state = { ...state, lanternsEarned: state.lanternsEarned + cur.lantern };
    const next = state.beatIndex + 1;
    const beat = lesson.beats[next];
    if (!beat) {
      state = { ...state, beatIndex: next, step: { kind: "done" } };
      return { state, effects: [{ type: "idle" }] };
    }
    state = { ...state, beatIndex: next, lineIndex: 0, step: buildStep(beat, 0) };
    return { state, effects: effectsFor(state.step) };
  };

  return {
    get state() {
      return state;
    },
    start: () => advance(),
    next: () => advance(),
    /** Answer the current `ask` step: stored for later beats/prayers of this session. */
    answer: (key: AskKey, value: string) => {
      vars[key] = value;
    },
    get vars() {
      return { ...vars };
    },
    /** Session summary for progress/events. */
    summary: () => ({ lessonId: lesson.id, lanterns: state.lanternsEarned, durationMs: now() - state.startedAt, done: state.step.kind === "done" }),
  };
}

/** Until real audio durations are known: ~2.6 words/sec at Capy's slow pace, min 1.5s. */
export function estimateMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1500, Math.round((words / 2.6) * 1000));
}
