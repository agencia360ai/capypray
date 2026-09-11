import * as THREE from "three";

type Key = { t: number; value: number };
const weights = (name: string, keys: Key[]) => new THREE.VectorKeyframeTrack(`pose_${name}.position`, keys.map(key => key.t), keys.flatMap(key => [key.value, 0, 0]));
const rotate = (name: string, keys: { t: number; angles?: [number, number, number] }[]) => new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, keys.map(key => key.t), keys.flatMap(key => new THREE.Quaternion().setFromEuler(new THREE.Euler(...(key.angles ?? [0, 0, 0]).map(THREE.MathUtils.degToRad) as [number, number, number])).toArray()));
const envelope = (enter: number, hold: number, end: number): Key[] => [{ t: 0, value: 0 }, { t: enter, value: 1 }, { t: hold, value: 1 }, { t: end, value: 0 }];
const clip = (name: string, duration: number, tracks: THREE.KeyframeTrack[]) => new THREE.AnimationClip(name, duration, tracks, THREE.AdditiveAnimationBlendMode);

/** Animate independent gesture controls; RigGestures applies coherent poses after the source animation. */
export function buildGestureClips(_root?: THREE.Object3D): THREE.AnimationClip[] {
  return [
    clip("wave_hello", 1.8, [weights("wave", envelope(0.4, 1.35, 1.8)), rotate("wrist", [{ t: 0 }, { t: 0.5, angles: [0, 0, -12] }, { t: 0.75, angles: [0, 0, 12] }, { t: 1, angles: [0, 0, -12] }, { t: 1.25, angles: [0, 0, 12] }, { t: 1.8 }])]),
    clip("listen_nod", 2.4, [rotate("head", [{ t: 0 }, { t: 0.4, angles: [8, 0, 0] }, { t: 0.8 }, { t: 1.2, angles: [8, 0, 0] }, { t: 1.6 }, { t: 2.4 }])]),
    clip("think", 2.2, [weights("think", envelope(0.5, 1.8, 2.2)), rotate("head", [{ t: 0 }, { t: 0.6, angles: [-3, 6, 5] }, { t: 1.8, angles: [-3, 6, 5] }, { t: 2.2 }])]),
    clip("heart", 2, [weights("heart", envelope(0.45, 1.6, 2)), rotate("head", [{ t: 0 }, { t: 0.5, angles: [5, 0, -3] }, { t: 1.6, angles: [5, 0, -3] }, { t: 2 }])]),
    clip("pray_hands", 3, [weights("pray", envelope(0.55, 2.6, 3)), rotate("head", [{ t: 0 }, { t: 0.65, angles: [10, 0, 0] }, { t: 2.6, angles: [10, 0, 0] }, { t: 3 }])]),
    clip("clap", 1.8, [weights("clap", [{ t: 0, value: 0 }, { t: 0.4, value: 0.85 }, { t: 0.6, value: 1 }, { t: 0.8, value: 0.85 }, { t: 1, value: 1 }, { t: 1.2, value: 0.85 }, { t: 1.4, value: 1 }, { t: 1.8, value: 0 }])]),
    clip("celebrate", 1.8, [weights("celebrate", envelope(0.4, 1.2, 1.8)), new THREE.VectorKeyframeTrack("hop.position", [0, 0.35, 0.65, 0.95, 1.25, 1.8], [0, 0, 0, 0, 0.06, 0, 0, 0, 0, 0, 0.035, 0, 0, 0, 0, 0, 0, 0])]),
  ];
}

export const GESTURE_NAMES = ["wave_hello", "listen_nod", "think", "heart", "pray_hands", "clap", "celebrate"];

/** Head-only probe; direct deformation-bone probes bypass the rig's attachment guarantees. */
export function buildProbeClip(_root: THREE.Object3D, bone: string, rot: [number, number, number]): THREE.AnimationClip | null {
  if (!["DEF-spine.006", "DEF-spine006"].includes(bone)) return null;
  return clip(`probe:${bone}`, 1, [rotate("head", [{ t: 0, angles: rot }, { t: 1, angles: rot }])]);
}
