import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CapyStateMachine, LYING } from "./stateMachine";
import { SkinManager } from "./skins";
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

  const scene = useMemo(() => {
    const s = clone(gltf.scene);
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
    s.userData.capyScale = scale;
    return s;
  }, [gltf]);
  const skins = useMemo(() => new SkinManager(scene, scene.userData.capyScale as number), [scene]);

  const sm = useMemo(() => new CapyStateMachine(scene, gltf.animations), [scene, gltf.animations]);

  useEffect(() => {
    sm.onClipEnd = (clip) => onMessage({ type: "clipEnd", clip });
    sm.onFallback = (clip, used) => onMessage({ type: "clipFallback", clip, used });
    sm.idle();
    register({
      send: (m) => {
        switch (m.type) {
          case "play":
            sm.cue(m.clip, { loop: m.loop, fade: m.fade });
            break;
          case "speak":
            sm.speak(m.durationMs, m.clip);
            break;
          case "viewport":
            insets.current = { top: Math.max(0, Math.min(0.6, m.top)), bottom: Math.max(0, Math.min(0.8, m.bottom)), align: m.align ?? "center" };
            break;
          case "idle":
            sm.idle();
            break;
          case "lights_out":
            sm.lightsOut();
            break;
          case "skin":
            skins.equip(m.id);
            break;
          case "mood":
            sm.setMood(m.value);
            break;
          case "look":
            sm.lookAt(m.x, m.y);
            break;
          case "load":
            break; // handled by parent (re-mount with new glb)
        }
      },
    });
    (window as unknown as { __capy?: unknown }).__capy = { sm, scene }; // preview/debug handle
    // preview-only axis probe: ?probe=DEF-upper_arm.R:0,0,60
    const probe = new URLSearchParams(window.location.search).get("probe");
    if (probe) {
      const [bone, rot] = probe.split(":");
      const [x, y, z] = (rot ?? "0,0,0").split(",").map(Number);
      sm.play("idle_breathe", { loop: true });
      sm.probe(scene, bone!, [x ?? 0, y ?? 0, z ?? 0]);
    }
    onMessage({ type: "ready", clips: sm.clipNames });
    return () => sm.dispose();
  }, [sm, skins, scene, onMessage, register]);

  const frame = useRef(0);
  const insets = useRef<{ top: number; bottom: number; align: "center" | "bottom" }>({ top: 0.1, bottom: 0.45, align: "center" });
  const bounds = useRef(new THREE.Box3());
  const target = useRef(new THREE.Vector3(0, 0.8, 0));
  const camPos = useRef(new THREE.Vector3(0, 0.95, 4.2));
  const tmp = useMemo(() => new THREE.Vector3(), []);
  // Standing Capy always gets the same frame (feet on y=0, 1.6 tall): the camera does not chase hip sway,
  // hops or arm swings, so he reads as planted on the ground. Only lying clips (sleep chain) are followed,
  // because the body leaves that box.
  // A little headroom above the hair tuft and a strip of ground under the paws (the contact shadow lives there).
  const STAND = useMemo(() => new THREE.Box3(new THREE.Vector3(-0.7, -0.14, -0.4), new THREE.Vector3(0.7, 1.82, 0.4)), []);

  useFrame(({ camera }, dt) => {
    sm.update(Math.min(dt, 1 / 20));
    const lying = LYING.includes(sm.currentClip ?? "");
    if (lying && frame.current++ % 6 === 0) {
      const box = bounds.current.makeEmpty();
      scene.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (m.isSkinnedMesh) for (const b of m.skeleton.bones) box.expandByPoint(b.getWorldPosition(tmp));
      });
      if (!box.isEmpty()) box.expandByScalar(0.45);
    } else if (!lying) frame.current++;
    const box = lying && !bounds.current.isEmpty() ? bounds.current : STAND;
    const size = box.getSize(tmp);
    const center = box.getCenter(new THREE.Vector3());
    const persp = camera as THREE.PerspectiveCamera;
    // frame Capy inside the band of the screen not covered by UI (RN sends viewport insets)
    const { top, bottom, align } = insets.current;
    const band = Math.max(0.2, 1 - top - bottom);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2);
    const fit = Math.max(size.y, (size.x / persp.aspect) * band, 1.8);
    // far limit is generous: the onboarding leaves Capy a ~25 % band, which needs ~18 units to fit
    const dist = THREE.MathUtils.clamp((fit / (2 * tanHalf * band)) * 1.02, 3.5, 24);
    // where the box centre goes, in NDC: the band centre, or (align "bottom") resting on the band's lower edge
    const boxNdc = size.y / (dist * tanHalf); // box height in NDC units (screen = 2)
    const ndcY = align === "bottom" ? 2 * bottom - 1 + boxNdc / 2 + 0.01 : 1 - 2 * top - band;
    const shift = ndcY * dist * tanHalf; // world units to move the look target down so Capy sits in the band
    // snap on load; afterwards ease by wall-clock (frame-rate independent: ~0.5 s standing, ~1.2 s lying) so a slow
    // Android WebView converges as fast as a 60 fps phone
    const k = frame.current < 30 ? 1 : 1 - Math.exp(-dt * (lying ? 2.5 : 6));
    target.current.lerp(tmp.set(center.x, center.y - shift, center.z), k);
    // camera sits ~16° above the look target: a level camera sees the ground edge-on and the contact shadow vanishes
    camPos.current.lerp(tmp.set(target.current.x, target.current.y + dist * 0.29, target.current.z + dist * 0.96), k);
    camera.position.copy(camPos.current);
    camera.lookAt(target.current);
  });

  return <primitive ref={group} object={scene} />;
}

/**
 * Ground contact: a painted soft ellipse under the paws (radial gradient texture on a flat plane). Costs nothing per
 * frame — no extra render passes like drei's ContactShadows, which also never showed up on the WebView's low-power GL —
 * and it is what glues Capy to the 2D biome behind the transparent canvas.
 */
function BlobShadow() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(60,35,15,0.55)");
    g.addColorStop(0.45, "rgba(60,35,15,0.28)");
    g.addColorStop(1, "rgba(60,35,15,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.05]} renderOrder={-1}>
      <planeGeometry args={[1.7, 0.9]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
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
        <BlobShadow />
      </Suspense>
    </Canvas>
  );
}
