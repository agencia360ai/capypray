import * as THREE from "three";

// Reward skins (GDD §8.1 "accesorios firma"): procedural meshes parented to Capy's bones so they follow
// every clip. Ids match pack.rewards[type=skin].id. Real modelled accessories can replace these later
// (drop a GLB per skin) without touching the bridge.

const HEAD = /spine\.?006$/i;
const NECK = /spine\.?004$/i;

function findBone(root: THREE.Object3D, re: RegExp): THREE.Object3D | null {
  let out: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (!out && re.test(o.name)) out = o;
  });
  return out;
}

function flower(): THREE.Group {
  const g = new THREE.Group();
  const petal = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshStandardMaterial({ color: 0xffb84d, roughness: 0.7 }));
  g.add(center);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), petal);
    p.scale.set(1.2, 0.5, 1);
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09);
    p.rotation.y = -a;
    g.add(p);
  }
  return g;
}

function scarf(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xff8a5b, roughness: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 10, 24), mat);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), mat);
  tail.position.set(0.12, -0.16, 0.14);
  tail.rotation.z = 0.25;
  g.add(tail);
  return g;
}

function nightcap(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5f6bd6, roughness: 0.9 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.34, 20), mat);
  cone.position.y = 0.17;
  cone.rotation.z = -0.35;
  g.add(cone);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 10, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
  brim.rotation.x = Math.PI / 2;
  g.add(brim);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
  pom.position.set(0.12, 0.33, 0);
  g.add(pom);
  return g;
}

const BUILDERS: Record<string, () => THREE.Group> = { "hat-flower": flower, "scarf-cozy": scarf, nightcap };

export class SkinManager {
  private current?: THREE.Group;
  constructor(private root: THREE.Object3D, private scale: number) {}

  /** @returns the equipped id, or undefined when removed/unknown */
  equip(id?: string): string | undefined {
    if (this.current) {
      this.current.parent?.remove(this.current);
      this.current = undefined;
    }
    const build = id ? BUILDERS[id] : undefined;
    if (!build) return undefined;
    const bone = findBone(this.root, id === "scarf-cozy" ? NECK : HEAD);
    if (!bone) return undefined;
    const g = build();
    // bones live in rig units (root is scaled to 1.6 world units tall): convert world offsets to bone-local
    const inv = 1 / this.scale;
    g.scale.setScalar(inv);
    this.root.updateMatrixWorld(true);
    const boneY = bone.getWorldPosition(new THREE.Vector3()).y;
    const headTop = (1.6 - boneY) * inv; // bone-local distance from this bone to the top of the head
    if (id === "scarf-cozy") g.position.set(0, 0.02 * inv, 0.02 * inv);
    else if (id === "hat-flower") g.position.set(-0.11 * inv, headTop * 0.97, 0.06 * inv);
    else g.position.set(0, headTop * 0.9, 0);
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    bone.add(g);
    this.current = g;
    return id;
  }
}
