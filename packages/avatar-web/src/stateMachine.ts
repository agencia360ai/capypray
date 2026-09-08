import * as THREE from "three";
import clipMap from "../../../tools/avatar/clip-map.json";
import type { Mood } from "./bridge";
import { buildGestureClips, buildProbeClip } from "./gestures";

// GDD §8.2 state machine:
// idle → (speak: talk_a|talk_b random, crossfade 0.25s) → idle
// pray_hands during repeat_after_me; listen_nod in listen_timer; celebrate on reward;
// yawn → chill_lie → sleep on lights_out; munch as idle variant 1 in 6.

const FALLBACKS: Record<string, string> = clipMap.fallbacks;
const LOOPS: Record<string, boolean> = Object.fromEntries(Object.entries(clipMap.clips).map(([k, v]) => [k, v.loop]));
const TALK = ["talk_a", "talk_b"];
const IDLE_BY_MOOD: Record<Mood, string[]> = {
  calm: ["idle_breathe", "idle_breathe", "idle_look"],
  happy: ["idle_look", "idle_breathe"],
  sad: ["sad"],
  sleepy: ["yawn", "idle_breathe"],
};

export class CapyStateMachine {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  private mood: Mood = "calm";
  private idleTimer = 0;
  private speaking = false;
  private oneShotClip?: string;
  onClipEnd?: (clip: string) => void;

  private gestures = new Map<string, THREE.AnimationAction>();
  private gesture?: THREE.AnimationAction;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) this.actions.set(c.name, this.mixer.clipAction(c));
    // procedural additive gestures layer over the base clip (wave while talking, nod while listening…)
    for (const c of buildGestureClips(root)) {
      const a = this.mixer.clipAction(c);
      a.blendMode = THREE.AdditiveAnimationBlendMode;
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = false;
      this.gestures.set(c.name, a);
    }
    this.mixer.addEventListener("finished", (e) => {
      const name = (e.action as THREE.AnimationAction).getClip().name;
      if (this.gestures.has(name)) {
        if (this.gesture?.getClip().name === name) this.gesture = undefined;
        this.onClipEnd?.(name);
        return;
      }
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

  isGesture(clip: string) {
    return this.gestures.has(clip);
  }

  /** Play a gesture on top of the current base clip. */
  gesturePlay(name: string, opts: { loop?: boolean } = {}) {
    const g = this.gestures.get(name);
    if (!g) return false;
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
    const a = this.mixer.clipAction(clip);
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
    return this.actions.has(c) ? c : this.clipNames[0]!;
  }

  play(clip: string, opts: { loop?: boolean; fade?: number } = {}) {
    if (!["yawn", "to_sleep", "sleep"].includes(clip)) this.sleepChain = false;
    if (!this.speaking) window.clearTimeout(this.speakTimeout);
    if (this.gestures.has(clip)) {
      // gesture: keep the base (or start an idle if none) and layer the gesture on top
      if (!this.current) this.idle();
      this.gesturePlay(clip, { loop: opts.loop });
      return clip;
    }
    const name = this.resolve(clip);
    const next = this.actions.get(name)!;
    const loop = opts.loop ?? LOOPS[name] ?? false;
    const fade = opts.fade ?? 0.25;
    if (name !== clip) this.oneShotClip = clip;
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

  /** Talk for durationMs. With a lead gesture (wave, think, heart…) play it once, then keep talking. */
  speak(durationMs: number, lead?: string) {
    if (lead && this.gestures.has(lead)) {
      this.speaking = true;
      this.sleepChain = false;
      window.clearTimeout(this.speakTimeout);
      this.speakTimeout = window.setTimeout(() => this.idle(), durationMs);
      this.play(pick(TALK), { loop: true });
      this.gesturePlay(lead);
      return;
    }
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
    window.clearTimeout(this.speakTimeout);
    this.sleepChain = true;
    this.play("yawn", { loop: false });
  }
  private sleepChain = false;

  update(dt: number) {
    this.mixer.update(dt);
    // re-roll idle variant every ~8s so a looping idle does not feel frozen
    if (!this.speaking && this.current && LOOPS[this.current.getClip().name] && this.current.getClip().name !== "sleep") {
      this.idleTimer += dt;
      if (this.idleTimer > 8) this.idle();
    }
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
