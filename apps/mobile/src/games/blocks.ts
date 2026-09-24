import { pick, rng, seedFor, type Rand } from "./rng";

// Block Garden (the Block Blast / 1010! family). Drop pieces onto an 8×8 bed; a full row or column clears. Three
// pieces at a time, a new three when all are placed. Each level asks for a target score and then starts a fresh bed,
// so it has an end a young child can reach. The pieces grow with the level, and every new tray is dealt with at least
// one piece that fits, so a child is never handed a tray that is already lost.

export const SIZE = 8;
export type Cell = [number, number]; // [row, col]
export type Piece = { id: string; cells: Cell[]; color: number };
export type Board = (number | null)[][]; // color per cell

const SHAPES: { cells: Cell[]; from: number }[] = [
  { cells: [[0, 0]], from: 1 },
  { cells: [[0, 0], [0, 1]], from: 1 },
  { cells: [[0, 0], [1, 0]], from: 1 },
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], from: 1 },
  { cells: [[0, 0], [0, 1], [0, 2]], from: 1 },
  { cells: [[0, 0], [1, 0], [2, 0]], from: 1 },
  { cells: [[0, 0], [1, 0], [1, 1]], from: 2 },
  { cells: [[0, 1], [1, 0], [1, 1]], from: 2 },
  { cells: [[0, 0], [0, 1], [1, 1]], from: 3 },
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], from: 4 },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], from: 4 },
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], from: 5 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], from: 5 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], from: 6 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], from: 8 },
];

export const COLORS = 6;
export const target = (level: number) => 30 + level * 20;
export const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null));

export function fits(board: Board, piece: Piece, row: number, col: number): boolean {
  return piece.cells.every(([r, c]) => board[row + r]?.[col + c] === null);
}

export function fitsAnywhere(board: Board, piece: Piece): boolean {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (fits(board, piece, r, c)) return true;
  return false;
}

/** Place a piece and clear full lines. Score: one per block placed, ten per line, more for several at once. */
export function place(board: Board, piece: Piece, row: number, col: number): { board: Board; gained: number; cleared: number } {
  if (!fits(board, piece, row, col)) return { board, gained: 0, cleared: 0 };
  const next = board.map((r) => [...r]);
  for (const [r, c] of piece.cells) next[row + r]![col + c] = piece.color;
  const rows = next.map((r, i) => (r.every((v) => v !== null) ? i : -1)).filter((i) => i >= 0);
  const cols = Array.from({ length: SIZE }, (_, c) => c).filter((c) => next.every((r) => r[c] !== null));
  for (const r of rows) next[r] = Array(SIZE).fill(null);
  for (const c of cols) for (const r of next) r[c] = null;
  const cleared = rows.length + cols.length;
  return { board: next, gained: piece.cells.length + cleared * 10 * cleared, cleared };
}

/** A deal of three pieces for this level; `n` counts deals so a level's sequence is fixed but never repeats. */
export function deal(level: number, n: number, board: Board): Piece[] {
  const shapes = SHAPES.filter((s) => s.from <= level);
  for (let attempt = 0; attempt < 30; attempt++) {
    const r: Rand = rng(seedFor("blocks", level) + n * 97 + attempt);
    const pieces = [0, 1, 2].map((i) => ({ id: `${n}-${i}`, cells: pick(r, shapes).cells, color: Math.floor(r() * COLORS) }));
    if (pieces.some((p) => fitsAnywhere(board, p))) return pieces;
  }
  return [{ id: `${n}-0`, cells: [[0, 0]], color: 0 }, { id: `${n}-1`, cells: [[0, 0]], color: 1 }, { id: `${n}-2`, cells: [[0, 0]], color: 2 }];
}
