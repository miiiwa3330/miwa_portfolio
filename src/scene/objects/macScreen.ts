import * as THREE from "three";
import {
  CELL,
  GAMES_WINDOW,
  ICON,
  ICONS,
  ICON_LABELS,
  MAC_SCREEN_PX,
  MENU_BAR,
  GAME_FIELD,
  GAME_STATUS,
  GAME_TITLES,
  GAME_WINDOW,
  TITLE_BAR,
  closeBox,
  type Box,
  type MacIcon,
  type MacState,
} from "../mac/finder";
import { BREAKOUT, brickBox } from "../mac/breakout";
import { MINES, minesLeft, minesRound } from "../mac/mines";

/**
 * The Macintosh's screen, drawn: a one-bit picture at the 128K's 512 × 342
 * (`mac/finder.ts` says where everything is) — the desktop's grey dither,
 * the menu bar, the disk and the "Games" window, the selected icon inverted
 * as the Mac's are; and over them, while one is open, a game's window: its
 * striped title bar with the close box, the line of score, and the field —
 * Snake's snake and food, Breakout's bricks, paddle and ball, Mines' cells.
 * No maker's marks: a diamond where the maker's apple menu is.
 *
 * The desktop is drawn once for each icon that can be selected and kept (its
 * dither is a fill per pixel); each paint lays it down and draws the window
 * over it.
 */

const INK = "#0b0d0b";
const PHOSPHOR = "#e6ece3";
const BOLD = "bold 12px Chicago, Geneva, Helvetica, Arial, sans-serif";
const SMALL = "10px Geneva, Helvetica, Arial, sans-serif";

function canvasOf(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = MAC_SCREEN_PX.width;
  canvas.height = MAC_SCREEN_PX.height;
  return [canvas, canvas.getContext("2d")!];
}

/** An icon: a disk-like picture, its label under it on a white strip — both inverted while selected. */
function icon(ctx: CanvasRenderingContext2D, icon: MacIcon, selected: boolean) {
  const { x, y } = ICONS[icon];
  const label = ICON_LABELS[icon];
  const [paper, ink] = selected ? [INK, PHOSPHOR] : [PHOSPHOR, INK];
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, ICON.w, ICON.h);
  ctx.fillStyle = ink;
  ctx.strokeStyle = selected ? PHOSPHOR : INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, ICON.w - 1, ICON.h - 1);
  ctx.fillRect(x + 6, y + 18, 20, 2);
  ctx.font = SMALL;
  ctx.textBaseline = "middle";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = paper;
  ctx.fillRect(x + ICON.w / 2 - tw / 2 - 2, y + 30, tw + 4, 12);
  ctx.fillStyle = ink;
  ctx.fillText(label, x + ICON.w / 2 - tw / 2, y + 36);
}

