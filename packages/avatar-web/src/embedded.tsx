// Mobile WebView entry: the GLB is embedded as base64 so nothing is fetched from file:// (iOS WKWebView blocks it).
import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CapyScene, type CapyHandle } from "./CapyScene";
import { onRNMessage, sendToRN, type RNToWeb } from "./bridge";
import { CAPY_GLB_B64 } from "./generated/capy-glb-mobile";

function decode(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function App() {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const handle = useRef<CapyHandle | null>(null);
  const queue = useRef<RNToWeb[]>([]);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.parse(decode(CAPY_GLB_B64), "", setGltf, (e) => sendToRN({ type: "error", message: String(e) }));
  }, []);

  const register = useCallback((h: CapyHandle) => {
    handle.current = h;
    for (const m of queue.current.splice(0)) h.send(m);
  }, []);

  useState(() =>
    onRNMessage((m) => {
      if (m.type === "load") return; // skins arrive as a re-mount in a later version
      if (handle.current) handle.current.send(m);
      else queue.current.push(m);
    }),
  );

  if (!gltf) return null;
  return <CapyScene gltf={gltf} onMessage={sendToRN} register={register} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
