import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * Walk pacing.
 *
 * The take is in place — the root never leaves the origin — so the stage animates Capy's world position instead.
 * That only reads as walking when the body covers exactly the ground the stride covers; anything else is a child
 * watching a capybara skate. So the speed is not a guess: the walk clip is measured once, on a clone, and the clip
 * is then retimed every frame to whatever speed he is actually travelling at.
 */

/** Used when the rig has no walk take or no feet to measure (the viewer still has to do something sane). */
export const FALLBACK_SPEED = 0.6;
/** How far the stride may be retimed before it reads as a run or as a mime. Past this the feet would slip. */
export const RATE = { min: 0.6, max: 1.6 };
/** A leg shorter than this is a shuffle, not a walk: the lobby snaps instead. Viewer units (Capy is 1.6 tall). */
export const MIN_LEG = 0.05;
/** Three-quarter: he leads with a shoulder, so the child keeps seeing his face while he walks. Degrees. */
export const HEADING = 52;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Ease in and out, so he leans into the walk and settles out of it. */
export const ease = (p: number) => p * p * (3 - 2 * p);
/** …and how fast that is going at p (the derivative), which is what the stride has to match. */
export const easeRate = (p: number) => 6 * p * (1 - p);

/**
 * Ground covered per cycle: the frames where a foot is planted (its lowest fifth of travel), summed over the net
 * displacement of each planted stretch. Jitter in place therefore counts as nothing, and a foot swinging forward
 * through the air is not mistaken for ground.
 */
export function plantedGround(track: Array<Array<{ y: number; z: number }>>) {
  const lows = track.flat().map((p) => p.y).sort((a, b) => a - b);
  if (!lows.length) return 0;
  const lift = lows[Math.floor(lows.length * 0.9)]! - lows[0]!;
  const planted = lows[0]! + lift * 0.2;
  let ground = 0;
  for (const foot of track) {
    let start: number | null = null, last = 0;
    for (const p of foot) {
      if (p.y <= planted) { if (start === null) start = p.z; last = p.z; continue; }
      if (start !== null) ground += Math.abs(last - start);
      start = null;
    }
    if (start !== null) ground += Math.abs(last - start);
  }
  return ground;
}

/** The loader strips the dots out of Blender's bone names (DEF-foot.L → DEF-footL), as rigGestures also has to know. */
const clean = (name: string) => name.replace(/[^\w-]/g, "");

/** The speed the authored stride implies, in viewer units per second. Measured on a clone, so nothing on screen moves. */
export function measureGroundSpeed(scene: THREE.Object3D, clips: THREE.AnimationClip[], name = "walk") {
  const clip = clips.find((c) => c.name === name);
  const rig = clip ? (clone(scene) as THREE.Object3D) : undefined;
  const feet: THREE.Object3D[] = [];
  rig?.traverse((o) => { if (["DEF-foot.L", "DEF-foot.R"].map(clean).includes(clean(o.name))) feet.push(o); });
  if (!clip || feet.length < 2) return FALLBACK_SPEED;
  const mixer = new THREE.AnimationMixer(rig!);
  mixer.clipAction(clip).play();
  const track: Array<Array<{ y: number; z: number }>> = feet.map(() => []);
  const p = new THREE.Vector3();
  const SAMPLES = 120;
  for (let k = 0; k < SAMPLES; k++) {
    mixer.setTime((k / SAMPLES) * clip.duration);
    rig!.updateMatrixWorld(true);
    feet.forEach((f, i) => { f.getWorldPosition(p); track[i]!.push({ y: p.y, z: p.z }); });
  }
  mixer.stopAllAction();
  mixer.uncacheClip(clip);
  const speed = plantedGround(track) / clip.duration;
  // a rig whose feet barely touch the ground would hand back nonsense; the fallback keeps the lobby walking
  return Number.isFinite(speed) && speed > 0.1 && speed < 3 ? speed : FALLBACK_SPEED;
}

/**
 * How long a leg takes. Without a request it is the stride's own pace; with one, it is honoured only as far as the
 * clip can be retimed, because a duration the feet cannot back up is the skate this whole file exists to avoid.
 */
export function paceMs(distance: number, speed: number, requested?: number) {
  const natural = (Math.abs(distance) / speed) * 1000;
  if (!requested) return Math.max(250, natural);
  return Math.max(250, Math.min(natural / RATE.min, Math.max(natural / RATE.max, requested)));
}

/** The clip's playback rate for the speed Capy is travelling at right now. */
export const strideRate = (speed: number, base: number) => clamp(speed / base, RATE.min, RATE.max);
