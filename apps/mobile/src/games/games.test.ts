import { describe, expect, it } from "vitest";
import { CAP, hasMove, isSorted, pour, pourable, solvable, sortLevel, sortShape } from "./sort";
import { SIZE, deal, emptyBoard, fits, fitsAnywhere, place, target } from "./blocks";
import { TRAY, isFree, take, tilesLevel, tilesLost, tilesShape, tilesWon, type Tile } from "./tiles";
import { memoryLevel, memoryPairs } from "./memory";

describe("Color Sort", () => {
  it("recognizes a blocked board and keeps history snapshots immutable", () => {
    expect(hasMove([[0, 1, 0, 1], [1, 0, 1, 0]])).toBe(false);
    const start = [[0, 1], [1], []];
    const next = pour(start, 0, 1);
    expect(start).toEqual([[0, 1], [1], []]);
    expect(next).toEqual([[0], [1, 1], []]);
  });
  it("grows from two colors to seven", () => {
    expect(sortShape(1)).toEqual({ colors: 2, empty: 2 });
    expect(sortShape(10).colors).toBe(5);
    expect(sortShape(500).colors).toBe(7);
  });
  it("hands out only boards the solver can finish, the same board every time", () => {
    for (const level of Array.from({ length: 100 }, (_, i) => i + 1)) {
      const a = sortLevel(level), b = sortLevel(level);
      expect(a).toEqual(b);
      expect(isSorted(a.jars)).toBe(false);
      expect(hasMove(a.jars)).toBe(true);
      expect(solvable(a.jars)).toBe(true);
      expect(a.jars.flat()).toHaveLength(a.colors * CAP);
    }
  });
  it("pours the whole top run, only onto the same color or an empty jar, only as far as there is room", () => {
    const jars = [[0, 1, 1], [1], [0], []];
    expect(pourable(jars, 0, 1)).toBe(2);
    expect(pourable(jars, 0, 2)).toBe(0);
    expect(pourable(jars, 0, 3)).toBe(2);
    expect(pour(jars, 0, 1)).toEqual([[0], [1, 1, 1], [0], []]);
    expect(pourable([[1, 1, 1, 1], [1]], 0, 1)).toBe(3);
  });
});

describe("Block Garden", () => {
  it("clears a full row and scores it", () => {
    let board = emptyBoard();
    for (let c = 0; c < SIZE - 1; c++) board[0]![c] = 0;
    const r = place(board, { id: "a", cells: [[0, 0]], color: 1 }, 0, SIZE - 1);
    expect(r.cleared).toBe(1);
    expect(r.board[0]!.every((v) => v === null)).toBe(true);
    expect(r.gained).toBe(11);
    board = r.board;
    expect(fits(board, { id: "b", cells: [[0, 0], [0, 1]], color: 0 }, 0, SIZE - 1)).toBe(false);
  });
  it("deals at least one piece that fits, and only small pieces on level one", () => {
    const board = emptyBoard();
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!(r === 3 && c === 3)) board[r]![c] = 0;
    const pieces = deal(1, 5, board);
    expect(pieces.some((p) => fitsAnywhere(board, p))).toBe(true);
    expect(deal(1, 0, emptyBoard()).every((p) => p.cells.length <= 4)).toBe(true);
    expect(target(1)).toBeLessThan(target(2));
  });
});

describe("Triple Tiles", () => {
  const play = (tiles: Tile[]) => {
    // take triples in the reverse of how they were laid: the construction guarantees this always works
    let board = tiles, tray: number[] = [];
    for (const t of [...tiles].sort((a, b) => b.id - a.id)) {
      const tile = board.find((x) => x.id === t.id)!;
      expect(isFree(tile, board)).toBe(true);
      ({ board, tray } = take(board, tray, tile));
      expect(tray.length).toBeLessThan(TRAY);
    }
    return { board, tray };
  };
  it("is always winnable, at every size", () => {
    for (const level of [1, 3, 6, 12, 25]) {
      const tiles = tilesLevel(level);
      const { kinds, copies } = tilesShape(level);
      expect(tiles).toHaveLength(kinds * copies * 3);
      const { board, tray } = play(tiles);
      expect(tilesWon(board, tray)).toBe(true);
    }
  });
  it("covers tiles on the later levels, and loses with seven odd tiles in the tray", () => {
    expect(tilesLevel(8).some((t, _, all) => !isFree(t, all))).toBe(true);
    expect(tilesLost([0, 1, 2, 3, 4, 5, 6])).toBe(true);
    const r = take([{ id: 1, kind: 2, x: 0, y: 0, z: 1 }], [2, 2], { id: 1, kind: 2, x: 0, y: 0, z: 1 });
    expect(r).toMatchObject({ matched: true, tray: [], board: [] });
  });
});

describe("Memory Pond", () => {
  it("deals pairs, more each level up to ten", () => {
    expect(memoryPairs(1)).toBe(3);
    expect(memoryPairs(50)).toBe(10);
    const deck = memoryLevel(4, 12);
    expect(deck).toHaveLength(12);
    const counts = new Map<number, number>();
    for (const c of deck) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
    expect(memoryLevel(4, 12)).toEqual(deck);
  });
});
