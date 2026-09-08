import * as THREE from "three";

// Procedural gesture clips (GDD §8.2 clips the rig lacks: wave_hello, listen_nod, think, heart, clap,
// pray_hands, celebrate). Built as ADDITIVE clips: quaternions are applied on top of whatever base clip
// plays (idle/talk), so Capy can wave while talking. Angles are in bone-local space of the Rigify DEF bones
// (Y runs along the bone). Tuned with the /preview screenshot loop; real Mixamo clips can replace any of them
// by name without touching the app.

type Key = { t: number; rot?: [number, number, number]; pos?: [number, number, number] };
type Track = { bone: string; keys: Key[] };
type Gesture = { name: string; duration: number; tracks: Track[] };

const R = "DEF-upper_arm.R";
const RF = "DEF-forearm.R";
const RH = "DEF-hand.R";
const L = "DEF-upper_arm.L";
const LF = "DEF-forearm.L";
const LH = "DEF-hand.L";
const HEAD = "DEF-spine.006";
const NECK = "DEF-spine.004";
const CHEST = "DEF-spine.003";
const HIPS = "DEF-spine";

const d = THREE.MathUtils.degToRad;
const euler = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(d(x), d(y), d(z), "XYZ"));

// Axis conventions found with the probe (?probe=BONE:x,y,z): upper_arm.R −Z raises the arm sideways,
// +X swings it forward; forearm.R −Z bends in the arm plane (hand up when the arm is raised), +X bends forward;
// head +X nods down, +Y turns, +Z tilts. Left side mirrors the Z sign.
const GESTURES: Gesture[] = [
  {
    name: "wave_hello",
    duration: 1.8,
    tracks: [
      { bone: R, keys: [{ t: 0 }, { t: 0.35, rot: [10, 0, -120] }, { t: 1.45, rot: [10, 0, -120] }, { t: 1.8 }] },
      { bone: RF, keys: [{ t: 0 }, { t: 0.35, rot: [0, 0, -50] }, { t: 0.6, rot: [0, 0, -85] }, { t: 0.85, rot: [0, 0, -35] }, { t: 1.1, rot: [0, 0, -85] }, { t: 1.35, rot: [0, 0, -50] }, { t: 1.8 }] },
      { bone: HEAD, keys: [{ t: 0 }, { t: 0.5, rot: [0, 0, 10] }, { t: 1.4, rot: [0, 0, 10] }, { t: 1.8 }] },
    ],
  },
  {
    name: "listen_nod",
    duration: 2.4,
    tracks: [
      { bone: HEAD, keys: [{ t: 0 }, { t: 0.4, rot: [16, 0, 0] }, { t: 0.8 }, { t: 1.2, rot: [16, 0, 0] }, { t: 1.6 }, { t: 2.4 }] },
      { bone: NECK, keys: [{ t: 0 }, { t: 0.4, rot: [6, 0, 0] }, { t: 0.8 }, { t: 1.2, rot: [6, 0, 0] }, { t: 1.6 }, { t: 2.4 }] },
    ],
  },
  {
    name: "think",
    duration: 2.2,
    tracks: [
      { bone: R, keys: [{ t: 0 }, { t: 0.45, rot: [70, 0, -20] }, { t: 1.8, rot: [70, 0, -20] }, { t: 2.2 }] },
      { bone: RF, keys: [{ t: 0 }, { t: 0.45, rot: [80, 0, -70] }, { t: 1.8, rot: [80, 0, -70] }, { t: 2.2 }] },
      { bone: HEAD, keys: [{ t: 0 }, { t: 0.6, rot: [-6, 14, 12] }, { t: 1.8, rot: [-6, 14, 12] }, { t: 2.2 }] },
    ],
  },
  {
    name: "heart",
    duration: 2.0,
    tracks: [
      { bone: R, keys: [{ t: 0 }, { t: 0.4, rot: [70, 0, 10] }, { t: 1.6, rot: [70, 0, 10] }, { t: 2.0 }] },
      { bone: RF, keys: [{ t: 0 }, { t: 0.4, rot: [110, 0, -30] }, { t: 1.6, rot: [110, 0, -30] }, { t: 2.0 }] },
      { bone: L, keys: [{ t: 0 }, { t: 0.4, rot: [70, 0, -10] }, { t: 1.6, rot: [70, 0, -10] }, { t: 2.0 }] },
      { bone: LF, keys: [{ t: 0 }, { t: 0.4, rot: [110, 0, 30] }, { t: 1.6, rot: [110, 0, 30] }, { t: 2.0 }] },
      { bone: HEAD, keys: [{ t: 0 }, { t: 0.5, rot: [10, 0, -8] }, { t: 1.6, rot: [10, 0, -8] }, { t: 2.0 }] },
    ],
  },
  {
    name: "pray_hands",
    duration: 3.0,
    tracks: [
      { bone: R, keys: [{ t: 0 }, { t: 0.5, rot: [55, 0, 8] }, { t: 2.6, rot: [55, 0, 8] }, { t: 3.0 }] },
      { bone: RF, keys: [{ t: 0 }, { t: 0.5, rot: [120, 0, -18] }, { t: 2.6, rot: [120, 0, -18] }, { t: 3.0 }] },
      { bone: L, keys: [{ t: 0 }, { t: 0.5, rot: [55, 0, -8] }, { t: 2.6, rot: [55, 0, -8] }, { t: 3.0 }] },
      { bone: LF, keys: [{ t: 0 }, { t: 0.5, rot: [120, 0, 18] }, { t: 2.6, rot: [120, 0, 18] }, { t: 3.0 }] },
      { bone: HEAD, keys: [{ t: 0 }, { t: 0.6, rot: [24, 0, 0] }, { t: 2.6, rot: [24, 0, 0] }, { t: 3.0 }] },
    ],
  },
  {
    name: "clap",
    duration: 1.6,
    tracks: [
      { bone: R, keys: [{ t: 0 }, { t: 0.3, rot: [65, 0, 15] }, { t: 1.3, rot: [65, 0, 15] }, { t: 1.6 }] },
      { bone: L, keys: [{ t: 0 }, { t: 0.3, rot: [65, 0, -15] }, { t: 1.3, rot: [65, 0, -15] }, { t: 1.6 }] },
      { bone: RF, keys: [{ t: 0 }, { t: 0.3, rot: [60, 0, -45] }, { t: 0.5, rot: [60, 0, -15] }, { t: 0.7, rot: [60, 0, -45] }, { t: 0.9, rot: [60, 0, -15] }, { t: 1.1, rot: [60, 0, -45] }, { t: 1.6 }] },
      { bone: LF, keys: [{ t: 0 }, { t: 0.3, rot: [60, 0, 45] }, { t: 0.5, rot: [60, 0, 15] }, { t: 0.7, rot: [60, 0, 45] }, { t: 0.9, rot: [60, 0, 15] }, { t: 1.1, rot: [60, 0, 45] }, { t: 1.6 }] },
    ],
  },
  {
    name: "celebrate",
    duration: 1.6,
    tracks: [
      { bone: R, keys: [{ t: 0 }, { t: 0.3, rot: [0, 0, -150] }, { t: 1.2, rot: [0, 0, -150] }, { t: 1.6 }] },
      { bone: RF, keys: [{ t: 0 }, { t: 0.3, rot: [0, 0, -60] }, { t: 1.2, rot: [0, 0, -60] }, { t: 1.6 }] },
      { bone: L, keys: [{ t: 0 }, { t: 0.3, rot: [0, 0, 150] }, { t: 1.2, rot: [0, 0, 150] }, { t: 1.6 }] },
      { bone: LF, keys: [{ t: 0 }, { t: 0.3, rot: [0, 0, 60] }, { t: 1.2, rot: [0, 0, 60] }, { t: 1.6 }] },
      { bone: HIPS, keys: [{ t: 0 }, { t: 0.3, pos: [0, 0.35, 0] }, { t: 0.6 }, { t: 0.85, pos: [0, 0.25, 0] }, { t: 1.1 }, { t: 1.6 }] },
      { bone: HEAD, keys: [{ t: 0 }, { t: 0.3, rot: [-15, 0, 0] }, { t: 1.2, rot: [-15, 0, 0] }, { t: 1.6 }] },
    ],
  },
];

