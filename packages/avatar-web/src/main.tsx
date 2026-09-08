import { StrictMode, useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CapyScene, type CapyHandle } from "./CapyScene";
import { onRNMessage, sendToRN, type RNToWeb } from "./bridge";

const DEFAULT_GLB = new URL("./avatars/capy-v1.glb", window.location.href).toString();

function App() {
  const [glb, setGlb] = useState(DEFAULT_GLB);
  const handle = useRef<CapyHandle | null>(null);
  const queue = useRef<RNToWeb[]>([]);

  const register = useCallback((h: CapyHandle) => {
    handle.current = h;
    for (const m of queue.current.splice(0)) h.send(m);
  }, []);

  useState(() =>
    onRNMessage((m) => {
      if (m.type === "load") {
        setGlb(m.glb.startsWith("http") || m.glb.startsWith("file:") ? m.glb : new URL(m.glb, window.location.href).toString());
        return;
      }
      if (handle.current) handle.current.send(m);
      else queue.current.push(m);
    }),
  );

  return <CapyScene key={glb} glb={glb} onMessage={sendToRN} register={register} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
