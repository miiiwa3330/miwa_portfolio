import { SNAKE, newSnake, steerSnake, stepSnake, type Heading, type Snake } from "./snake";
import { aimPaddle, launchBall, newBreakout, steerPaddle, stepBreakout, type Breakout } from "./breakout";
import { MINES, newMines, openCell, tickMines, toggleFlag, type Mines } from "./mines";
import type { MacSound } from "./sounds";

/**
 * What the Macintosh runs (2026-10-23, the user): its desktop, on its
 * 512 × 342 screen — the menu bar, the disk, the "Games" window with its
 * three icons — and the game opened from it: Snake (`snake.ts`), Breakout
 * (`breakout.ts`) or Mines (`mines.ts`). Pure: the places of things in the
 * screen's px, and how a press of the mouse's button, a key, the cursor and
 * the passing time change what is on the screen and what it sounds
 * (`sounds`). Drawn by `objects/macScreen.ts`; driven by
 * `objects/Macintosh.tsx`, which sends it the Mac's mouse (`macPointer`) and
 * the reader's keys, and plays the sounds (`objects/macSound.ts`).
 *
 * - **A game opens as the Mac's icons do**: a press selects an icon, a second
 *   press on it soon after (`DOUBLE_CLICK`) opens it.
 * - **It opens only while the reader sits at the desk**: the Mac's mouse can
 *   be pressed standing, within reach, but the games are played with the
 *   keys too, which the reader's keyboard sends only to a seated reader —
 *   and opening one is what zooms the view to the Mac's screen (`Scene`).
 * - **It closes with its window's close box, or Esc** (the user's choice).
 *   While it is open the rest of the desktop is not pressed.
 * - **Every game has the same window**: a title bar, a line of score, and a
 *   field of 384 × 240 px. A press on the field is the game's.
 * - **The keys are W A S D** — the M0110 has no arrows — **and the reader's
 *   arrows stand for them** (the user's choice: 「WASD＋矢印キー」), pressing
 *   down the same keys on the M0110 (`gameCode`). Space or Return starts a
 *   game again once one is over, and sends Breakout's ball.
 * - **Breakout's paddle follows the M0100** (`macPoint`), or slides while A
 *   or D is held. **Mines is the mouse's**: a press opens a cell; with ⌘ or
 *   Option held (`flag`), it flags one — the M0100 has one button.
 */

export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export type MacIcon = "disk" | "snake" | "breakout" | "mines";
export type MacGame = "snake" | "breakout" | "mines";
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
/** The icons a press opens; the rest (the disk) are only selected. */
const OPENS: Partial<Record<MacIcon, MacGame>> = { snake: "snake", breakout: "breakout", mines: "mines" };

/** The field every game is played on (Snake's 48 × 30 cells of 8 px, Mines' 24 × 15 of 16, Breakout's own px). */
export const FIELD = { w: 384, h: 240 } as const;
/** Snake's cells. */
export const CELL = 8;
const STATUS = 16;
const WINDOW_W = FIELD.w + 2;
const WINDOW_H = TITLE_BAR + 1 + STATUS + 1 + FIELD.h + 1;
/** The game window, its line of score, and its field, in the screen's px. */
export const GAME_WINDOW: Box = { x: Math.round((MAC_SCREEN_PX.width - WINDOW_W) / 2), y: MENU_BAR + 14, w: WINDOW_W, h: WINDOW_H };
export const GAME_STATUS: Box = { x: GAME_WINDOW.x + 1, y: GAME_WINDOW.y + TITLE_BAR + 1, w: FIELD.w, h: STATUS };
export const GAME_FIELD: Box = { x: GAME_WINDOW.x + 1, y: GAME_STATUS.y + STATUS + 1, w: FIELD.w, h: FIELD.h };
export const GAME_TITLES: Record<MacGame, string> = { snake: "Snake", breakout: "Breakout", mines: "Mines" };