export const GESTURE_NAMES = GESTURES.map((g) => g.name);

// GLTFLoader sanitizes node names (drops dots: "DEF-spine.006" → "DEF-spine006"); match on the sanitized form.
const sanitize = (n: string) => n.replace(/\s/g, "_").replace(/[^\w-]/g, "");
function boneMap(root: THREE.Object3D) {
  const bones = new Map<string, THREE.Object3D>();
  root.traverse((o) => bones.set(sanitize(o.name), o));
  return (name: string) => bones.get(sanitize(name));
}

/** Build additive AnimationClips for the bones present in `root`. Missing bones are skipped. */
export function buildGestureClips(root: THREE.Object3D): THREE.AnimationClip[] {
  const find = boneMap(root);
  const clips: THREE.AnimationClip[] = [];
  for (const g of GESTURES) {
    const tracks: THREE.KeyframeTrack[] = [];
    for (const tr of g.tracks) {
      const bone = find(tr.bone);
      if (!bone) continue;
      const hasRot = tr.keys.some((k) => k.rot);
      const hasPos = tr.keys.some((k) => k.pos);
      const times = tr.keys.map((k) => k.t);
      if (hasRot) {
        const values: number[] = [];
        for (const k of tr.keys) {
          const q = k.rot ? euler(...k.rot) : new THREE.Quaternion();
          values.push(q.x, q.y, q.z, q.w);
        }
        // track names must equal the base clips' ("<nodeName>.quaternion") so the mixer shares one PropertyMixer
        tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values));
      }
      if (hasPos) {
        const values: number[] = [];
        for (const k of tr.keys) values.push(...(k.pos ?? [0, 0, 0]));
        tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`, times, values));
      }
    }
    if (tracks.length) clips.push(new THREE.AnimationClip(g.name, g.duration, tracks, THREE.AdditiveAnimationBlendMode));
  }
  return clips;
}

/** Debug: constant additive rotation on one bone (preview ?probe=BONE:x,y,z) to learn bone axes. */
export function buildProbeClip(root: THREE.Object3D, bone: string, rot: [number, number, number]): THREE.AnimationClip | null {
  const target = boneMap(root)(bone);
  if (!target) return null;
  const q = euler(...rot);
  const v = [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w];
  return new THREE.AnimationClip(`probe:${bone}`, 1, [new THREE.QuaternionKeyframeTrack(`${(target as THREE.Object3D).name}.quaternion`, [0, 1], v)], THREE.AdditiveAnimationBlendMode);
}
