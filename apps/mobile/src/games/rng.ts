/** Seeded PRNG (mulberry32): level n is always the same board, on every device, with no level files to ship. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = ReturnType<typeof rng>;

export const pick = <T,>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]!;

export function shuffle<T>(r: Rand, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** One seed per game and level, so the four games never share boards. */
export const seedFor = (game: string, level: number) => [...game].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) ^ Math.imul(level, 2654435761);
