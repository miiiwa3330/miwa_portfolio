import * as THREE from "three";
import type { Key } from "../room/keyboard";
import type { LegendAtlas } from "../room/keycaps";

/**
 * The HHKB's printing, painted on canvases: the legends of every key into one
 * atlas (`room/keycaps.ts` says where each key's cell is), and the logo on the
 * case. Printed matter rather than modelled letters, the way the build-up
 * method asks (docs/devlog/202610.md, 2026-10-22).
 *
 * The atlas is white where nothing is printed: the caps' material multiplies
 * it with each cap's own colour, so a cap shows its colour with the ink on
 * top. Ink colour and placement are read off `reference/4/キーボード１.png`
 * (the darkest pixels of the "Q").
 */

export const INK = "#6f768d";
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, align: CanvasTextAlign, weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

/** One key's legends inside its cell, laid out as the photo prints them. */
function drawKey(ctx: CanvasRenderingContext2D, key: Key, left: number, top: number, width: number, h: number) {
  const { main, shift, fn } = key.legend;
  const inset = 0.17 * h;
  const right = left + width - 0.12 * h;
  if (key.id.startsWith("alt")) {
    // "Alt" large at the left, "Opt" small at the top right.
    text(ctx, main, left + inset, top + 0.66 * h, 0.24 * h, "left");
    if (shift) text(ctx, shift, right, top + 0.34 * h, 0.17 * h, "right");
  } else if (shift) {
    // The shifted character over the plain one, at the left.
    text(ctx, shift, left + inset, top + 0.38 * h, 0.27 * h, "left");
    text(ctx, main, left + inset, top + 0.72 * h, 0.27 * h, "left");
  } else if (main.length === 1 && key.units === 1) {
    // A letter, large, high on the left.
    text(ctx, main, left + inset, top + 0.48 * h, 0.34 * h, "left");
  } else if (main) {
    // A word (Control, Return, …) or a symbol on a wide key.
    text(ctx, main, left + inset, top + 0.5 * h, 0.22 * h, "left");
  }
  if (fn) text(ctx, fn, right, top + 0.86 * h, 0.16 * h, "right", 400);
}

export function makeLegendTexture(keys: readonly Key[], atlas: LegendAtlas): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  for (const key of keys) {
    const cell = atlas.cells[key.index];
    drawKey(ctx, key, cell.left, cell.top, cell.width, cell.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * The logo on the case's right blank: the stylised "HHKB" over
 * "Professional2", as in the photo — ink only, on a transparent canvas, to
 * lie on the case.
 */
export function makeLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  text(ctx, "HHKB", 480, 128, 110, "right", 700);
  text(ctx, "Professional2", 480, 210, 62, "right", 400);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
