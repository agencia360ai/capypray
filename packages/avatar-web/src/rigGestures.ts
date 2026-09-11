import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const clean = (name: string) => name.replace(/[^\w-]/g, "");
const HEAD = clean("DEF-spine.006");
const NECK = clean("DEF-spine.004");
const CHEST = clean("DEF-spine.003");
const ARM = /^(DEF-upper_arm|DEF-forearm|DEF-hand|DEF-palm|DEF-thumb|DEF-f_)/;
const FACE = /^DEF-(ear|teeth|nose|eye|lid|tongue|jaw|chin|lip|brow|cheek|forehead|temple)/;
export const POSE_NAMES = ["wave", "heart", "pray", "clap", "think", "celebrate"] as const;
type Transform = { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
const snapshot = (node: THREE.Object3D): Transform => ({ position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone() });
const copy = (node: THREE.Object3D, value: Transform) => { node.position.copy(value.position); node.quaternion.copy(value.quaternion); node.scale.copy(value.scale); };
const rotation = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...[x, y, z].map(THREE.MathUtils.degToRad) as [number, number, number]));

/** The FBX bake has independent facial roots. Transport them with the head when adding a gesture. */
export class RigGestures {
  readonly controls = new THREE.Group();
  private bones = new Map<string, THREE.Object3D>();
  private saved: { node: THREE.Object3D; value: Transform }[] = [];
  private hasSaved = false;
  private faces: THREE.Object3D[] = [];
  private arms: THREE.Object3D[] = [];
  private targets = new Map<string, Map<string, Transform>>();
  private armTargets: { node: THREE.Object3D; root: boolean; poses: { value: Transform; control: THREE.Object3D }[] }[] = [];
  private head!: THREE.Object3D;
  private neck!: THREE.Object3D;
  private chest!: THREE.Object3D;
  private beforeHead = new THREE.Matrix4();
  private delta = new THREE.Matrix4();
  private matrix = new THREE.Matrix4();
  private inverse = new THREE.Matrix4();
  private targetPosition = new THREE.Vector3();
  private targetQuaternion = new THREE.Quaternion();
  private targetScale = new THREE.Vector3();

  constructor(private root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    root.traverse(node => { if ((node as THREE.Bone).isBone) this.bones.set(clean(node.name), node); });
    this.head = this.bones.get(HEAD)!;
    this.neck = this.bones.get(NECK)!;
    this.chest = this.bones.get(CHEST)!;
    this.arms = [...this.bones.values()].filter(node => ARM.test(node.name));
    this.faces = [...this.bones.values()].filter(node => FACE.test(node.name) && !(node.parent as THREE.Bone)?.isBone);
    this.saved = [root, ...this.bones.values()].map(node => ({ node, value: snapshot(node) }));
    for (const name of [...POSE_NAMES.map(name => `pose_${name}`), "head", "neck", "hop", "wrist"]) {
      const control = new THREE.Object3D(); control.name = name; this.controls.add(control);
    }
    if (!this.head || !this.neck || !this.chest) return;
    for (const name of POSE_NAMES) this.targets.set(name, this.makeTarget(name, clips));
    this.armTargets = this.arms.map(node => ({
      node,
      root: /^DEF-upper_arm[LR]$/.test(clean(node.name)),
      poses: [...this.targets].flatMap(([pose, target]) => {
        const value = target.get(clean(node.name));
        return value ? [{ value, control: this.controls.getObjectByName(`pose_${pose}`)! }] : [];
      }),
    }));
  }

