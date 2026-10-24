/**
 * Mines, the Macintosh's third game (2026-10-25): a field of covered cells,
 * some over a mine; opening one shows how many of its eight neighbours hide
 * a mine, and opening a mine ends the game. Pure: cells by index, row by row
 * from the top left. Drawn by `objects/macScreen.ts`, driven by `finder.ts`.
 *
 * - **The first cell opened is never a mine, nor any of its neighbours**: the
 *   mines are laid then (by the caller's chance, `rng`), round it — so the
 *   first click always opens a patch to start from.
 * - **A cell with no mine round it opens its neighbours**, and so on out to
 *   the cells that have.
 * - **Flagging is ⌘- or Option-click** (`finder.ts`): the M0100 has one
 *   button. A flagged cell is not opened by a click.
 * - **Clicking an open number whose flags are all placed opens the rest of
 *   its neighbours** (a "chord") — which ends the game if a flag was wrong.
 * - Won when every cell without a mine is open: the mines left are flagged.
 */

export type MinesPhase = "ready" | "running" | "over" | "won";
export type MinesSound = "open" | "flag" | "boom" | "win";

export type Mines = {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  /** Where the mines are: none laid until the first cell is opened. */
  readonly mines: readonly boolean[] | null;
  readonly open: readonly boolean[];
  readonly flags: readonly boolean[];
  /** The mine that was opened, once the game is over. */
  readonly exploded: number | null;
  /** Whole seconds since the first cell was opened (the game's clock, `finder.ts`). */
  readonly seconds: number;
  readonly phase: MinesPhase;
};

/**
 * The field is the game window's, 384 × 240 px: 24 × 15 cells of 16 px, and
 * 45 mines — one cell in eight, about the density of the classic game's
 * smallest board (10 in 81). **仮**: the count.
 */
export const MINES = { cols: 24, rows: 15, cell: 16, count: 45 } as const;

export function newMines(cols: number = MINES.cols, rows: number = MINES.rows, count: number = MINES.count): Mines {
  const n = cols * rows;
  return { cols, rows, count, mines: null, open: Array(n).fill(false), flags: Array(n).fill(false), exploded: null, seconds: 0, phase: "ready" };
}

/** A cell's neighbours (up to eight), by index. */
export function neighbours(game: Pick<Mines, "cols" | "rows">, i: number): number[] {
  const c = i % game.cols;
  const r = Math.floor(i / game.cols);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const cc = c + dc;
      const rr = r + dr;
      if (cc >= 0 && rr >= 0 && cc < game.cols && rr < game.rows) out.push(rr * game.cols + cc);
    }
  return out;
}

/** How many mines are round a cell. */
export function minesRound(game: Mines, i: number): number {
  return game.mines ? neighbours(game, i).filter((j) => game.mines![j]).length : 0;
}

/** The mines less the flags placed: what the counter shows. */
export function minesLeft(game: Mines): number {
  return game.count - game.flags.filter(Boolean).length;
}

/** Lay the mines, by the caller's chance, anywhere but the cell `safe` and its neighbours. */
export function layMines(game: Mines, safe: number, rng: () => number): boolean[] {
  const keep = new Set([safe, ...neighbours(game, safe)]);
  const free: number[] = [];
  for (let i = 0; i < game.cols * game.rows; i++) if (!keep.has(i)) free.push(i);
  const mines: boolean[] = Array(game.cols * game.rows).fill(false);
  // A partial shuffle: the first `count` of the free cells, each picked from those left.
  for (let k = 0; k < Math.min(game.count, free.length); k++) {
    const j = k + Math.min(free.length - k - 1, Math.floor(rng() * (free.length - k)));
    [free[k], free[j]] = [free[j], free[k]];
    mines[free[k]] = true;
  }
  return mines;
}

/** Open cells from `start`: a cell with no mine round it opens its neighbours too. */
function flood(game: Mines, mines: readonly boolean[], open: boolean[], start: number[]) {
  const seen = { ...game, mines };
  const queue = [...start];
  while (queue.length) {
    const i = queue.pop()!;
    if (open[i] || game.flags[i]) continue;
    open[i] = true;
    if (minesRound(seen, i) === 0) for (const j of neighbours(game, i)) if (!open[j]) queue.push(j);
  }
}

/** Whether every cell without a mine is open. */
function cleared(mines: readonly boolean[], open: readonly boolean[]): boolean {
  return mines.every((m, i) => m || open[i]);
}

/** A click on a cell. With the sound it made, if any. */
export function openCell(game: Mines, i: number, rng: () => number): { game: Mines; sound: MinesSound | null } {
  if (game.phase === "over" || game.phase === "won" || game.flags[i]) return { game, sound: null };
  const mines = game.mines ?? layMines(game, i, rng);
  const started: Mines = game.mines ? game : { ...game, mines, phase: "running" };
  let targets = [i];
  if (game.open[i]) {
    // A chord: an open number with its flags all placed opens the rest round it.
    const round = neighbours(game, i);
    if (minesRound(started, i) === 0 || round.filter((j) => game.flags[j]).length !== minesRound(started, i)) return { game, sound: null };
    targets = round.filter((j) => !game.open[j] && !game.flags[j]);
    if (!targets.length) return { game, sound: null };
  }
  const hit = targets.find((j) => mines[j]);
  if (hit !== undefined) {
    const open = game.open.map((o, j) => o || (mines[j] && !game.flags[j]));
    return { game: { ...started, open, exploded: hit, phase: "over" }, sound: "boom" };
  }
  const open = [...game.open];
  flood(game, mines, open, targets);
  if (cleared(mines, open)) return { game: { ...started, open, flags: [...mines], phase: "won" }, sound: "win" };
  return { game: { ...started, open }, sound: "open" };
}

/** ⌘- or Option-click on a cell: a flag on it, or off. Not on an open cell, nor once the game is over. */
export function toggleFlag(game: Mines, i: number): { game: Mines; sound: MinesSound | null } {
  if (game.phase === "over" || game.phase === "won" || game.open[i]) return { game, sound: null };
  const flags = [...game.flags];
  flags[i] = !flags[i];
  return { game: { ...game, flags }, sound: "flag" };
}

/** The clock, in whole seconds since the first cell: changed only when it reads another second. */
export function tickMines(game: Mines, seconds: number): Mines {
  const s = Math.floor(seconds);
  return game.phase !== "running" || s === game.seconds ? game : { ...game, seconds: s };
}
