// Copies dist/ into apps/mobile/assets/avatar so the WebView loads it offline (GDD §12.2).
import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "../dist-single");
const dest = resolve(import.meta.dirname, "../../../apps/mobile/assets/avatar");
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
await cp(resolve(src, "embedded.html"), resolve(dest, "index.html"));
console.log("avatar bundle →", dest);