/** A window: white with a black edge and a 2 px shadow, its title bar striped but for the title (and the close box, if it has one). */
function windowFrame(ctx: CanvasRenderingContext2D, win: Box, title: string, closable: boolean) {
  ctx.fillStyle = PHOSPHOR;
  ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = INK;
  ctx.fillRect(win.x + 2, win.y + win.h, win.w, 2);
  ctx.fillRect(win.x + win.w, win.y + 2, 2, win.h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(win.x + 0.5, win.y + 0.5, win.w - 1, win.h - 1);
  for (let y = win.y + 4; y < win.y + TITLE_BAR - 2; y += 2) ctx.fillRect(win.x + 2, y, win.w - 4, 1);
  ctx.font = BOLD;
  ctx.textBaseline = "middle";
  const tw = ctx.measureText(title).width;
  ctx.fillStyle = PHOSPHOR;
  ctx.fillRect(win.x + win.w / 2 - tw / 2 - 6, win.y + 2, tw + 12, TITLE_BAR - 4);
  ctx.fillStyle = INK;
  ctx.fillText(title, win.x + win.w / 2 - tw / 2, win.y + 10);
  ctx.fillRect(win.x, win.y + TITLE_BAR, win.w, 1);
  if (closable) {
    // The close box: a white square with a white margin cut out of the stripes.
    const box = closeBox(win);
    ctx.fillStyle = PHOSPHOR;
    ctx.fillRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
    ctx.strokeStyle = INK;
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
  }
}

/** The desktop with `selected` inverted (or none). */
function desktop(selected: MacIcon | null): HTMLCanvasElement {
  const [canvas, ctx] = canvasOf();
  const { width: w, height: h } = MAC_SCREEN_PX;
  ctx.fillStyle = PHOSPHOR;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = INK;
  for (let y = MENU_BAR; y < h; y++) for (let x = y & 1; x < w; x += 2) ctx.fillRect(x, y, 1, 1);
  // The menu bar.
  ctx.fillStyle = PHOSPHOR;
  ctx.fillRect(0, 0, w, MENU_BAR - 1);
  ctx.fillStyle = INK;
  ctx.fillRect(0, MENU_BAR - 1, w, 1);
  ctx.font = BOLD;
  ctx.textBaseline = "middle";
  ctx.fillText("◆", 12, 10);
  ["File", "Edit", "View", "Games"].reduce((x, label) => {
    ctx.fillText(label, x, 10);
    return x + ctx.measureText(label).width + 18;
  }, 34);
  icon(ctx, "disk", selected === "disk");
  windowFrame(ctx, GAMES_WINDOW, "Games", false);
  (["snake", "breakout", "mines"] as const).forEach((i) => icon(ctx, i, selected === i));
  return canvas;
}

/** Lines of text in a box on the field, its middle `down` the field (a fraction): clear of what waits there. */
function notice(ctx: CanvasRenderingContext2D, lines: string[], down = 0.5) {
  ctx.font = BOLD;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  const h = lines.length * 16 + 12;
  const x = Math.round(GAME_FIELD.x + (GAME_FIELD.w - w) / 2);
  const y = Math.round(GAME_FIELD.y + GAME_FIELD.h * down - h / 2);
  ctx.fillStyle = PHOSPHOR;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => ctx.fillText(line, x + (w - ctx.measureText(line).width) / 2, y + 14 + i * 16));
}

/** The line of score: text at its left, its middle and its right. */
function status(ctx: CanvasRenderingContext2D, left: string, middle: string, right: string) {
  ctx.fillStyle = INK;
  ctx.font = BOLD;
  ctx.textBaseline = "middle";
  const mid = GAME_STATUS.y + GAME_STATUS.h / 2;
  ctx.fillText(left, GAME_STATUS.x + 8, mid);
  ctx.fillText(middle, GAME_STATUS.x + (GAME_STATUS.w - ctx.measureText(middle).width) / 2, mid);
  ctx.fillText(right, GAME_STATUS.x + GAME_STATUS.w - 8 - ctx.measureText(right).width, mid);
  ctx.fillRect(GAME_WINDOW.x, GAME_STATUS.y + GAME_STATUS.h, GAME_WINDOW.w, 1);
}

/** The one-pixel checker (the Mac's grey) as a pattern, anchored to the screen as the desktop's dither is. */
const greys = new WeakMap<CanvasRenderingContext2D, CanvasPattern>();
function greyPattern(ctx: CanvasRenderingContext2D): CanvasPattern {
  let pattern = greys.get(ctx);
  if (!pattern) {
    const tile = document.createElement("canvas");
    tile.width = 2;
    tile.height = 2;
    const t = tile.getContext("2d")!;
    t.fillStyle = PHOSPHOR;
    t.fillRect(0, 0, 2, 2);
    t.fillStyle = INK;
    t.fillRect(0, 0, 1, 1);
    t.fillRect(1, 1, 1, 1);
    pattern = ctx.createPattern(tile, "repeat")!;
    greys.set(ctx, pattern);
  }
  return pattern;
}

/** A box filled with the grey. A pattern, not a fill per pixel: Breakout's bricks are drawn every frame. */
function grey(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = greyPattern(ctx);
  ctx.fillRect(x, y, w, h);
}

