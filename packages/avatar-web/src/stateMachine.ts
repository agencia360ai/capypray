import * as THREE from "three";
import clipMap from "../../../tools/avatar/clip-map.json";
import type { Mood } from "./bridge";
import { buildGestureClips, buildProbeClip } from "./gestures";
import { RigGestures } from "./rigGestures";

// GDD §8.2 state machine:
// idle → (speak: talk_a|talk_b random, crossfade 0.25s) → idle
// pray_hands during repeat_after_me; listen_nod in listen_timer; celebrate on reward;
// yawn → chill_lie → sleep on lights_out; munch as idle variant 1 in 6.

const FALLBACKS: Record<string, string> = clipMap.fallbacks;
const LOOPS: Record<string, boolean> = Object.fromEntries(Object.entries(clipMap.clips).map(([k, v]) => [k, v.loop]));
// talk_b compresses the neck and warps the muzzle (reads as a rig deformation), so Capy only ever mouths with
// talk_a — a friendly arm gesture with a stable face; beats that name talk_b fall through to this too.
const TALK = ["talk_a"];
/** Gestures Capy keeps while he talks (paws stay together for a whole prayer line): hold time in seconds. */
const HOLD: Record<string, number> = { pray_hands: 2.6, heart: 1.6, think: 1.8 };
/** Lying clips: the only ones where the camera is allowed to follow the body (CapyScene). */
export const LYING = ["to_sleep", "sleep", "wake", "chill_lie"];
const IDLE_BY_MOOD: Record<Mood, string[]> = {
  calm: ["idle_breathe", "idle_breathe", "idle_look"],
  happy: ["idle_look", "idle_breathe"],
  sad: ["sad"],
  sleepy: ["yawn", "idle_breathe"],
};

export class CapyStateMachine {
  private mixer: THREE.AnimationMixer;
  private gestureMixer: THREE.AnimationMixer;
  private rig: RigGestures;
  private look = new THREE.Vector2();
  private actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  private mood: Mood = "calm";
  private idleTimer = 0;
  private speaking = false;
  private oneShotClip?: string;
  onClipEnd?: (clip: string) => void;
  /** A requested clip is not in the rig and played a fallback (surfaced in dev so missing takes are not silent). */
  onFallback?: (clip: string, used: string) => void;

