// Self-contained preview for the claude.ai Artifact sandbox: GLB embedded as base64, parsed in memory,
// no meshopt (no wasm), textures as data: URIs, TextureLoader forced (no fetch/blob).
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Preview } from "./PreviewUI";
import { CAPY_GLB_B64 } from "./generated/capy-glb-artifact";

(window as unknown as { createImageBitmap?: unknown }).createImageBitmap = undefined;

function decode(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function App() {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    new GLTFLoader().parse(decode(CAPY_GLB_B64), "", setGltf, (e) => setError(String(e)));
  }, []);
  if (error) return <pre style={{ padding: 16 }}>{error}</pre>;
  if (!gltf) return <div style={{ padding: 16, color: "#6b4a2b" }}>Loading Capy…</div>;
  return <Preview gltf={gltf} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
