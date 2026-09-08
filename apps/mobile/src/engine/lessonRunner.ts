import type { Beat, Lesson, Pack, Prayer } from "@capy/content";
import { interpolate } from "@capy/content";

// Pure, testable lesson runner (GDD §4.1, §6.3). UI subscribes; avatar commands are emitted as effects.

export type Vars = { kidName: string; person?: string; thankfulFor?: string; mistake?: string; feeling?: string; need?: string };

export type Step =
  | { kind: "say"; text: string; audio?: string; clip: string; mood?: string }
  | { kind: "repeat"; prayer: Prayer; lineIndex: number; text: string; audio?: string; clip: string }
  | { kind: "minigame"; minigameId: string }
  | { kind: "listen"; seconds: number; text: string; audio?: string }
  | { kind: "choose_people"; min: number; max: number; text: string; audio?: string }
  | { kind: "reward"; lanterns: number }
  | { kind: "parent_prompt"; text: string }
  | { kind: "lights_out"; seconds: number; text: string; audio?: string }
  | { kind: "done" };

export type RunnerState = { beatIndex: number; lineIndex: number; step: Step; lanternsEarned: number; startedAt: number };

export type AvatarEffect =
  | { type: "play"; clip: string; loop?: boolean }
  | { type: "speak"; durationMs: number }
  | { type: "mood"; value: "calm" | "happy" | "sad" | "sleepy" }
  | { type: "idle" }
  | { type: "lights_out" };

export function createRunner(pack: Pack, lesson: Lesson, vars: Vars, now = () => Date.now()) {
  const prayers = new Map(pack.prayers.map((p) => [p.id, p]));
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
      case "listen_timer":
        return { kind: "listen", seconds: beat.seconds, text: beat.text, audio: beat.audio };
      case "choose_people":
        return { kind: "choose_people", min: beat.min, max: beat.max, text: beat.text, audio: beat.audio };
      case "reward":
        return { kind: "reward", lanterns: beat.lantern };
      case "parent_prompt":
        return { kind: "parent_prompt", text: beat.text };
      case "lights_out":
        return { kind: "lights_out", seconds: beat.seconds, text: beat.text, audio: beat.audio };
    }
  };

  const effectsFor = (step: Step): AvatarEffect[] => {
    switch (step.kind) {
      case "say":
        return [...(step.mood ? [{ type: "mood", value: step.mood } as AvatarEffect] : []), { type: "play", clip: step.clip, loop: false }, { type: "speak", durationMs: estimateMs(step.text) }];
      case "repeat":
        return [{ type: "play", clip: step.clip, loop: true }, { type: "speak", durationMs: estimateMs(step.text) }];
      case "listen":
        return [{ type: "play", clip: "listen_nod", loop: true }];
      case "reward":
        return [{ type: "mood", value: "happy" }, { type: "play", clip: "celebrate", loop: false }];
      case "lights_out":
        return [{ type: "mood", value: "sleepy" }, { type: "lights_out" }];
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
    /** Session summary for progress/events. */
    summary: () => ({ lessonId: lesson.id, lanterns: state.lanternsEarned, durationMs: now() - state.startedAt, done: state.step.kind === "done" }),
  };
}

/** Until real audio durations are known: ~2.6 words/sec at Capy's slow pace, min 1.5s. */
export function estimateMs(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1500, Math.round((words / 2.6) * 1000));
}
