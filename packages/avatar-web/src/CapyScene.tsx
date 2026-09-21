import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CapyStateMachine, LYING } from "./stateMachine";
import { HEADING, MIN_LEG, ease, easeRate, measureGroundSpeed, paceMs, strideRate } from "./walk";
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

function CapyModelFromUrl({ glb, ...rest }: Omit<Props, "background" | "gltf"> & { glb: string } & Stage) {
  const gltf = useGLTF(glb, false, true); // meshopt decoder (EXT_meshopt_compression)
  return <CapyModel gltf={gltf as unknown as GLTF} {...rest} />;
}

/** Where Capy currently stands on the stage. The camera never follows it (see STAND), so only he moves. */
type Walk = { x: number };

type Stage = { walk: React.MutableRefObject<Walk>; halfWidth: React.MutableRefObject<number> };

function CapyModel({ gltf, onMessage, register, walk, halfWidth }: Omit<Props, "background" | "glb"> & { gltf: GLTF } & Stage) {
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
        // The body atlas has unpadded UV islands against black. Mip levels bleed that black
        // into the visible seams; linear base-level sampling keeps its painted edges clean.
        if (mat.name === "capy_body" && mat.map) {
          mat.map.generateMipmaps = false;
          mat.map.minFilter = THREE.LinearFilter;
          mat.map.needsUpdate = true;
        }
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
  // what the authored stride is worth in ground per second, measured off a clone before anything plays
  const groundSpeed = useMemo(() => measureGroundSpeed(scene, gltf.animations), [scene, gltf.animations]);

  useEffect(() => {
    sm.onClipEnd = (clip) => onMessage({ type: "clipEnd", clip });
    sm.onFallback = (clip, used) => onMessage({ type: "clipFallback", clip, used });
    sm.idle();
    register({
      send: (m) => {
        switch (m.type) {
          case "play":
            cutWalk();
            sm.cue(m.clip, { loop: m.loop, fade: m.fade });
            break;
          case "speak":
            cutWalk();
            sm.speak(m.durationMs, m.clip);
            break;
          case "viewport":
            insets.current = { top: Math.max(0, Math.min(0.6, m.top)), bottom: Math.max(0, Math.min(0.8, m.bottom)), align: m.align ?? "center" };
            break;
          case "idle":
            cutWalk();
            sm.idle();
            break;
          case "lights_out":
            cutWalk();
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
          case "walk": {
            // lobby only: a stroll across the stage. The walk clip is in-place, so the world position is animated
            // here and Capy turns to face the way he is going; the camera and the lesson framing are untouched.
            const to = THREE.MathUtils.clamp(m.to, -1, 1);
            if (m.from !== undefined) walk.current.x = THREE.MathUtils.clamp(m.from, -1, 1); // the lobby knows where he was standing
            const distance = Math.abs(to - walk.current.x) * halfWidth.current;
            if (distance < MIN_LEG) {
              // already there: stepping in place is the one thing a walk must never look like
              leg.current = null;
              walk.current.x = to;
              if (m.then) { sm.cue(m.then); onMessage({ type: "clipEnd", clip: "walk" }); }
              break;
            }
            leg.current = { from: walk.current.x, to, t: 0, ms: paceMs(distance, groundSpeed, m.durationMs), then: m.then };
            sm.play("walk", { loop: true, fade: 0.25 });
            break;
          }
          case "load":
            break; // handled by parent (re-mount with new glb)
        }
      },
    });
    (window as unknown as { __capy?: unknown }).__capy = { sm, scene, walk, groundSpeed }; // preview/debug handle
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

  const leg = useRef<{ from: number; to: number; t: number; ms: number; then?: string } | null>(null);
  /** Anything else the app asks for wins over a walk in progress: he stops where he is and the app hears the leg end. */
  const cutWalk = () => {
    if (!leg.current) return;
    leg.current = null;
    onMessage({ type: "clipEnd", clip: "walk" });
  };
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
    const step = leg.current;
    if (step) {
      // the leg runs on the mixer's clock, not the wall clock: a phone drawing at twelve frames a second advances
      // the stride by a clamped delta, and a body that kept to wall time would glide away from its own feet
      step.t += Math.min(dt, 1 / 20) * 1000;
      const p = Math.min(1, step.t / step.ms);
      walk.current.x = step.from + (step.to - step.from) * ease(p);
      const dir = step.to - step.from;
      // the stride follows the body, not the other way round: he is easing in and out, so the cadence does too
      sm.setRate(strideRate((Math.abs(dir) * halfWidth.current * easeRate(p)) / (step.ms / 1000), groundSpeed));
      // three-quarter, never a full profile and never his back: the child keeps seeing his face while he walks
      if (Math.abs(dir) > 0.01) scene.rotation.y = THREE.MathUtils.lerp(scene.rotation.y, Math.sign(dir) * THREE.MathUtils.degToRad(HEADING), Math.min(1, dt * 6));
      if (p >= 1) {
        leg.current = null;
        // the clip's own loop flag decides: a settling gesture plays once and hands back to idle, an idle loops
        sm.play(step.then ?? "idle_breathe", { fade: 0.35 });
        onMessage({ type: "clipEnd", clip: "walk" });
      }
    } else if (scene.rotation.y !== 0) {
      scene.rotation.y = Math.abs(scene.rotation.y) < 0.01 ? 0 : THREE.MathUtils.lerp(scene.rotation.y, 0, Math.min(1, dt * 5));
    }
    scene.position.x = walk.current.x * halfWidth.current;
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
    halfWidth.current = dist * tanHalf * persp.aspect * 0.72; // 0.72: keep a margin so he never clips the edge
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
function BlobShadow({ walk, halfWidth }: { walk: React.MutableRefObject<Walk>; halfWidth: React.MutableRefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mesh.current) mesh.current.position.x = walk.current.x * halfWidth.current;
  });
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
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.05]} renderOrder={-1}>
      <planeGeometry args={[1.7, 0.9]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function CapyScene(props: Props) {
  // Capy's spot on the stage (-1…1) and what that is worth in world units. Shared so the painted shadow travels
  // with him; the camera deliberately does not (see STAND).
  const walk = useRef<Walk>({ x: 0 });
  const halfWidth = useRef(1.2);
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
        {props.gltf ? <CapyModel gltf={props.gltf} onMessage={props.onMessage} register={props.register} walk={walk} halfWidth={halfWidth} /> : props.glb ? <CapyModelFromUrl glb={props.glb} onMessage={props.onMessage} register={props.register} walk={walk} halfWidth={halfWidth} /> : null}
        <BlobShadow walk={walk} halfWidth={halfWidth} />
      </Suspense>
    </Canvas>
  );
}
