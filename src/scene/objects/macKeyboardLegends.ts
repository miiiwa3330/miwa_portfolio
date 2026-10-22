import * as THREE from "three";
import type { Key } from "../room/keyboard";
import type { LegendAtlas } from "../room/keycaps";

/**
 * The M0110's printing, as the HHKB's (`keyboardLegends.ts`): every key's
 * legend in one atlas (white where unprinted; the caps' colour multiplies
 * it), laid out as `reference/4/マッキントッシュ2.webp` prints them — dark
 * gray, small, at the top left of the cap: a letter alone, a shifted
 * character over the plain one, a word (Tab, Shift, Option, …) smaller
 * still. And the owner's name, sunk into the front lip where the maker's
 * apple is.
 */

const INK = "#3f403b";
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(s, x, y);
}

function drawKey(ctx: CanvasRenderingContext2D, key: Key, left: number, top: number, h: number) {
  const { main, shift } = key.legend;
  const inset = 0.16 * h;
  if (shift) {
    text(ctx, shift, left + inset, top + 0.36 * h, 0.22 * h);
    text(ctx, main, left + inset, top + 0.66 * h, 0.22 * h);
  } else if (main === "⌘") {
    text(ctx, main, left + inset, top + 0.42 * h, 0.3 * h, 400);
  } else if (main.length === 1) {
    text(ctx, main, left + inset, top + 0.4 * h, 0.26 * h);
  } else if (main) {
    text(ctx, main, left + inset, top + 0.36 * h, 0.15 * h);
  }
}

export function makeMacLegendTexture(keys: readonly Key[], atlas: LegendAtlas): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = atlas.width;
  canvas.height = atlas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  ctx.filter = "blur(0.5px)";
  for (const key of keys) {
    const cell = atlas.cells[key.index];
    drawKey(ctx, key, cell.left, cell.top, cell.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** The owner's name, pressed into the lip: a shade darker than the case, with a light edge under it. Transparent elsewhere. */
export function makeMacLipTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `600 40px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,250,225,0.45)";
  ctx.fillText("Miiiwa", 8, 34);
  ctx.fillStyle = "rgba(90,78,45,0.55)";
  ctx.fillText("Miiiwa", 7, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
