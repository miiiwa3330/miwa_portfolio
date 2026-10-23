import { SNAKE, newSnake, steerSnake, stepSnake, type Heading, type Snake } from "./snake";

/**
 * What the Macintosh runs (2026-10-23, the user): its desktop, on its
 * 512 × 342 screen — the menu bar, the disk, the "Games" window with its
 * three icons — and the game opened from it. Pure: the places of things in
 * the screen's px, and how a press of the mouse's button, a key and the
 * passing time change what is on the screen. Drawn by
 * `objects/macScreen.ts`; driven by `objects/Macintosh.tsx`, which sends it
 * the Mac's mouse's presses (`macPointer`) and the reader's keys.
 *
 * - **A game opens as the Mac's icons do**: a press selects an icon, a second
 *   press on it soon after (`DOUBLE_CLICK`) opens it. Only Snake is here so
 *   far; Breakout and Mines are only selected.
 * - **It opens only while the reader sits at the desk**: the Mac's mouse can
 *   be pressed standing, within reach, but the game is played with the keys,
 *   which the reader's keyboard sends only to a seated reader — and opening
 *   it is what zooms the view to the Mac's screen (`Scene`).
 * - **It closes with its window's close box, or Esc** (the user's choice).
 *   While it is open the rest of the desktop is not pressed.
 * - **The keys are W A S D** — the M0110 has no arrows — **and the reader's
 *   arrows stand for them** (the user's choice: 「WASD＋矢印キー」), pressing
 *   down the same keys on the M0110 (`gameCode`). Space or Return starts a
 *   game again once one is over.
 */

export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export type MacIcon = "disk" | "snake" | "breakout" | "mines";
export type Point = { readonly x: number; readonly y: number };

export const MAC_SCREEN_PX = { width: 512, height: 342 } as const;
/** The menu bar's height, its line under it included. */
export const MENU_BAR = 20;
/** An icon's picture (its label goes under it). */
export const ICON = { w: 32, h: 26 } as const;
/** The "Games" window, where the desktop shows it. */
export const GAMES_WINDOW: Box = { x: 70, y: 52, w: 340, h: 200 };
/** A window's title bar, and the close box at its left (as the Mac's: 11 px square, 8 px in). */
export const TITLE_BAR = 19;
export const CLOSE_BOX = { inset: 8, size: 11 } as const;

/** Where each icon's picture is (its top left), in the screen's px. */
export const ICONS: Record<MacIcon, Point> = {
  disk: { x: 462, y: 34 },
  snake: { x: GAMES_WINDOW.x + 40, y: GAMES_WINDOW.y + 60 },
  breakout: { x: GAMES_WINDOW.x + 140, y: GAMES_WINDOW.y + 60 },
  mines: { x: GAMES_WINDOW.x + 240, y: GAMES_WINDOW.y + 60 },
};
export const ICON_LABELS: Record<MacIcon, string> = { disk: "Miiiwa", snake: "Snake", breakout: "Breakout", mines: "Mines" };
/** The icons a press opens; the rest are only selected. */
const OPENS: Partial<Record<MacIcon, "snake">> = { snake: "snake" };

/** The cells' size, and the Snake window: a title bar, a line of score, then the board (`SNAKE`), each with a line under it. */
export const CELL = 8;
const STATUS = 16;
const BOARD_W = SNAKE.cols * CELL;
const BOARD_H = SNAKE.rows * CELL;
const WINDOW_W = BOARD_W + 2;
const WINDOW_H = TITLE_BAR + 1 + STATUS + 1 + BOARD_H + 1;
export const SNAKE_WINDOW: Box = { x: Math.round((MAC_SCREEN_PX.width - WINDOW_W) / 2), y: MENU_BAR + 14, w: WINDOW_W, h: WINDOW_H };
export const SNAKE_STATUS: Box = { x: SNAKE_WINDOW.x + 1, y: SNAKE_WINDOW.y + TITLE_BAR + 1, w: BOARD_W, h: STATUS };
export const SNAKE_BOARD: Box = { x: SNAKE_WINDOW.x + 1, y: SNAKE_STATUS.y + STATUS + 1, w: BOARD_W, h: BOARD_H };

/** **仮.** Two presses are a double-click within this long and this near (the Mac's own default is about half a second). */
export const DOUBLE_CLICK = { ms: 500, px: 4 } as const;
/** The longest step of time taken at once: back from another tab, the snake does not race through a burst of ticks. */
const MAX_STEP = 0.25;

const inside = (p: Point, b: Box) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;

/** Where a press picks an icon: its picture and its label under it (wider than the picture). */
export function iconBox(icon: MacIcon): Box {
  const at = ICONS[icon];
  return { x: at.x - 16, y: at.y, w: ICON.w + 32, h: ICON.h + 17 };
}

