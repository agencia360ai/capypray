import { rng, seedFor, shuffle } from "./rng";

// Color Sort (the water-sort / ball-sort family). Jars hold up to CAP units; a pour moves the whole run of the top
// color into another jar that is empty or shows the same color on top, as far as it has room. Endless: level n is
// generated from its seed, and only a board the solver can finish is ever handed out.

export const CAP = 4;
export type Jar = number[]; // bottom → top, color indexes
export type SortLevel = { jars: Jar[]; colors: number };

/** How big level n is: two colors to start, one more every three levels, up to seven. */
export function sortShape(level: number) {
  const colors = Math.min(7, 2 + Math.floor((level - 1) / 3));
  return { colors, empty: colors <= 3 ? 1 : 2 };
}

const top = (j: Jar) => j[j.length - 1];

/** How many units a pour from `from` into `to` would move (0 = not allowed). */
export function pourable(jars: Jar[], from: number, to: number): number {
  const a = jars[from], b = jars[to];
  if (!a || !b || from === to || !a.length || b.length >= CAP) return 0;
  if (b.length && top(b) !== top(a)) return 0;
  let run = 1;
  while (run < a.length && a[a.length - 1 - run] === top(a)) run++;
  return Math.min(run, CAP - b.length);
}

export function pour(jars: Jar[], from: number, to: number): Jar[] {
  const n = pourable(jars, from, to);
  if (!n) return jars;
  const next = jars.map((j) => [...j]);
  next[to]!.push(...next[from]!.splice(next[from]!.length - n, n));
  return next;
}

export const isSorted = (jars: Jar[]) => jars.every((j) => !j.length || (j.length === CAP && j.every((c) => c === j[0])));

/** Depth-first search over canonical states, capped; `true` only when it actually reaches a sorted board. */
export function solvable(jars: Jar[], cap = 40000): boolean {
  const seen = new Set<string>();
  const key = (s: Jar[]) => s.map((j) => j.join(",")).sort().join("|");
  const stack: Jar[][] = [jars];
  while (stack.length && seen.size < cap) {
    const s = stack.pop()!;
    const k = key(s);
    if (seen.has(k)) continue;
    seen.add(k);
    if (isSorted(s)) return true;
    for (let a = 0; a < s.length; a++) {
      for (let b = 0; b < s.length; b++) {
        if (!pourable(s, a, b)) continue;
        if (!s[b]!.length && new Set(s[a]).size === 1) continue; // moving a single-color jar into an empty one changes nothing
        stack.push(pour(s, a, b));
      }
    }
  }
  return false;
}

export function sortLevel(level: number): SortLevel {
  const { colors, empty } = sortShape(level);
  for (let attempt = 0; attempt < 50; attempt++) {
    const r = rng(seedFor("sort", level) + attempt);
    const units = shuffle(r, Array.from({ length: colors * CAP }, (_, i) => i % colors));
    const jars: Jar[] = Array.from({ length: colors }, (_, i) => units.slice(i * CAP, (i + 1) * CAP));
    for (let i = 0; i < empty; i++) jars.push([]);
    if (jars.some((j) => j.length === CAP && new Set(j).size === 1)) continue; // no jar may start already done
    if (solvable(jars)) return { jars, colors };
  }
  // unreachable in practice; a sorted board rotated one jar is still a fair, trivial level
  const jars: Jar[] = Array.from({ length: colors }, (_, c) => Array(CAP).fill(c));
  jars.push([]);
  return { jars, colors };
}
