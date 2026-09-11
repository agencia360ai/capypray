import { useCallback, useRef, useState } from "react";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CapyScene, type CapyHandle } from "./CapyScene";
import type { Mood, WebToRN } from "./bridge";
import { AVATAR_CLIPS } from "./clips";

export function Preview({ glb, gltf }: { glb?: string; gltf?: GLTF }) {
  const handle = useRef<CapyHandle | null>(null);
  const [available, setAvailable] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [clip, setClip] = useState<string>(new URLSearchParams(location.search).get("clip") ?? "idle_breathe");

  const onMessage = useCallback((m: WebToRN) => {
    setLog((l) => [JSON.stringify(m), ...l].slice(0, 6));
    if (m.type === "ready") {
      setAvailable(m.clips);
      const q = new URLSearchParams(location.search);
      const c = q.get("clip");
      if (c) handle.current?.send({ type: "play", clip: c, loop: true });
      const sk = q.get("skin");
      if (sk) handle.current?.send({ type: "skin", id: sk });
      const g = q.get("gesture");
      if (g) setTimeout(() => handle.current?.send({ type: "play", clip: g }), 300);
      // ?ui=top,bottom mimics the app's UI insets (e.g. ui=0.12,0.5 = lesson screen); default = full canvas
      const [top = "0", bottom = "0"] = (q.get("ui") ?? "0,0").split(",");
      handle.current?.send({ type: "viewport", top: Number(top), bottom: Number(bottom) });
      (window as unknown as { __capyReady: boolean; __capySend: CapyHandle["send"] }).__capySend = (m) => handle.current?.send(m);
      (window as unknown as { __capyReady: boolean }).__capyReady = true;
    }
  }, []);

  const register = useCallback((h: CapyHandle) => {
    handle.current = h;
  }, []);

  const bare = new URLSearchParams(location.search).has("bare");
  const play = (c: string) => {
    setClip(c);
    handle.current?.send({ type: "play", clip: c, loop: true });
  };

  return (
    <>
      <CapyScene glb={glb} gltf={gltf} onMessage={onMessage} register={register} background="#fff3dc" />
      {!bare && (
      <>
      <div className="brand">
        <b>Capy Preview</b>
        <span>rig v1 · 12 clips</span>
      </div>
      <div className="panel">
        <label>
          clip{" "}
          <select value={clip} onChange={(e) => play(e.target.value)}>
            {AVATAR_CLIPS.map((c) => (
              <option key={c} value={c}>
                {c}
                {available.length && !available.includes(c) ? " (fallback)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => handle.current?.send({ type: "speak", durationMs: 4000 })}>speak 4s</button>
        <button onClick={() => handle.current?.send({ type: "idle" })}>idle</button>
        <button onClick={() => handle.current?.send({ type: "lights_out" })}>lights out</button>
        {(["calm", "happy", "sad", "sleepy"] as Mood[]).map((m) => (
          <button key={m} onClick={() => handle.current?.send({ type: "mood", value: m })}>
            {m}
          </button>
        ))}
        {["hat-flower", "scarf-cozy", "nightcap"].map((id) => (
          <button key={id} onClick={() => handle.current?.send({ type: "skin", id })}>
            {id}
          </button>
        ))}
        <button onClick={() => handle.current?.send({ type: "skin" })}>no skin</button>
        <button onClick={() => handle.current?.send({ type: "viewport", top: 0.1, bottom: 0.55 })}>ui 55%</button>
        <button onClick={() => handle.current?.send({ type: "viewport", top: 0, bottom: 0 })}>ui 0%</button>
        <button onClick={() => handle.current?.send({ type: "look", x: 0.6, y: 0.2 })}>look →</button>
        <button onClick={() => handle.current?.send({ type: "look", x: 0, y: 0 })}>look center</button>
      </div>
      <div className="status">{log.join("\n")}</div>
      </>
      )}
    </>
  );
}