/** Snake: the snake in black cells, the food a hollow ring. */
function snakeField(ctx: CanvasRenderingContext2D, state: MacState) {
  const game = state.snake;
  status(ctx, `Score ${game.score}`, "", `Best ${state.best.snake}`);
  ctx.fillStyle = INK;
  const at = (c: number, r: number) => [GAME_FIELD.x + c * CELL, GAME_FIELD.y + r * CELL] as const;
  for (const [c, r] of game.body) {
    const [x, y] = at(c, r);
    ctx.fillRect(x, y, CELL - 1, CELL - 1);
  }
  if (game.food) {
    const [x, y] = at(game.food[0], game.food[1]);
    ctx.fillRect(x + 2, y, CELL - 5, 1);
    ctx.fillRect(x + 2, y + CELL - 2, CELL - 5, 1);
    ctx.fillRect(x, y + 2, 1, CELL - 5);
    ctx.fillRect(x + CELL - 2, y + 2, 1, CELL - 5);
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + CELL - 3, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + CELL - 3, 1, 1);
    ctx.fillRect(x + CELL - 3, y + CELL - 3, 1, 1);
  }
  // Waiting, a quarter down: the snake waits in the middle.
  if (game.phase === "ready") notice(ctx, ["W A S D to start", "Esc to close"], 0.25);
  else if (game.phase === "over") notice(ctx, [`Game over: ${game.score}`, "Space to play again"]);
  else if (game.phase === "won") notice(ctx, ["The board is full!", "Space to play again"]);
}

/** Breakout: the bricks (black, grey, then hollow, two rows each), the paddle and the ball. */
function breakoutField(ctx: CanvasRenderingContext2D, state: MacState) {
  const game = state.breakout;
  status(ctx, `Score ${game.score}`, `Balls ${game.lives}`, `Best ${state.best.breakout}`);
  game.bricks.forEach((alive, i) => {
    if (!alive) return;
    const b = brickBox(i);
    const [x, y, w, h] = [GAME_FIELD.x + b.x + 1, GAME_FIELD.y + b.y + 1, b.w - 2, b.h - 2];
    const row = Math.floor(i / BREAKOUT.cols);
    if (row < 2) {
      ctx.fillStyle = INK;
      ctx.fillRect(x, y, w, h);
    } else if (row < 4) {
      grey(ctx, x, y, w, h);
      ctx.strokeStyle = INK;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    } else {
      ctx.strokeStyle = INK;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
  });
  ctx.fillStyle = INK;
  const { w, h, y } = BREAKOUT.paddle;
  ctx.fillRect(Math.round(GAME_FIELD.x + game.paddle - w / 2), GAME_FIELD.y + y, w, h);
  if (game.phase !== "over") ctx.fillRect(Math.round(GAME_FIELD.x + game.ball[0]), Math.round(GAME_FIELD.y + game.ball[1]), BREAKOUT.ball, BREAKOUT.ball);
  // Between the bricks and the paddle.
  if (game.phase === "ready") notice(ctx, ["Click or Space to serve", "Esc to close"], 0.62);
  else if (game.phase === "over") notice(ctx, [`Game over: ${game.score}`, "Space to play again"], 0.62);
  else if (game.phase === "won") notice(ctx, ["Every brick is down!", "Space to play again"], 0.62);
}

const NUMBER = "bold 11px Chicago, Geneva, Helvetica, Arial, sans-serif";

/** A mine: a black ball with spikes, in a cell at (x, y). */
function mine(ctx: CanvasRenderingContext2D, x: number, y: number, ink: string) {
  const c = MINES.cell / 2;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(x + c, y + c, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + c - 0.5, y + 2, 1, MINES.cell - 4);
  ctx.fillRect(x + 2, y + c - 0.5, MINES.cell - 4, 1);
}

/** A flag on its pole, in a cell at (x, y). */
function flagAt(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(x + 8, y + 3, 1, 10);
  ctx.fillRect(x + 5, y + 12, 7, 1);
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 3);
  ctx.lineTo(x + 3, y + 5.5);
  ctx.lineTo(x + 8, y + 8);
  ctx.fill();
}