  private gestures = new Map<string, THREE.AnimationAction>();
  private holds = new Map<string, THREE.AnimationAction>();
  private gesture?: THREE.AnimationAction;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    this.rig = new RigGestures(root, clips);
    this.gestureMixer = new THREE.AnimationMixer(this.rig.controls);
    for (const c of clips) this.actions.set(c.name, this.mixer.clipAction(c));
    // Gesture controls have their own mixer; the rig applies coherent poses after the source clip.
    for (const c of buildGestureClips(root)) {
      const a = this.gestureMixer.clipAction(c);
      a.blendMode = THREE.AdditiveAnimationBlendMode;
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = false;
      this.gestures.set(c.name, a);
      // "<gesture>:hold": the same clip cut before its release keys, clamped, so the pose stays up until gestureStop()
      const hold = HOLD[c.name];
      if (hold) {
        const h = this.gestureMixer.clipAction(THREE.AnimationUtils.subclip(c, `${c.name}:hold`, 0, Math.round(hold * 60), 60));
        h.blendMode = THREE.AdditiveAnimationBlendMode;
        h.setLoop(THREE.LoopOnce, 1);
        h.clampWhenFinished = true;
        this.holds.set(c.name, h);
      }
    }
    this.gestureMixer.addEventListener("finished", (e) => {
      const name = (e.action as THREE.AnimationAction).getClip().name;
      if (this.gesture === e.action && !name.endsWith(":hold")) this.gesture = undefined;
      this.onClipEnd?.(name.replace(/:hold$/, ""));
    });
    this.mixer.addEventListener("finished", (e) => {
      if (e.action !== this.current) return;
      const name = (e.action as THREE.AnimationAction).getClip().name;
      const requested = this.oneShotClip ?? name;
      this.oneShotClip = undefined;
      this.onClipEnd?.(requested);
      if (this.sleepChain) {
        if (requested === "yawn") this.play("to_sleep", { loop: false });
        else if (requested === "to_sleep") this.play("sleep", { loop: true });
        return;
      }
      if (this.speaking) this.play(pick(TALK), { loop: true });
      else this.idle();
    });
  }

  get clipNames() {
    return [...this.actions.keys(), ...this.gestures.keys()];
  }

  /** Name of the base clip playing now (undefined before the first idle). */
  get currentClip() {
    return this.current?.getClip().name;
  }

  isGesture(clip: string) {
    return this.gestures.has(clip);
  }

  /** Play a gesture on top of the current base clip. `hold` keeps the pose up (paws together) until gestureStop(). */
  gesturePlay(name: string, opts: { loop?: boolean; hold?: boolean } = {}) {
    const g = (opts.hold && this.holds.get(name)) || this.gestures.get(name);
    if (!g) return false;
    if (this.gesture === g && opts.hold) return true; // already holding this pose: don't restart it
    if (this.gesture && this.gesture !== g) this.gesture.fadeOut(0.2);
    g.reset();
    g.setLoop(opts.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    g.setEffectiveWeight(1);
    g.fadeIn(0.15);
    g.play();
    this.gesture = g;
    return true;
  }

  /** Debug only: hold an additive rotation on a bone (see gestures.ts). */
  probe(root: THREE.Object3D, bone: string, rot: [number, number, number]) {
    const clip = buildProbeClip(root, bone, rot);
    if (!clip) return false;
    const a = this.gestureMixer.clipAction(clip);
    a.blendMode = THREE.AdditiveAnimationBlendMode;
    a.setLoop(THREE.LoopRepeat, Infinity);
    a.play();
    return true;
  }

  gestureStop() {
    this.gesture?.fadeOut(0.25);
    this.gesture = undefined;
  }

  resolve(clip: string): string {
    let c = clip;
    for (let i = 0; i < 4 && !this.actions.has(c); i++) c = FALLBACKS[c] ?? "idle_breathe";
    const used = this.actions.has(c) ? c : this.clipNames[0]!;
    if (used !== clip && !this.gestures.has(clip)) this.onFallback?.(clip, used);
    return used;
  }

  /** External cue (RN "play"): whatever Capy was saying is over; do this clip now. */
  cue(clip: string, opts: { loop?: boolean; fade?: number } = {}) {
    this.speaking = false;
    window.clearTimeout(this.speakTimeout);
    const isGesture = this.gestures.has(clip) && !this.actions.has(clip + "_full");
    if (!isGesture) this.gestureStop();
    // a gesture cued after a line: the mouth must not keep moving under it
    else if (this.current && TALK.includes(this.current.getClip().name)) this.idle();
    return this.play(clip, opts);
  }

  play(clip: string, opts: { loop?: boolean; fade?: number } = {}) {
    if (!["yawn", "to_sleep", "sleep"].includes(clip)) this.sleepChain = false;
    if (!this.speaking) window.clearTimeout(this.speakTimeout);
    // a baked full-body version of a gesture (Blender poses.py) wins when Capy is not talking
    const full = !this.speaking && this.actions.has(clip + "_full") ? clip + "_full" : undefined;
    if (!full && this.gestures.has(clip) && !this.actions.has(clip)) {
      // gesture: keep the base (or start an idle if none) and layer the gesture on top
      if (!this.current) this.idle();
      this.gesturePlay(clip, { loop: opts.loop });
      return clip;
    }
    const name = this.resolve(full ?? clip);
    const next = this.actions.get(name)!;
    const loop = opts.loop ?? LOOPS[name] ?? false;
    const fade = opts.fade ?? 0.25;
    this.oneShotClip = name !== clip ? clip : undefined;
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = !loop;
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (this.current && this.current !== next) {
      next.crossFadeFrom(this.current, fade, true);
    }
    next.play();
    this.current = next;
    this.idleTimer = 0;
    return name;
  }

  idle() {
    this.speaking = false;
    this.sleepChain = false;
    this.gestureStop();
    const pool = IDLE_BY_MOOD[this.mood];
    const clip = Math.random() < 1 / 6 && this.actions.has("munch") ? "munch" : pick(pool);
    this.play(clip, { loop: clip !== "munch" && clip !== "yawn" });
  }

  /**
   * Talk for at most durationMs (a safety cap: the app sends idle/cue when the real voice ends).
   * With a lead gesture (wave, think, heart…) play it once, then keep talking; hold gestures (pray_hands, heart,
   * think) stay up for the whole line so the paws never drop mid-prayer.
   */
  speak(durationMs: number, lead?: string) {
    if (lead && this.gestures.has(lead)) {
      this.speaking = true;
      this.sleepChain = false;
      window.clearTimeout(this.speakTimeout);
      this.speakTimeout = window.setTimeout(() => this.idle(), durationMs);
      if (!this.current || !TALK.includes(this.current.getClip().name)) this.play(pick(TALK), { loop: true });
      this.gesturePlay(lead, { hold: lead in HOLD });
      return;
    }
    this.gestureStop();
    this.speaking = true;
    window.clearTimeout(this.speakTimeout);
    this.speakTimeout = window.setTimeout(() => this.idle(), durationMs);
    const gesture = lead && this.resolve(lead) === lead && !TALK.includes(lead) && !LOOPS[lead] ? lead : undefined;
    if (gesture) this.play(gesture, { loop: false }); // "finished" → talk loop while speaking
    else this.play(pick(TALK), { loop: true });
  }
  private speakTimeout = 0;

  setMood(m: Mood) {
    this.mood = m;
    if (!this.speaking && this.current && LOOPS[this.current.getClip().name]) this.idle();
  }

  lightsOut() {
    this.speaking = false;
    this.gestureStop();
    window.clearTimeout(this.speakTimeout);
    this.sleepChain = true;
    this.play("yawn", { loop: false });
  }
  private sleepChain = false;

  update(dt: number) {
    this.rig.restore();
    this.mixer.update(dt);
    this.gestureMixer.update(dt);
    this.rig.apply(this.look);
    // re-roll idle variant every ~8s so a looping idle does not feel frozen
    if (!this.speaking && this.current && LOOPS[this.current.getClip().name] && this.current.getClip().name !== "sleep") {
      this.idleTimer += dt;
      if (this.idleTimer > 8) this.idle();
    }
  }

  lookAt(x: number, y: number) { this.look.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1)); }

  dispose() {
    window.clearTimeout(this.speakTimeout);
    this.rig.restore();
    this.mixer.stopAllAction();
    this.gestureMixer.stopAllAction();
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
