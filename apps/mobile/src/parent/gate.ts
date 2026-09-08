// Parental gate (GDD §11): arithmetic question + 3 s hold. Required before paywall, settings, links, Parent Corner.
// Pure logic here so it is testable; the screen lives in app/parent/gate.tsx.

export type Challenge = { a: number; b: number; op: "+" | "×"; answer: number; options: number[] };

export const HOLD_MS = 3000;
const GATE_TTL_MS = 5 * 60 * 1000;

export function makeChallenge(rand: () => number = Math.random): Challenge {
  const op = rand() < 0.5 ? "+" : "×";
  const a = op === "+" ? 11 + Math.floor(rand() * 40) : 3 + Math.floor(rand() * 7);
  const b = op === "+" ? 12 + Math.floor(rand() * 40) : 4 + Math.floor(rand() * 8);
  const answer = op === "+" ? a + b : a * b;
  // three distinct wrong answers, no loop (a constant rand() must not hang)
  const offsets = [-7, -3, -1, 1, 2, 5, 10];
  const start = Math.floor(rand() * offsets.length) % offsets.length;
  const wrong = [0, 2, 4].map((k) => answer + offsets[(start + k) % offsets.length]!);
  const options = [answer, ...wrong].sort(() => rand() - 0.5);
  return { a, b, op, answer, options };
}

export function isCorrect(c: Challenge, pick: number) {
  return pick === c.answer;
}

// In-memory only: a passed gate is valid for a few minutes, never persisted.
let openUntil = 0;
export const gate = {
  open: (now = Date.now()) => {
    openUntil = now + GATE_TTL_MS;
  },
  close: () => {
    openUntil = 0;
  },
  isOpen: (now = Date.now()) => now < openUntil,
};
