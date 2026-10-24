import { describe, expect, it } from "vitest";
import { MINES, layMines, minesLeft, minesRound, neighbours, newMines, openCell, tickMines, toggleFlag, type Mines } from "./mines";

const first = () => 0;
/**
 * A 5 × 4 game already under way, with mines where the map has `*`
 * (row by row) — so a test says where they are.
 */
function laid(map: string[], patch: Partial<Mines> = {}): Mines {
  const cells = map.join("").split("");
  const cols = map[0].length;
  const rows = map.length;
  return { ...newMines(cols, rows, cells.filter((c) => c === "*").length), mines: cells.map((c) => c === "*"), phase: "running", ...patch };
}
const at = (game: Mines, c: number, r: number) => r * game.cols + c;
/*
 *   0 1 2 3 4
 * 0 . . . . .
 * 1 . . . . .
 * 2 . . . * .
 * 3 . . . . *
 */
const FIELD = [".....", ".....", "...*.", "....*"];

describe("Mines", () => {
  it("is 24 × 15 cells of 16 px with 45 mines — one cell in eight", () => {
    expect([MINES.cols, MINES.rows, MINES.cell, MINES.count]).toEqual([24, 15, 16, 45]);
    expect(MINES.count / (MINES.cols * MINES.rows)).toBeCloseTo(0.125, 3);
    const game = newMines();
    expect(game.mines).toBeNull();
    expect(game.phase).toBe("ready");
    expect(minesLeft(game)).toBe(45);
  });

  it("knows a cell's neighbours: three in a corner, five on an edge, eight inside", () => {
    const game = newMines(5, 4, 1);
    expect(neighbours(game, 0).sort((a, b) => a - b)).toEqual([1, 5, 6]);
    expect(neighbours(game, 2).length).toBe(5);
    expect(neighbours(game, at(game, 2, 1)).length).toBe(8);
    expect(neighbours(game, at(game, 4, 3)).sort((a, b) => a - b)).toEqual([13, 14, 18]);
  });

  it("lays the mines at the first cell opened — every one of them, and none on it or round it", () => {
    for (const r of [0, 0.3, 0.7, 0.999]) {
      const game = newMines();
      const start = at(game, 0, 0);
      const mines = layMines(game, start, () => r);
      expect(mines.filter(Boolean).length).toBe(45);
      expect([start, ...neighbours(game, start)].some((i) => mines[i])).toBe(false);
    }
    const middle = 7 * 24 + 12;
    const opened = openCell(newMines(), middle, Math.random).game;
    expect(opened.phase).toBe("running");
    expect(opened.open[middle]).toBe(true);
    // Its neighbours have no mine, so they open too: a patch to start from.
    expect(neighbours(opened, middle).every((i) => opened.open[i])).toBe(true);
  });

  it("opens a cell with mines round it alone, and counts them", () => {
    const game = laid(FIELD);
    const { game: next, sound } = openCell(game, at(game, 3, 3), first);
    expect(next.open.filter(Boolean).length).toBe(1);
    expect(minesRound(next, at(game, 3, 3))).toBe(2);
    expect(sound).toBe("open");
  });

  it("opens a cell with no mine round it, and its neighbours, out to the cells that have", () => {
    const game = laid(FIELD);
    const next = openCell(game, at(game, 0, 0), first).game;
    // Everything but the two mines and the two numbers no empty cell touches: (4, 2) and (3, 3).
    const shut = next.open.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
    expect(shut.sort((a, b) => a - b)).toEqual([at(game, 3, 2), at(game, 4, 2), at(game, 3, 3), at(game, 4, 3)].sort((a, b) => a - b));
    expect(next.phase).toBe("running");
  });

  it("ends the game on a mine: it shows where they all were, and which one went off", () => {
    const game = laid(FIELD);
    const { game: over, sound } = openCell(game, at(game, 3, 2), first);
    expect(over.phase).toBe("over");
    expect(over.exploded).toBe(at(game, 3, 2));
    expect(over.open[at(game, 4, 3)]).toBe(true);
    expect(sound).toBe("boom");
    expect(openCell(over, 0, first).game).toBe(over);
  });

  it("flags with a ⌘- or Option-click, and a flagged cell does not open", () => {
    const game = laid(FIELD);
    const { game: flagged, sound } = toggleFlag(game, at(game, 3, 2));
    expect(flagged.flags[at(game, 3, 2)]).toBe(true);
    expect(minesLeft(flagged)).toBe(1);
    expect(sound).toBe("flag");
    expect(openCell(flagged, at(game, 3, 2), first).game).toBe(flagged);
    expect(toggleFlag(flagged, at(game, 3, 2)).game.flags[at(game, 3, 2)]).toBe(false);
    // Not on an open cell.
    const open = openCell(game, at(game, 3, 3), first).game;
    expect(toggleFlag(open, at(game, 3, 3)).game).toBe(open);
  });

  it("opens the rest round an open number once its flags are placed (a chord), and not before", () => {
    const game = openCell(laid(FIELD), at(game0(), 3, 3), first).game;
    const number = at(game, 3, 3);
    expect(openCell(game, number, first).game).toBe(game);
    const one = toggleFlag(game, at(game, 3, 2)).game;
    expect(openCell(one, number, first).game).toBe(one);
    const both = toggleFlag(one, at(game, 4, 3)).game;
    const chord = openCell(both, number, first).game;
    for (const i of [at(game, 2, 2), at(game, 4, 2), at(game, 2, 3)]) expect(chord.open[i]).toBe(true);
    expect(chord.phase).not.toBe("over");
  });

  it("ends the game for a chord round a wrong flag", () => {
    const game = openCell(laid(FIELD), at(game0(), 3, 3), first).game;
    const wrong = toggleFlag(toggleFlag(game, at(game, 3, 2)).game, at(game, 2, 2)).game;
    const chord = openCell(wrong, at(game, 3, 3), first);
    expect(chord.game.phase).toBe("over");
    expect(chord.sound).toBe("boom");
  });

  it("is won when every cell without a mine is open, the mines flagged", () => {
    const game = laid(["..*"]);
    const { game: won, sound } = openCell(game, 0, first);
    expect(won.phase).toBe("won");
    expect(won.flags[2]).toBe(true);
    expect(minesLeft(won)).toBe(0);
    expect(sound).toBe("win");
  });

  it("counts whole seconds while it runs, changing only on a new second", () => {
    const game = laid(FIELD);
    expect(tickMines(game, 0.9)).toBe(game);
    const one = tickMines(game, 1.2);
    expect(one.seconds).toBe(1);
    expect(tickMines(one, 1.9)).toBe(one);
    const ready = newMines();
    expect(tickMines(ready, 5)).toBe(ready);
    const over = { ...game, phase: "over" as const };
    expect(tickMines(over, 5)).toBe(over);
  });
});

function game0(): Mines {
  return laid(FIELD);
}
