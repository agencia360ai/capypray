import { rng, seedFor, shuffle } from "./rng";

// Memory Pond: find the pairs. Three pairs to start, one more each level up to ten; after that the level keeps
// counting and the deck keeps shuffling. There is no losing — a flip that misses just turns back over.

export const memoryPairs = (level: number) => Math.min(10, 2 + level);

export type Card = { id: number; kind: number };

export function memoryLevel(level: number, kinds: number): Card[] {
  const pairs = memoryPairs(level);
  const r = rng(seedFor("memory", level));
  const chosen = shuffle(r, Array.from({ length: kinds }, (_, i) => i)).slice(0, Math.min(pairs, kinds));
  return shuffle(r, chosen.flatMap((kind, i) => [{ id: i * 2, kind }, { id: i * 2 + 1, kind }]));
}

/** Columns for a deck that stays readable on a phone: never more than four across. */
export const memoryCols = (cards: number) => (cards <= 6 ? 3 : 4);
