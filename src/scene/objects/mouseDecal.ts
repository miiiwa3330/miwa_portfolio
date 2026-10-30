import * as THREE from "three";
import { EXG, MARKS, xOfFrac, zAt } from "../room/mouse";

/**
 * What is printed on the mouse, painted on a canvas laid over it from above
 * (the pieces' texture coordinates are the top view, `mouseParts`): the
 * shell's colour and the logo, placed in `reference/5/2.png`'s own fractions
 * (`MARKS.logo`). The seams, the slot and the DPI button are not painted —
 * they are cut (2026-10-22, the user).
 *
 * Colours are read off the photos (sRGB): the shell is 6.png's median over
 * the mouse (65, 68, 71; the product shot on an even grey, where 2.png's
 * warmer light gave 78, 79, 87), the logo the blue-violet of the maker's
 * print (2.png) — with the owner's name in place of the maker's.
 */

export const SHELL = "#414447";
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

/** Canvas pixels across the mouse's width; the height keeps its proportions. */
const WIDTH_PX = 512;
const HEIGHT_PX = Math.round((WIDTH_PX * EXG.length) / EXG.width);

/** The shell's colour with the logo on it. */
export function makeMouseTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH_PX;
  canvas.height = HEIGHT_PX;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = SHELL;
  ctx.fillRect(0, 0, WIDTH_PX, HEIGHT_PX);

  // The logo, read top to bottom (the letters turned a quarter clockwise),
  // at the size the maker's six letters are printed (2.png, 6.png: "ELECOM"
  // fills the logo's length) — the owner's name in the maker's lettering.
  const { logo } = MARKS;
  const pxPerMetre = WIDTH_PX / EXG.width;
  const cx = (xOfFrac((logo.xFrac[0] + logo.xFrac[1]) / 2) / EXG.width + 0.5) * WIDTH_PX;
  const cy = (zAt((logo.f[0] + logo.f[1]) / 2) / EXG.length + 0.5) * HEIGHT_PX;
  const length = (logo.f[1] - logo.f[0]) * EXG.length * pxPerMetre;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = logo.colour;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 100px ${FONT}`;
  const measured = ctx.measureText(logo.maker).width;
  ctx.font = `600 ${(100 * length) / measured}px ${FONT}`;
  ctx.fillText(logo.text, 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** The wheel's rubber: ribs across its tread, so a turn shows. */
export function makeWheelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#26272b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#121315";
  const ribs = 24;
  for (let i = 0; i < ribs; i++) ctx.fillRect((i * canvas.width) / ribs, 0, canvas.width / ribs / 2.4, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