/** Mines: covered cells raised in grey, open ones white with their count, flags, and the mines once it is over. */
function minesField(ctx: CanvasRenderingContext2D, state: MacState) {
  const game = state.mines;
  const best = state.best.mines === null ? "–" : `${state.best.mines}`;
  status(ctx, `Mines ${minesLeft(game)}`, game.phase === "ready" ? "⌘-click to flag" : `Time ${game.seconds}`, `Best ${best}`);
  const s = MINES.cell;
  for (let i = 0; i < game.cols * game.rows; i++) {
    const x = GAME_FIELD.x + (i % game.cols) * s;
    const y = GAME_FIELD.y + Math.floor(i / game.cols) * s;
    if (!game.open[i]) {
      grey(ctx, x, y, s, s);
      ctx.fillStyle = PHOSPHOR;
      ctx.fillRect(x, y, s - 1, 1);
      ctx.fillRect(x, y, 1, s - 1);
      ctx.fillStyle = INK;
      ctx.fillRect(x, y + s - 1, s, 1);
      ctx.fillRect(x + s - 1, y, 1, s);
      if (game.flags[i]) {
        ctx.fillStyle = PHOSPHOR;
        ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
        flagAt(ctx, x, y);
        // A flag on no mine, shown once the game is over: crossed out.
        if (game.phase === "over" && game.mines && !game.mines[i]) {
          ctx.fillStyle = INK;
          for (let k = 2; k < s - 2; k++) {
            ctx.fillRect(x + k, y + k, 1, 1);
            ctx.fillRect(x + s - 1 - k, y + k, 1, 1);
          }
        }
      }
      continue;
    }
    // Open: white, a dotted line at its right and bottom between it and the next.
    ctx.fillStyle = INK;
    for (let k = 0; k < s; k += 2) {
      ctx.fillRect(x + s - 1, y + k, 1, 1);
      ctx.fillRect(x + k, y + s - 1, 1, 1);
    }
    if (game.mines?.[i]) {
      const hit = game.exploded === i;
      if (hit) ctx.fillRect(x, y, s - 1, s - 1);
      mine(ctx, x, y, hit ? PHOSPHOR : INK);
      continue;
    }
    const n = minesRound(game, i);
    if (!n) continue;
    ctx.font = NUMBER;
    ctx.textBaseline = "middle";
    ctx.fillText(`${n}`, x + (s - ctx.measureText(`${n}`).width) / 2, y + s / 2 + 1);
  }
  if (game.phase === "over") notice(ctx, ["Boom!", "Space to play again"]);
  else if (game.phase === "won") notice(ctx, [`Cleared in ${game.seconds} s`, "Space to play again"]);
}

/** The open game's window: its frame and title, then its own field. */
function gameWindow(ctx: CanvasRenderingContext2D, state: MacState) {
  if (!state.open) return;
  windowFrame(ctx, GAME_WINDOW, GAME_TITLES[state.open], true);
  if (state.open === "snake") snakeField(ctx, state);
  else if (state.open === "breakout") breakoutField(ctx, state);
  else minesField(ctx, state);
}

export type MacScreen = {
  texture: THREE.CanvasTexture;
  /** Draw what the Mac shows now. */
  paint: (state: MacState) => void;
  dispose: () => void;
};

export function macScreen(): MacScreen {
  const [canvas, ctx] = canvasOf();
  const desktops = new Map<MacIcon | null, HTMLCanvasElement>();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Sharp pixels up close; from further off, mipmaps average the one-pixel
  // dither to gray — without them it beat against the screen's pixels into
  // diagonal stripes.
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return {
    texture,
    paint(state) {
      let base = desktops.get(state.selected);
      if (!base) desktops.set(state.selected, (base = desktop(state.selected)));
      ctx.drawImage(base, 0, 0);
      gameWindow(ctx, state);
      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}
