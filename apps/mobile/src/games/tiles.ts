import { rng, seedFor, shuffle } from "./rng";

// Triple Tiles (the Tile Explorer / Match Factory family). Tap a tile that nothing covers and it drops into the
// tray; three of a kind in the tray vanish; seven different tiles in the tray and the round is lost.
//
// Built backwards so it is always winnable: the board is laid one triple at a time, each tile on top of whatever it
// overlaps. Taking the triples off in the reverse order never leaves more than three tiles in the tray, so a
// careful child can always finish — and a hasty one can still fill the tray, which is the game.

export const TRAY = 7;
export const COLS = 6;
export const ROWS = 7;
export type Tile = { id: number; kind: number; x: number; y: number; z: number };

/** Level n: three kinds to start, more kinds, more copies and more layers as it goes. */
export function tilesShape(level: number) {
  const kinds = Math.min(10, 3 + Math.floor((level - 1) / 2));
  const copies = level < 4 ? 1 : level < 10 ? 2 : 3; // triples per kind
  return { kinds, copies };
}

const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;

export function tilesLevel(level: number): Tile[] {
  const { kinds, copies } = tilesShape(level);
  const r = rng(seedFor("tiles", level));
  const triples = shuffle(r, Array.from({ length: kinds * copies }, (_, i) => i % kinds));
  const tiles: Tile[] = [];
  // half-step positions give the layered look; early levels stay on the whole grid so nothing hides
  const step = level < 3 ? 1 : 0.5;
  const spots: { x: number; y: number }[] = [];
  for (let y = 0; y <= ROWS - 1; y += step) for (let x = 0; x <= COLS - 1; x += step) spots.push({ x, y });
  let id = 0;
  for (const kind of triples) {
    for (let k = 0; k < 3; k++) {
      const free = level < 3 ? spots.filter((s) => !tiles.some((t) => t.x === s.x && t.y === s.y)) : spots;
      const s = free[Math.floor(r() * free.length)] ?? spots[0]!;
      const z = 1 + Math.max(0, ...tiles.filter((t) => overlaps(t, s)).map((t) => t.z));
      tiles.push({ id: id++, kind, x: s.x, y: s.y, z });
    }
  }
  return tiles;
}

/** A tile is playable when no tile above it overlaps it. */
export const isFree = (tile: Tile, board: Tile[]) => !board.some((o) => o.id !== tile.id && o.z > tile.z && overlaps(o, tile));

/** Put a tile in the tray (next to its kind), clear any three of a kind. */
export function take(board: Tile[], tray: number[], tile: Tile): { board: Tile[]; tray: number[]; matched: boolean } {
  if (!isFree(tile, board) || tray.length >= TRAY) return { board, tray, matched: false };
  const next = board.filter((t) => t.id !== tile.id);
  const at = tray.lastIndexOf(tile.kind);
  const withTile = at < 0 ? [...tray, tile.kind] : [...tray.slice(0, at + 1), tile.kind, ...tray.slice(at + 1)];
  const matched = withTile.filter((k) => k === tile.kind).length >= 3;
  return { board: next, tray: matched ? withTile.filter((k) => k !== tile.kind) : withTile, matched };
}

export const tilesLost = (tray: number[]) => tray.length >= TRAY;
export const tilesWon = (board: Tile[], tray: number[]) => !board.length && !tray.length;
