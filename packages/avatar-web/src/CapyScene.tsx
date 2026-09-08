import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CapyStateMachine } from "./stateMachine";
import type { RNToWeb, WebToRN } from "./bridge";

export type CapyHandle = { send: (m: RNToWeb) => void };

type Props = {
  /** URL of a GLB (meshopt-compressed ok) … */
  glb?: string;
  /** …or an already-parsed GLTF (artifact/offline embedding). One of the two is required. */
  gltf?: GLTF;
  onMessage: (m: WebToRN) => void;
  register: (h: CapyHandle) => void;
  background?: string;
};

function CapyModelFromUrl({ glb, ...rest }: Omit<Props, "background" | "gltf"> & { glb: string }) {
  const gltf = useGLTF(glb, false, true); // meshopt decoder (EXT_meshopt_compression)
  return <CapyModel gltf={gltf as unknown as GLTF} {...rest} />;
}

function CapyModel({ gltf, onMessage, register }: Omit<Props, "background" | "glb"> & { gltf: GLTF }) {
  const group = useRef<THREE.Group>(null);
  const lookTarget = useRef(new THREE.Vector2(0, 0));
  const head = useRef<THREE.Object3D | null>(null);

  const scene = useMemo(() => {
    const s = gltf.scene;
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.frustumCulled = false;
        m.castShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.vertexColors = false; // exporter kept COLOR_0; the albedo is the source of truth
        mat.roughness = 0.9;
        mat.metalness = 0;
      }
      if (o.name === "DEF-spine006" || o.name === "DEF-spine.006") head.current = o;
    });
    // normalise: feet on y=0, 1.6 units tall (bind pose, skinning applied) so camera framing is stable
    s.updateMatrixWorld(true);
    const box = new THREE.Box3();
    s.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) {
        m.computeBoundingBox();
        box.union(m.boundingBox!.clone().applyMatrix4(m.matrixWorld));
      }
    });
    if (box.isEmpty()) box.setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const scale = 1.6 / size.y;
    s.scale.setScalar(scale);
    s.position.set(-((box.min.x + box.max.x) / 2) * scale, -box.min.y * scale, 0);
    return s;
  }, [gltf]);

  const sm = useMemo(() => new CapyStateMachine(scene, gltf.animations), [scene, gltf.animations]);

  useEffect(() => {
    sm.onClipEnd = (clip) => onMessage({ type: "clipEnd", clip });
    sm.idle();
    register({
      send: (m) => {
        switch (m.type) {
          case "play":
            sm.play(m.clip, { loop: m.loop, fade: m.fade });
            break;
          case "speak":
            sm.speak(m.durationMs, m.clip);
            break;
          case "viewport":
            insets.current = { top: Math.max(0, Math.min(0.6, m.top)), bottom: Math.max(0, Math.min(0.8, m.bottom)) };
            break;
          case "idle":
            sm.idle();
            break;
          case "lights_out":
            sm.lightsOut();
            break;
          case "mood":
            sm.setMood(m.value);
            break;
          case "look":
            lookTarget.current.set(m.x, m.y);
            break;
          case "load":
            break; // handled by parent (re-mount with new glb)
        }
      },
    });
    onMessage({ type: "ready", clips: sm.clipNames });
  }, [sm, onMessage, register]);

  const frame = useRef(0);
  const insets = useRef({ top: 0.1, bottom: 0.45 });
  const bounds = useRef(new THREE.Box3());
  const target = useRef(new THREE.Vector3(0, 0.8, 0));
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }, dt) => {
    sm.update(Math.min(dt, 1 / 20));
    // auto-framing: follow the skeleton so lying-down clips (sleep, chill_lie) stay in view
    if (frame.current++ % 6 === 0) {
      const box = bounds.current.makeEmpty();
      scene.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (m.isSkinnedMesh) for (const b of m.skeleton.bones) box.expandByPoint(b.getWorldPosition(tmp));
      });
      if (!box.isEmpty()) box.expandByScalar(0.45);
    }
    const box = bounds.current;
    if (!box.isEmpty()) {
      const size = box.getSize(tmp);
      const center = box.getCenter(new THREE.Vector3());
      const persp = camera as THREE.PerspectiveCamera;
      // frame Capy inside the band of the screen not covered by UI (RN sends viewport insets)
      const { top, bottom } = insets.current;
      const band = Math.max(0.3, 1 - top - bottom);
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2);
      const fit = Math.max(size.y, (size.x / persp.aspect) * band, 1.8);
      const dist = THREE.MathUtils.clamp((fit / (2 * tanHalf * band)) * 1.12, 3.5, 12);
      const ndcY = 1 - 2 * top - band; // band centre in NDC
      const shift = ndcY * dist * tanHalf; // world units to move the look target down so Capy sits in the band
      const k = frame.current < 30 ? 1 : 0.08; // snap on load, then follow smoothly
      target.current.lerp(tmp.set(center.x, center.y - shift, center.z), k);
      camera.position.lerp(tmp.set(target.current.x, target.current.y + 0.15, target.current.z + dist), k);
      camera.lookAt(target.current);
    }
    if (head.current) {
      // subtle head-follow, additive on top of the clip
      head.current.rotation.y += THREE.MathUtils.clamp(lookTarget.current.x, -1, 1) * 0.35;
      head.current.rotation.x += THREE.MathUtils.clamp(-lookTarget.current.y, -1, 1) * 0.2;
    }
  });

  return <primitive ref={group} object={scene} />;
}

export function CapyScene(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.0, 4.2], fov: 30, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      frameloop="always"
      style={{ background: props.background ?? "transparent" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <hemisphereLight args={["#fff6e5", "#c9a77a", 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#ffd9a8" />
      <Suspense fallback={null}>
        {props.gltf ? <CapyModel gltf={props.gltf} onMessage={props.onMessage} register={props.register} /> : props.glb ? <CapyModelFromUrl glb={props.glb} onMessage={props.onMessage} register={props.register} /> : null}
        <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={4} blur={2.2} far={2} />
      </Suspense>
    </Canvas>
  );
}
