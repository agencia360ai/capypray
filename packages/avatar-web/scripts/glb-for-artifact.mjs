// Builds an artifact-safe GLB: no meshopt/draco (no wasm), images as data: URIs (no blob: URLs).
// usage: node scripts/glb-for-artifact.mjs <in.glb> <out.glb>
import { readFileSync, writeFileSync } from "node:fs";

const [inp, out] = process.argv.slice(2);
const buf = readFileSync(inp);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
let off = 12;
let json, bin;
while (off < buf.length) {
  const len = dv.getUint32(off, true);
  const type = dv.getUint32(off + 4, true);
  const chunk = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(chunk.toString("utf8"));
  else if (type === 0x004e4942) bin = chunk;
  off += 8 + len;
}
for (const img of json.images ?? []) {
  if (img.bufferView === undefined) continue;
  const bv = json.bufferViews[img.bufferView];
  const bytes = bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
  img.uri = `data:${img.mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
  delete img.bufferView;
  delete img.mimeType;
}
let jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
const pad = (b, fill) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4), fill)]) : b);
jsonBuf = pad(jsonBuf, 0x20);
const binBuf = pad(bin, 0);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length, 0); bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(out, Buffer.concat([header, jh, jsonBuf, bh, binBuf]));
console.log("wrote", out, (12 + 16 + jsonBuf.length + binBuf.length) / 1e6, "MB", "images:", json.images?.length);
