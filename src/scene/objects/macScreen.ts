import * as THREE from "three";
import {
  CELL,
  GAMES_WINDOW,
  ICON,
  ICONS,
  ICON_LABELS,
  MAC_SCREEN_PX,
  MENU_BAR,
  SNAKE_BOARD,
  SNAKE_STATUS,
  SNAKE_WINDOW,
  TITLE_BAR,
  closeBox,
  type Box,
  type MacIcon,
  type MacState,
} from "../mac/finder";

/**
 * The Macintosh's screen, drawn: a one-bit picture at the 128K's 512 × 342
 * (`mac/finder.ts` says where everything is) — the desktop's grey dither,
 * the menu bar, the disk and the "Games" window, the selected icon inverted
 * as the Mac's are; and over them, while it is open, the Snake window: its
 * striped title bar with the close box, the score, and the board. No maker's
 * marks: a diamond where the maker's apple menu is.
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

/** Lines of text in a box on the board: its middle, or (`high`) a quarter down — clear of the snake waiting in the middle. */
function notice(ctx: CanvasRenderingContext2D, lines: string[], high = false) {
  ctx.font = BOLD;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
  const h = lines.length * 16 + 12;
  const x = Math.round(SNAKE_BOARD.x + (SNAKE_BOARD.w - w) / 2);
  const y = Math.round(SNAKE_BOARD.y + SNAKE_BOARD.h * (high ? 0.25 : 0.5) - h / 2);
  ctx.fillStyle = PHOSPHOR;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  lines.forEach((line, i) => ctx.fillText(line, x + (w - ctx.measureText(line).width) / 2, y + 14 + i * 16));
}

/** The Snake window: the score over the board, the snake in black cells, the food a hollow ring. */
function snakeWindow(ctx: CanvasRenderingContext2D, state: MacState) {
  const game = state.snake;
  windowFrame(ctx, SNAKE_WINDOW, "Snake", true);
  ctx.fillStyle = INK;
  ctx.font = BOLD;
  ctx.textBaseline = "middle";
  const mid = SNAKE_STATUS.y + SNAKE_STATUS.h / 2;
  ctx.fillText(`Score ${game.score}`, SNAKE_STATUS.x + 8, mid);
  const best = `Best ${state.best}`;
  ctx.fillText(best, SNAKE_STATUS.x + SNAKE_STATUS.w - 8 - ctx.measureText(best).width, mid);
  ctx.fillRect(SNAKE_WINDOW.x, SNAKE_STATUS.y + SNAKE_STATUS.h, SNAKE_WINDOW.w, 1);
  const at = (c: number, r: number) => [SNAKE_BOARD.x + c * CELL, SNAKE_BOARD.y + r * CELL] as const;
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
  if (game.phase === "ready") notice(ctx, ["W A S D to start", "Esc to close"], true);
  else if (game.phase === "over") notice(ctx, [`Game over: ${game.score}`, "Space to play again"]);
  else if (game.phase === "won") notice(ctx, ["The board is full!", "Space to play again"]);
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
      if (state.open === "snake") snakeWindow(ctx, state);
      texture.needsUpdate = true;
    },
    dispose: () => texture.dispose(),
  };
}
