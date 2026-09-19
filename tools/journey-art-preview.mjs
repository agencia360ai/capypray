import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const repo = path.resolve(import.meta.dirname, "..");
const routes = {
  "/art/": path.join(repo, "apps/mobile/assets/illustrations/journey"),
  "/avatar/": path.join(repo, "packages/avatar-web/dist-single"),
  "/viewer/": path.join(repo, "packages/avatar-web/dist"),
};
const types = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".js": "text/javascript", ".glb": "model/gltf-binary" };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch { res.writeHead(400).end(); return; }
  let file = pathname === "/" ? path.join(repo, "docs/art/journey-kit.html") : null;
  for (const [prefix, root] of Object.entries(routes)) {
    if (!pathname.startsWith(prefix)) continue;
    const candidate = path.resolve(root, pathname.slice(prefix.length));
    if (candidate.startsWith(root + path.sep)) file = candidate;
  }
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  if (req.method === "HEAD") res.end(); else fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.CAPY_ART_PORT || 8084), "127.0.0.1", function () {
  console.log("Journey art review: http://127.0.0.1:" + this.address().port);
});
