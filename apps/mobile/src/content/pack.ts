import { validatePack, type Pack } from "@capy/content";
import rawPack from "@capy/content/packs/christian-us-en-v1/pack.json";

// v1: the pack is bundled. OTA packs by manifest (content_packs table) come in S3 (GDD §12.4).
let cached: Pack | null = null;

export function getPack(): Pack {
  if (cached) return cached;
  const { pack, issues } = validatePack(rawPack);
  if (!pack) throw new Error("bundled pack invalid: " + JSON.stringify(issues));
  if (issues.length && __DEV__) console.warn("pack issues", issues);
  cached = pack;
  return pack;
}