  private makeTarget(name: string, clips: THREE.AnimationClip[]) {
    const source = clone(this.root);
    const mixer = new THREE.AnimationMixer(source);
    const clipName = ["pray", "clap"].includes(name) ? "pray_hands_full" : ["heart", "think"].includes(name) ? "heart_full" : "idle_breathe";
    const clip = clips.find(clip => clip.name === clipName) ?? clips.find(clip => clip.name === "idle_breathe");
    if (clip) { mixer.clipAction(clip).play(); mixer.update(1); }
    const find = (name: string) => source.getObjectByName(this.bones.get(clean(name))?.name ?? name)!;
    if (["wave", "celebrate"].includes(name)) {
      for (const side of name === "wave" ? ["R"] : ["R", "L"]) {
        const sign = side === "R" ? -1 : 1;
        find(`DEF-upper_arm.${side}`).quaternion.multiply(rotation(10, 0, sign * 65));
        find(`DEF-forearm.${side}`).quaternion.multiply(rotation(0, 0, sign * 55));
      }
    }
    source.updateMatrixWorld(true);
    const chestInverse = find("DEF-spine.003").matrixWorld.clone().invert();
    const target = new Map<string, Transform>();
    for (const arm of this.arms) {
      if (name === "wave" && /L(?:\d*)$/.test(clean(arm.name))) continue;
      if (name === "think" && /L(?:\d*)$/.test(clean(arm.name))) continue;
      const node = source.getObjectByName(arm.name)!;
      const value = snapshot(node);
      if (/^DEF-upper_arm[LR]$/.test(clean(node.name))) {
        new THREE.Matrix4().multiplyMatrices(chestInverse, node.matrixWorld).decompose(value.position, value.quaternion, value.scale);
      }
      target.set(clean(node.name), value);
    }
    mixer.stopAllAction(); mixer.uncacheRoot(source);
    return target;
  }

  restore() {
    if (this.hasSaved) for (const { node, value } of this.saved) copy(node, value);
    this.hasSaved = false;
  }

  apply(look: THREE.Vector2) {
    if (!this.head || !this.neck || !this.chest) return;
    for (const { node, value } of this.saved) { value.position.copy(node.position); value.quaternion.copy(node.quaternion); value.scale.copy(node.scale); }
    this.hasSaved = true;
    this.root.updateMatrixWorld(true);
    this.beforeHead.copy(this.head.matrixWorld).invert();
    this.head.quaternion.multiply(this.controls.getObjectByName("head")!.quaternion);
    this.neck.quaternion.multiply(this.controls.getObjectByName("neck")!.quaternion);
    this.head.quaternion.multiply(rotation(-look.y * 8, look.x * 12, 0));
    this.root.updateMatrixWorld(true);
    this.delta.multiplyMatrices(this.head.matrixWorld, this.beforeHead);
    for (const node of this.faces) {
      this.matrix.multiplyMatrices(this.delta, node.matrixWorld);
      this.inverse.copy(node.parent!.matrixWorld).invert();
      this.matrix.premultiply(this.inverse).decompose(node.position, node.quaternion, node.scale);
    }
    for (const { node, root, poses } of this.armTargets) {
      const total = poses.reduce((sum, pose) => sum + THREE.MathUtils.clamp(pose.control.position.x, 0, 1), 0);
      let accumulated = Math.max(0, 1 - total);
      for (const { value, control } of poses) {
        const weight = THREE.MathUtils.clamp(control.position.x, 0, 1);
        if (!weight) continue;
        this.targetPosition.copy(value.position); this.targetQuaternion.copy(value.quaternion); this.targetScale.copy(value.scale);
        if (root) {
          this.matrix.compose(this.targetPosition, this.targetQuaternion, this.targetScale).premultiply(this.chest.matrixWorld);
          this.inverse.copy(node.parent!.matrixWorld).invert();
          this.matrix.premultiply(this.inverse).decompose(this.targetPosition, this.targetQuaternion, this.targetScale);
        }
        const blend = weight / (accumulated + weight);
        node.position.lerp(this.targetPosition, blend); node.quaternion.slerp(this.targetQuaternion, blend); node.scale.lerp(this.targetScale, blend);
        accumulated += weight;
      }
    }
    this.bones.get(clean("DEF-hand.R"))?.quaternion.multiply(this.controls.getObjectByName("wrist")!.quaternion);
    this.root.position.y += this.controls.getObjectByName("hop")!.position.y;
    this.root.updateMatrixWorld(true);
  }
}
