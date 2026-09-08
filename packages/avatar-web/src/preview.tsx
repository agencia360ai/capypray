import { StrictMode, useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapyScene, type CapyHandle } from "./CapyScene";
import type { Mood, WebToRN } from "./bridge";
import { AVATAR_CLIPS } from "./clips";

const GLB = new URL("./avatars/capy-v1.glb", window.location.href).toString();

function Preview() {
  const handle = useRef<CapyHandle | null>(null);
  const [available, setAvailable] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [clip, setClip] = useState<string>(new URLSearchParams(location.search).get("clip") ?? "idle_breathe");

  const onMessage = useCallback((m: WebToRN) => {
    setLog((l) => [JSON.stringify(m), ...l].slice(0, 6));
    if (m.type === "ready") {
      setAvailable(m.clips);
      const c = new URLSearchParams(location.search).get("clip");
      if (c) handle.current?.send({ type: "play", clip: c, loop: true });
      (window as unknown as { __capyReady: boolean }).__capyReady = true;
    }
  }, []);

  const register = useCallback((h: CapyHandle) => {
    handle.current = h;
  }, []);

  const play = (c: string) => {
    setClip(c);
    handle.current?.send({ type: "play", clip: c, loop: true });
  };

  return (
    <>
      <CapyScene glb={GLB} onMessage={onMessage} register={register} background="#fff3dc" />
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
        <button onClick={() => handle.current?.send({ type: "look", x: 0.6, y: 0.2 })}>look →</button>
        <button onClick={() => handle.current?.send({ type: "look", x: 0, y: 0 })}>look center</button>
      </div>
      <div className="status">{log.join("\n")}</div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