/** **仮.** Two presses are a double-click within this long and this near (the Mac's own default is about half a second). */
export const DOUBLE_CLICK = { ms: 500, px: 4 } as const;
/** The longest step of time taken at once: back from another tab, nothing races through a burst of ticks. */
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
  readonly open: MacGame | null;
  readonly selected: MacIcon | null;
  /** The last press on an icon, to tell a double-click. */
  readonly lastPress: { readonly icon: MacIcon; readonly at: number; readonly x: number; readonly y: number } | null;
  readonly snake: Snake;
  readonly breakout: Breakout;
  readonly mines: Mines;
  /** The best since the page was opened: the highest scores, and the quickest board cleared (seconds). */
  readonly best: { readonly snake: number; readonly breakout: number; readonly mines: number | null };
  /** Time on the open game's clock, in seconds: since Snake's last tick, or since the first cell of Mines. */
  readonly since: number;
  /** The keys held that slide Breakout's paddle. */
  readonly held: readonly ("left" | "right")[];
  /** The sounds the change that made this state made, to be played once (`Macintosh`): a new array for each. */
  readonly sounds: readonly MacSound[];
};

const SILENT: readonly MacSound[] = [];

export function macStart(rng: () => number): MacState {
  return {
    open: null,
    selected: null,
    lastPress: null,
    snake: newSnake(rng),
    breakout: newBreakout(),
    mines: newMines(),
    best: { snake: 0, breakout: 0, mines: null },
    since: 0,
    held: [],
    sounds: SILENT,
  };
}

/** Close the game: back to the desktop, the icon still selected. */
export function macClose(state: MacState): MacState {
  return state.open ? { ...state, open: null, since: 0, held: [], sounds: SILENT } : state;
}

/** A new game of the open one. */
function again(state: MacState, rng: () => number): MacState {
  const fresh = { ...state, since: 0, sounds: SILENT };
  if (state.open === "snake") return { ...fresh, snake: newSnake(rng) };
  if (state.open === "breakout") return { ...fresh, breakout: steerPaddle(newBreakout(), steerOf(state.held)) };
  return { ...fresh, mines: newMines() };
}

const done = (phase: string) => phase === "over" || phase === "won";
/** Whether the open game is over (or won): a press or Space starts another. */
function finished(state: MacState): boolean {
  if (state.open === "snake") return done(state.snake.phase);
  if (state.open === "breakout") return done(state.breakout.phase);
  return done(state.mines.phase);
}

/** The cell of Mines under a point of the field. */
function cellAt(local: Point): number {
  return Math.floor(local.y / MINES.cell) * MINES.cols + Math.floor(local.x / MINES.cell);
}

/** A press on the open game's field (`local`, the field's px). */
function pressField(state: MacState, local: Point, flag: boolean, rng: () => number): MacState {
  if (finished(state)) return again(state, rng);
  if (state.open === "breakout") {
    const breakout = launchBall(state.breakout, rng);
    return breakout === state.breakout ? state : { ...state, breakout, sounds: SILENT };
  }
  if (state.open === "mines") {
    const { game, sound } = flag ? toggleFlag(state.mines, cellAt(local)) : openCell(state.mines, cellAt(local), rng);
    if (game === state.mines) return state;
    const started = state.mines.phase === "ready" && game.phase !== "ready";
    const won = game.phase === "won";
    const best = won && (state.best.mines === null || game.seconds < state.best.mines) ? { ...state.best, mines: game.seconds } : state.best;
    return { ...state, mines: game, since: started ? 0 : state.since, best, sounds: sound ? [sound] : SILENT };
  }
  return state;
}

/**
 * A press of the Mac's mouse's button at `p` (the cursor, in the screen's
 * px), at `time` (ms). `seated`: whether the reader sits at the desk — a
 * game opens only then. `flag`: ⌘ or Option held — Mines flags a cell.
 */
export function macPress(state: MacState, p: Point, time: number, seated: boolean, rng: () => number, flag = false): MacState {
  if (state.open) {
    if (inside(p, closeBox(GAME_WINDOW))) return macClose(state);
    if (inside(p, GAME_FIELD)) return pressField(state, { x: p.x - GAME_FIELD.x, y: p.y - GAME_FIELD.y }, flag, rng);
    return state;
  }
  const icon = iconAt(p);
  if (!icon) return { ...state, selected: null, lastPress: null, sounds: SILENT };
  const last = state.lastPress;
  const double = !!last && last.icon === icon && time - last.at <= DOUBLE_CLICK.ms && Math.hypot(p.x - last.x, p.y - last.y) <= DOUBLE_CLICK.px;
  const opens = OPENS[icon];
  if (double && opens && seated) return again({ ...state, selected: icon, lastPress: null, open: opens, held: [] }, rng);
  // A double-click is two presses, not three: the next press starts another pair.
  return { ...state, selected: icon, lastPress: double ? null : { icon, at: time, x: p.x, y: p.y }, sounds: SILENT };
}

