import * as THREE from "three";
import clipMap from "../../../tools/avatar/clip-map.json";
import type { Mood } from "./bridge";

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

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) this.actions.set(c.name, this.mixer.clipAction(c));
    this.mixer.addEventListener("finished", (e) => {
      const name = (e.action as THREE.AnimationAction).getClip().name;
      const requested = this.oneShotClip ?? name;
      this.oneShotClip = undefined;
      this.onClipEnd?.(requested);
      if (this.speaking) this.play(pick(TALK), { loop: true });
      else this.idle();
    });
  }

  get clipNames() {
    return [...this.actions.keys()];
  }

  resolve(clip: string): string {
    let c = clip;
    for (let i = 0; i < 4 && !this.actions.has(c); i++) c = FALLBACKS[c] ?? "idle_breathe";
    return this.actions.has(c) ? c : this.clipNames[0]!;
  }

  play(clip: string, opts: { loop?: boolean; fade?: number } = {}) {
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
    const pool = IDLE_BY_MOOD[this.mood];
    const clip = Math.random() < 1 / 6 && this.actions.has("munch") ? "munch" : pick(pool);
    this.play(clip, { loop: clip !== "munch" && clip !== "yawn" });
  }

  speak(durationMs: number) {
    this.speaking = true;
    this.play(pick(TALK), { loop: true });
    window.clearTimeout(this.speakTimeout);
    this.speakTimeout = window.setTimeout(() => this.idle(), durationMs);
  }
  private speakTimeout = 0;

  setMood(m: Mood) {
    this.mood = m;
    if (!this.speaking && this.current && LOOPS[this.current.getClip().name]) this.idle();
  }

  lightsOut() {
    this.speaking = false;
    this.play("yawn", { loop: false });
    this.onClipEnd = (c) => {
      if (c === "yawn") this.play("to_sleep", { loop: false });
      else if (c === "to_sleep") this.play("sleep", { loop: true });
    };
  }

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
