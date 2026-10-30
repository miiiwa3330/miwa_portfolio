/**
 * Snake, the first of the Macintosh's games (2026-10-23, the user): a snake
 * on a grid of cells that goes one cell a tick the way it heads, turned by
 * the keys, growing by one for each piece of food it eats, and over when it
 * runs into the wall or itself. Pure: the board is drawn by
 * `objects/macScreen.ts`, the ticks counted and the keys read by
 * `mac/finder.ts`.
 *
 * - **Turns queue**, up to `SNAKE.queue`: two keys pressed inside one tick
 *   (a quick turn round a corner) both count, one a tick. A turn the way it
 *   already heads, or straight back (into its own neck), is no turn.
 * - **It waits to start** (`ready`) until a key: any of the four starts it,
 *   turning it too unless that is straight back.
 * - **The cell the tail is leaving is free** to move into, unless the snake
 *   is growing (the tail stays then).
 * - Where the food goes is the caller's chance (`rng`, 0–1), so a test can
 *   say where; there is always an empty cell for it until the board is full,
 *   which is a win.
 */

export type Heading = "up" | "down" | "left" | "right";
/** A cell: column from the left, row from the top. */
export type Cell = readonly [number, number];
export type SnakePhase = "ready" | "running" | "over" | "won";

export type Snake = {
  readonly cols: number;
  readonly rows: number;
  /** Head first. */
  readonly body: readonly Cell[];
  readonly heading: Heading;
  /** Turns asked for and not yet taken, oldest first. */
  readonly turns: readonly Heading[];
  readonly food: Cell | null;
  /** Ticks left in which the tail stays put. */
  readonly growing: number;
  readonly score: number;
  readonly phase: SnakePhase;
};

/**
 * The board, 48 × 30 cells of 8 px (384 × 240 of the Mac's 512 × 342); the
 * snake 4 long at the start; a tick 0.12 s (8 cells a second), one more cell
 * for each piece of food; at most two turns waiting. **仮**: the speed and
 * the board's size.
 */
export const SNAKE = { cols: 48, rows: 30, length: 4, tick: 0.12, grow: 1, queue: 2 } as const;

const STEP: Record<Heading, Cell> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const BACK: Record<Heading, Heading> = { up: "down", down: "up", left: "right", right: "left" };

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

/** An empty cell for the food, picked by `rng` (0–1) from the empty ones in reading order; none on a full board. */
export function placeFood(body: readonly Cell[], cols: number, rows: number, rng: () => number): Cell | null {
  const taken = new Set(body.map(([c, r]) => r * cols + c));
  const free: Cell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!taken.has(r * cols + c)) free.push([c, r]);
  if (!free.length) return null;
  return free[Math.min(free.length - 1, Math.floor(rng() * free.length))];
}

/** A new game, waiting for a key: the snake in the middle of the board, heading right, its tail to the left. */
export function newSnake(rng: () => number, cols: number = SNAKE.cols, rows: number = SNAKE.rows): Snake {
  const head: Cell = [Math.floor(cols / 2), Math.floor(rows / 2)];
  const body: Cell[] = Array.from({ length: SNAKE.length }, (_, i) => [head[0] - i, head[1]] as const);
  return { cols, rows, body, heading: "right", turns: [], food: placeFood(body, cols, rows, rng), growing: 0, score: 0, phase: "ready" };
}

/** Ask the snake to turn: a key. Starts a waiting game; does nothing once it is over. */
export function steerSnake(game: Snake, heading: Heading): Snake {
  if (game.phase === "over" || game.phase === "won") return game;
  const started: Snake = game.phase === "ready" ? { ...game, phase: "running" } : game;
  const last = game.turns.length ? game.turns[game.turns.length - 1] : game.heading;
  if (heading === last || heading === BACK[last] || game.turns.length >= SNAKE.queue) return started;
  return { ...started, turns: [...game.turns, heading] };
}

/** One tick: the snake moves a cell, eats, grows, or dies. Only while it runs. */
export function stepSnake(game: Snake, rng: () => number): Snake {
  if (game.phase !== "running") return game;
  const [turn, ...turns] = game.turns;
  const heading = turn ?? game.heading;
  const [dc, dr] = STEP[heading];
  const head: Cell = [game.body[0][0] + dc, game.body[0][1] + dr];
  const moved = { ...game, heading, turns };
  if (head[0] < 0 || head[1] < 0 || head[0] >= game.cols || head[1] >= game.rows) return { ...moved, phase: "over" };
  // The tail moves off its cell this tick unless the snake is growing.
  const staying = game.growing > 0 ? game.body : game.body.slice(0, -1);
  if (staying.some((cell) => same(cell, head))) return { ...moved, phase: "over" };
  const ate = !!game.food && same(game.food, head);
  const growing = game.growing + (ate ? SNAKE.grow : 0);
  const body = growing > 0 ? [head, ...game.body] : [head, ...staying];
  const score = game.score + (ate ? 1 : 0);
  const next = { ...moved, body, growing: Math.max(0, growing - 1), score };
  if (!ate) return next;
  const food = placeFood(body, game.cols, game.rows, rng);
  return food ? { ...next, food } : { ...next, food, phase: "won" };
}
