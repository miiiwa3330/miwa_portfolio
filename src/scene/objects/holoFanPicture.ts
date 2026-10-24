import * as THREE from "three";
import { HOLO_FAN } from "../room/layout";
import { ABOUT_ROLL, CLOCK, clockEmPx, clockGlyphs, wrapAbout, type RolledLine } from "../room/holoFan";

/**
 * The hologram fan's picture (`room/holoFan.ts`), at the fan's own 512 × 512
 * px, on black. Black is where no LED is lit — the picture is added onto
 * the room (`HoloFan`), so it shows through.
 *
 * Two things are drawn, both as solids: the time, each figure back to front
 * — its depth as layers stepping from the back face to the front one,
 * darkening towards the back, then the front face, lit from above, with a
 * bright edge; and the self-introduction rolling up, its lines drawn the same
 * way, seen from a little above (no sway: text that turns is hard to read).
 */

/** How many layers draw a figure's depth, and a line's. */
const LAYERS = 14;
const LINE_LAYERS = 8;
const FONT = '"Helvetica Neue", Arial, sans-serif';
const TEXT_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Helvetica Neue", Arial, sans-serif';
const SIDE_BACK = new THREE.Color("#05323a");
const SIDE_FRONT = new THREE.Color("#0f7c88");

export type FanPicture = {
  texture: THREE.CanvasTexture;
  /** The time, its figures turned by `turn`. */
  draw: (text: string, turn: number) => void;
  /** Wraps the self-introduction to the fan's width, in its own font; returns the lines. */
  wrap: (paragraphs: readonly string[]) => string[];
  /** The self-introduction's lines in view (`rollAbout`). */
  drawRoll: (lines: readonly string[], rolled: readonly RolledLine[]) => void;
};

export function makeFanPicture(): FanPicture {
  const size = HOLO_FAN.px;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const em = clockEmPx();
  const mid = size / 2;
  const side = new THREE.Color();
  const sideColour = (f: number) => `#${side.copy(SIDE_BACK).lerp(SIDE_FRONT, f).getHexString()}`;
  /** The front faces' light, from above, over a face `half` tall either side of its middle. */
  const frontLight = (half: number) => {
    const lit = ctx.createLinearGradient(0, -half, 0, half);
    lit.addColorStop(0, "#f2feff");
    lit.addColorStop(0.45, "#5fe6ff");
    lit.addColorStop(1, "#1a8fd6");
    return lit;
  };
  const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);
  };

  const draw = (text: string, turn: number) => {
    clear();
    ctx.font = `700 ${em}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const glyphs = clockGlyphs(text, turn);
    // A face of a figure: moved to its middle and squeezed as it is turned, the baseline half its height down.
    const place = (face: { x: number; y: number; sx: number; sy: number }) => {
      ctx.setTransform(face.sx, 0, 0, face.sy, mid + face.x * em, mid + face.y * em);
    };
    const baseline = CLOCK.halfHeight * em;
    for (let k = 0; k < LAYERS; k++) {
      const f = k / LAYERS;
      ctx.fillStyle = sideColour(f);
      for (const g of glyphs) {
        place({
          x: g.back.x + (g.front.x - g.back.x) * f,
          y: g.back.y + (g.front.y - g.back.y) * f,
          sx: g.back.sx + (g.front.sx - g.back.sx) * f,
          sy: g.back.sy + (g.front.sy - g.back.sy) * f,
        });
        ctx.fillText(g.char, 0, baseline);
      }
    }
    for (const g of glyphs) {
      place(g.front);
      ctx.fillStyle = frontLight(baseline);
      ctx.fillText(g.char, 0, baseline);
      ctx.strokeStyle = "#c8f8ff";
      ctx.lineWidth = em * 0.018;
      ctx.strokeText(g.char, 0, baseline);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    texture.needsUpdate = true;
  };

  const textFont = `700 ${ABOUT_ROLL.em}px ${TEXT_FONT}`;
  const wrap = (paragraphs: readonly string[]) => {
    ctx.font = textFont;
    return wrapAbout(paragraphs, ABOUT_ROLL.width, (text) => ctx.measureText(text).width);
  };

  // A line's depth, seen from `CLOCK.elevation` above: the back face sits this far up.
  const rise = CLOCK.depth * ABOUT_ROLL.em * Math.sin(CLOCK.elevation);
  const drawRoll = (lines: readonly string[], rolled: readonly RolledLine[]) => {
    clear();
    ctx.font = textFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const line of rolled) {
      const text = lines[line.index];
      if (!text) continue;
      ctx.globalAlpha = line.alpha;
      const y = mid + line.y;
      for (let k = 0; k < LINE_LAYERS; k++) {
        const f = k / LINE_LAYERS;
        ctx.fillStyle = sideColour(f);
        ctx.setTransform(1, 0, 0, 1, mid, y - rise * (1 - f));
        ctx.fillText(text, 0, 0);
      }
      ctx.setTransform(1, 0, 0, 1, mid, y);
      ctx.fillStyle = frontLight(ABOUT_ROLL.em / 2);
      ctx.fillText(text, 0, 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  };

  return { texture, draw, wrap, drawRoll };
}