/** The cursor at `p` (the screen's px): Breakout's paddle goes under it, while it is over the field across. */
export function macPoint(state: MacState, p: Point): MacState {
  if (state.open !== "breakout" || p.x < GAME_FIELD.x || p.x >= GAME_FIELD.x + GAME_FIELD.w) return state;
  const breakout = aimPaddle(state.breakout, p.x - GAME_FIELD.x);
  return breakout === state.breakout ? state : { ...state, breakout, sounds: SILENT };
}

/** The reader's keys the games read, and what they mean: W A S D, and the arrows standing for them. */
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

/** Whether a key is the games' while one is open (so the page does nothing else with it: an arrow or Space would scroll). */
export function isGameKey(code: string): boolean {
  return code in HEADINGS || AGAIN.has(code) || code === "Escape";
}

/** Which way the held keys slide the paddle: one way, or neither (both, or none). */
function steerOf(held: readonly ("left" | "right")[]): -1 | 0 | 1 {
  const left = held.includes("left");
  const right = held.includes("right");
  return left === right ? 0 : left ? -1 : 1;
}

/** A key of the reader's going down (`KeyboardEvent.code`), sent to the Mac. Only an open game reads keys. */
export function macKey(state: MacState, code: string, rng: () => number): MacState {
  if (!state.open) return state;
  if (code === "Escape") return macClose(state);
  if (AGAIN.has(code)) {
    if (finished(state)) return again(state, rng);
    if (state.open !== "breakout") return state;
    const breakout = launchBall(state.breakout, rng);
    return breakout === state.breakout ? state : { ...state, breakout, sounds: SILENT };
  }
  const heading = HEADINGS[code];
  if (!heading) return state;
  if (state.open === "breakout") {
    if (heading !== "left" && heading !== "right") return state;
    const held = state.held.includes(heading) ? state.held : [...state.held, heading];
    return { ...state, held, breakout: steerPaddle(state.breakout, steerOf(held)), sounds: SILENT };
  }
  if (state.open !== "snake") return state;
  const snake = steerSnake(state.snake, heading);
  // A key starts the clock from it: the first move is a whole tick later.
  return snake === state.snake ? state : { ...state, snake, since: state.snake.phase === "ready" ? 0 : state.since, sounds: SILENT };
}

/** A key of the reader's coming back up: Breakout's paddle stops sliding that way. */
export function macKeyUp(state: MacState, code: string): MacState {
  const heading = HEADINGS[code];
  if (heading !== "left" && heading !== "right") return state;
  if (!state.held.includes(heading)) return state;
  const held = state.held.filter((h) => h !== heading);
  return { ...state, held, breakout: steerPaddle(state.breakout, steerOf(held)), sounds: SILENT };
}

/** Snake's sounds for one tick: a bite, or its end. */
function snakeSounds(before: Snake, after: Snake): MacSound[] {
  if (after.phase === "over") return ["over"];
  if (after.phase === "won") return ["win"];
  return after.score > before.score ? ["eat"] : [];
}

/** Time passing, `dt` seconds: the open game's clock runs. The same state when nothing changed. */
export function macAdvance(state: MacState, dt: number, rng: () => number): MacState {
  const step = Math.min(dt, MAX_STEP);
  if (state.open === "snake") {
    if (state.snake.phase !== "running") return state;
    let since = state.since + step;
    let snake = state.snake;
    const sounds: MacSound[] = [];
    while (since >= SNAKE.tick && snake.phase === "running") {
      since -= SNAKE.tick;
      const next = stepSnake(snake, rng);
      sounds.push(...snakeSounds(snake, next));
      snake = next;
    }
    const best = snake.score > state.best.snake ? { ...state.best, snake: snake.score } : state.best;
    return { ...state, snake, since: snake.phase === "running" ? since : 0, best, sounds: sounds.length ? sounds : SILENT };
  }
  if (state.open === "breakout") {
    const { game, sounds } = stepBreakout(state.breakout, step);
    if (game === state.breakout) return state;
    const best = game.score > state.best.breakout ? { ...state.best, breakout: game.score } : state.best;
    return { ...state, breakout: game, best, sounds: sounds.length ? sounds : SILENT };
  }
  if (state.open === "mines") {
    if (state.mines.phase !== "running") return state;
    const since = state.since + step;
    return { ...state, since, mines: tickMines(state.mines, since), sounds: SILENT };
  }
  return state;
}

