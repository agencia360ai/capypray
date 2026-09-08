import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Preview } from "./PreviewUI";

const GLB = new URL("./avatars/capy-v1.glb", window.location.href).toString();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview glb={GLB} />
  </StrictMode>,
);