/** The close box of a window, in the screen's px. */
export function closeBox(win: Box): Box {
  return { x: win.x + CLOSE_BOX.inset, y: win.y + Math.round((TITLE_BAR - CLOSE_BOX.size) / 2), w: CLOSE_BOX.size, h: CLOSE_BOX.size };
}

/** The icon under a point, if any. */
export function iconAt(p: Point): MacIcon | null {
  return (Object.keys(ICONS) as MacIcon[]).find((icon) => inside(p, iconBox(icon))) ?? null;
}

export type MacState = {
  /** The game whose window is open, if one is. */
  readonly open: "snake" | null;
  readonly selected: MacIcon | null;
  /** The last press on an icon, to tell a double-click. */
  readonly lastPress: { readonly icon: MacIcon; readonly at: number; readonly x: number; readonly y: number } | null;
  readonly snake: Snake;
  /** The best score since the page was opened. */
  readonly best: number;
  /** Time since the snake's last tick, in seconds. */
  readonly since: number;
};

export function macStart(rng: () => number): MacState {
  return { open: null, selected: null, lastPress: null, snake: newSnake(rng), best: 0, since: 0 };
}

/** Close the game: back to the desktop, the icon still selected. */
export function macClose(state: MacState): MacState {
  return state.open ? { ...state, open: null, since: 0 } : state;
}

const again = (state: MacState, rng: () => number): MacState => ({ ...state, snake: newSnake(rng), since: 0 });
const over = (snake: Snake) => snake.phase === "over" || snake.phase === "won";

/**
 * A press of the Mac's mouse's button at `p` (the cursor, in the screen's
 * px), at `time` (ms). `seated`: whether the reader sits at the desk — a
 * game opens only then.
 */
export function macPress(state: MacState, p: Point, time: number, seated: boolean, rng: () => number): MacState {
  if (state.open) {
    if (inside(p, closeBox(SNAKE_WINDOW))) return macClose(state);
    if (inside(p, SNAKE_BOARD) && over(state.snake)) return again(state, rng);
    return state;
  }
  const icon = iconAt(p);
  if (!icon) return { ...state, selected: null, lastPress: null };
  const last = state.lastPress;
  const double = !!last && last.icon === icon && time - last.at <= DOUBLE_CLICK.ms && Math.hypot(p.x - last.x, p.y - last.y) <= DOUBLE_CLICK.px;
  const opens = OPENS[icon];
  if (double && opens && seated) return { ...state, selected: icon, lastPress: null, open: opens, snake: newSnake(rng), since: 0 };
  // A double-click is two presses, not three: the next press starts another pair.
  return { ...state, selected: icon, lastPress: double ? null : { icon, at: time, x: p.x, y: p.y } };
}

/** The reader's keys the game reads, and what they mean: W A S D, and the arrows standing for them. */
const HEADINGS: Record<string, Heading> = {
  KeyW: "up",
  KeyA: "left",
  KeyS: "down",
  KeyD: "right",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowDown: "down",
  ArrowRight: "right",
};
const ARROW_AS: Record<string, string> = { ArrowUp: "KeyW", ArrowLeft: "KeyA", ArrowDown: "KeyS", ArrowRight: "KeyD" };
const AGAIN = new Set(["Space", "Enter", "NumpadEnter"]);

/** The M0110's key that goes down for a key of the reader's while a game is open: an arrow is its letter (the M0110 has no arrows). */
export function gameCode(code: string, playing: boolean): string {
  return (playing && ARROW_AS[code]) || code;
}

/** Whether a key is the game's while it is open (so the page does nothing else with it: an arrow or Space would scroll). */
export function isGameKey(code: string): boolean {
  return code in HEADINGS || AGAIN.has(code) || code === "Escape";
}

/** A key of the reader's (`KeyboardEvent.code`), sent to the Mac. Only an open game reads keys. */
export function macKey(state: MacState, code: string, rng: () => number): MacState {
  if (!state.open) return state;
  if (code === "Escape") return macClose(state);
  if (AGAIN.has(code)) return over(state.snake) ? again(state, rng) : state;
  const heading = HEADINGS[code];
  if (!heading) return state;
  const snake = steerSnake(state.snake, heading);
  // A key starts the clock from it: the first move is a whole tick later.
  return snake === state.snake ? state : { ...state, snake, since: state.snake.phase === "ready" ? 0 : state.since };
}

/** Time passing, `dt` seconds: the snake ticks while its game runs. The same state when nothing changed. */
export function macAdvance(state: MacState, dt: number, rng: () => number): MacState {
  if (!state.open || state.snake.phase !== "running") return state;
  let since = state.since + Math.min(dt, MAX_STEP);
  let snake = state.snake;
  while (since >= SNAKE.tick && snake.phase === "running") {
    since -= SNAKE.tick;
    snake = stepSnake(snake, rng);
  }
  const best = Math.max(state.best, snake.score);
  return { ...state, snake, since: snake.phase === "running" ? since : 0, best };
}
