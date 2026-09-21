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
  | { kind: "choose_intention"; text: string; audio?: string; clip: string; options: { id: string; label: string; icon: string }[] }
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

/** `intentions`: show choose_intention beats. Off, the lesson plays with its own prayer, exactly as it did before. */
export type RunnerOpts = { intentions?: boolean; variationIndex?: number };

export function createRunner(pack: Pack, lesson: Lesson, initialVars: Vars, opts: RunnerOpts = {}, now = () => Date.now()) {
  const vars: Vars = { ...pack.companion.prayerDefaults, ...initialVars };
  const prayers = new Map(pack.prayers.map((p) => [p.id, p]));
  const stories = new Map(pack.stories.map((st) => [st.id, st]));
  /** beat index → the prayer the child chose for it. Empty until a choose_intention beat is answered. */
  const chosen = new Map<number, string>();
  let echo: { text: string; audio?: string } | undefined;
  const take = Math.max(0, Math.floor(opts.variationIndex ?? 0));
  const prayerFor = (beatIndex: number, prayerId: string) => {
    const beat = lesson.beats[beatIndex];
    const ids = [prayerId, ...(beat?.type === "repeat_after_me" ? beat.prayerVariants ?? [] : [])];
    return prayers.get(chosen.get(beatIndex) ?? ids[take % ids.length]!)!;
  };
  let state: RunnerState = { beatIndex: -1, lineIndex: 0, step: { kind: "done" }, lanternsEarned: 0, startedAt: now() };

  const buildStep = (beat: Beat, lineIndex: number, beatIndex: number): Step => {
    switch (beat.type) {
      case "avatar_say": {
        const lines = [beat, ...(beat.variations ?? [])];
        const line = lines[take % lines.length]!;
        return { kind: "say", text: interpolate(line.text, vars), audio: line.audio, clip: beat.clip, mood: beat.mood };
      }
      case "repeat_after_me": {
        const prayer = prayerFor(beatIndex, beat.prayerId);
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
        return { kind: "listen", seconds: beat.seconds, text: interpolate(beat.text, vars), audio: beat.audio, clip: beat.clip };
      case "choose_people":
        return { kind: "choose_people", min: beat.min, max: beat.max, text: interpolate(beat.text, vars), audio: beat.audio };
      case "reward":
        return { kind: "reward", lanterns: beat.lantern };
      case "ask":
        return { kind: "ask", key: beat.key, text: interpolate(beat.text, vars), audio: beat.audio, clip: beat.clip, options: beat.options };
      case "choose_intention":
        return { kind: "choose_intention", text: interpolate(beat.text, vars), audio: beat.audio, clip: beat.clip, options: beat.options.map(({ id, label, icon }) => ({ id, label, icon })) };
      case "parent_prompt":
        return { kind: "parent_prompt", text: interpolate(beat.text, vars) };
      case "lights_out":
        return { kind: "lights_out", seconds: beat.seconds, text: interpolate(beat.text, vars), audio: beat.audio };
    }
  };

  const effectsFor = (step: Step): AvatarEffect[] => {
    switch (step.kind) {
      case "say":
        return [...(step.mood ? [{ type: "mood", value: step.mood } as AvatarEffect] : []), { type: "speak", durationMs: speakCapMs(step.text), clip: step.clip }];
      case "repeat":
        return [{ type: "speak", durationMs: speakCapMs(step.text), clip: step.clip }];
      case "listen":
        return [{ type: "play", clip: step.clip, loop: true }];
      case "story":
        return [{ type: "speak", durationMs: speakCapMs(step.text), clip: step.last ? "heart" : step.pageIndex % 2 ? "listen_nod" : "think" }];
      case "reward":
        return [{ type: "mood", value: "happy" }, { type: "play", clip: lesson.routine === "bedtime" || lesson.routine === "moment" ? "heart" : "celebrate", loop: false }];
      case "ask":
      case "choose_intention":
        return [{ type: "speak", durationMs: speakCapMs(step.text), clip: step.clip }];
      case "lights_out":
        // Capy says goodnight first; the screen triggers lights_out (yawn → lie down → sleep) when the voice ends
        return [{ type: "mood", value: "sleepy" }, { type: "speak", durationMs: speakCapMs(step.text) }];
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
      const prayer = prayerFor(state.beatIndex, cur.prayerId);
      if (state.lineIndex + 1 < prayer.lines.length) {
        state = { ...state, lineIndex: state.lineIndex + 1, step: buildStep(cur, state.lineIndex + 1, state.beatIndex) };
        return { state, effects: effectsFor(state.step) };
      }
    }
    if (cur?.type === "story") {
      const story = stories.get(cur.storyId)!;
      if (state.lineIndex < story.pages.length) {
        state = { ...state, lineIndex: state.lineIndex + 1, step: buildStep(cur, state.lineIndex + 1, state.beatIndex) };
        return { state, effects: effectsFor(state.step) };
      }
    }
    // Capy says the choice back before the prayer starts, so the child hears that the tap landed
    if (echo) {
      const step: Step = { kind: "say", text: interpolate(echo.text, vars), audio: echo.audio, clip: "heart" };
      echo = undefined;
      state = { ...state, step };
      return { state, effects: effectsFor(step) };
    }
    if (cur?.type === "reward") state = { ...state, lanternsEarned: state.lanternsEarned + cur.lantern };
    let next = state.beatIndex + 1;
    // without intentions the question is not asked at all and the lesson keeps its own prayer
    while (lesson.beats[next]?.type === "choose_intention" && !opts.intentions) next++;
    const beat = lesson.beats[next];
    if (!beat) {
      state = { ...state, beatIndex: next, step: { kind: "done" } };
      return { state, effects: [{ type: "idle" }] };
    }
    state = { ...state, beatIndex: next, lineIndex: 0, step: buildStep(beat, 0, next) };
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
    /**
     * Pick an intention: the prayer beat it governs — the next one in the lesson — swaps to the authored variant
     * the option names, and Capy echoes the choice on the way there. Nothing else in the lesson changes.
     */
    choose: (optionId: string) => {
      const beat = lesson.beats[state.beatIndex];
      if (beat?.type !== "choose_intention") return;
      const option = beat.options.find((o) => o.id === optionId);
      if (!option) return;
      const target = lesson.beats.findIndex((b, i) => i > state.beatIndex && b.type === "repeat_after_me");
      if (target >= 0) chosen.set(target, option.prayerId);
      echo = { text: option.echo, audio: option.echoAudio };
    },
    get vars() {
      return { ...vars };
    },
    /** Which intention the child picked, for the completion event. */
    get intention() {
      return [...chosen.values()][0];
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

/**
 * Cap for the talk animation. The real end of a line comes from the voice (SpeechBubble sends idle/rest when the
 * audio or TTS finishes); this only stops the mouth if that callback never arrives. Generous on purpose: device TTS
 * at Capy's slow rate can run 2–3× the estimate, and a mouth that stops early reads as "the animation is broken".
 */
export const speakCapMs = (text: string) => estimateMs(text) * 3;
