import * as THREE from "three";
import { keyWear, type Key } from "../room/keyboard";
import type { LegendAtlas } from "../room/keycaps";

/**
 * The keyboard's printing and its wear, painted on canvases: the legends of
 * every key into one atlas (`room/keycaps.ts` says where each key's cell
 * is), a matching roughness map, and the logo on the case. Printed matter
 * rather than modelled letters, the way the build-up method asks
 * (docs/devlog/202610.md, 2026-10-22).
 *
 * The atlas is white where nothing is printed: the caps' material multiplies
 * it with each cap's own colour, so a cap shows its colour with the ink on
 * top. Ink colour and placement are read off `reference/4/キーボード１.png`
 * (the darkest pixels of the "Q").
 *
 * Wear follows how much a key is used (`keyWear`): where the finger lands,
 * a faint grime and a shine; the print a little faded. Sublimation printing
 * is the maker's point of durability, so the fading is kept slight
 * (**provisional (仮)** amounts throughout).
 */

export const INK = "#6f768d";
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
/** How far the print fades on the most-used key, and how dark its grime gets. */
const FADE = 0.18;
const GRIME = 0.06;
/** The caps' roughness, and how much the most-used key's middle is polished below it. */
export const CAP_ROUGHNESS = 0.6;
const POLISH = 0.32;

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

/**
 * Where on a key's top the finger lands, as a fraction of its cell: the
 * middle, a little towards the front; on the space bar, left of middle,
 * under the right thumb of someone who hits it there.
 */
function fingerSpot(key: Key): [number, number] {
  return key.id === "space" ? [0.42, 0.58] : [0.5, 0.58];
}

function spot(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, inner: string, outer: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

export function makeLegendTexture(keys: readonly Key[], atlas: LegendAtlas): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "alphabetic";
  for (const key of keys) {
    const cell = atlas.cells[key.index];
    const wear = keyWear(key);
    // Grime first, so the print lies over it.
    // Broad and faint: fingertips land all over a top, not on one point.
    if (wear > 0) {
      const [fx, fy] = fingerSpot(key);
      const r = cell.height * 0.62;
      spot(ctx, cell.left + fx * cell.width, cell.top + fy * cell.height, r, r * 0.8, `rgba(110,96,70,${GRIME * wear})`, "rgba(110,96,70,0)");
    }
    ctx.save();
    ctx.globalAlpha = 1 - FADE * wear;
    // Sublimation ink sinks into the plastic: a slightly soft edge.
    ctx.filter = "blur(0.6px)";
    ctx.fillStyle = INK;
    drawKey(ctx, key, cell.left, cell.top, cell.width, cell.height);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * The caps' roughness, in the same layout as the legends at half the size
 * (the polish is soft; it needs no sharp edge): `CAP_ROUGHNESS` everywhere,
 * lower where much-used keys have been polished by fingertips. Three.js
 * reads roughness from the green channel; the material's own roughness is 1.
 */
export function makeRoughnessTexture(keys: readonly Key[], atlas: LegendAtlas): THREE.CanvasTexture {
  const scale = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width * scale;
  canvas.height = atlas.height * scale;
  const ctx = canvas.getContext("2d")!;
  const grey = (r: number) => Math.round(r * 255);
  const base = grey(CAP_ROUGHNESS);
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const key of keys) {
    const wear = keyWear(key);
    if (wear <= 0) continue;
    const cell = atlas.cells[key.index];
    const [fx, fy] = fingerSpot(key);
    const polished = grey(CAP_ROUGHNESS - POLISH * wear);
    const r = cell.height * scale * 0.45;
    spot(
      ctx,
      (cell.left + fx * cell.width) * scale,
      (cell.top + fy * cell.height) * scale,
      r,
      r * 0.85,
      `rgb(${polished},${polished},${polished})`,
      `rgba(${base},${base},${base},0)`
    );
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * The logo on the case's right blank: "Miiiwa" over "Professional3" — the
 * owner's own name on the board, in place of the maker's (the user's ask,
 * 2026-10-22), set the way the photo sets the maker's. Ink only, on a
 * transparent canvas, to lie on the case.
 */
export function makeLogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";
  text(ctx, "Miiiwa", 480, 128, 104, "right", 700);
  text(ctx, "Professional3", 480, 210, 60, "right", 400);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
