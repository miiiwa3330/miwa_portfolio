import * as THREE from "three";
import { HOLO_FAN } from "../room/layout";
import { CLOCK, clockEmPx, clockGlyphs } from "../room/holoFan";

/**
 * The hologram fan's picture (`room/holoFan.ts`): the time in solid figures
 * on black, at the fan's own 512 × 512 px. Black is where no LED is lit —
 * the picture is added onto the room (`HoloFan`), so it shows through.
 *
 * Each figure is drawn back to front: its depth as layers stepping from the
 * back face to the front one, darkening towards the back, and then the
 * front face, lit from above, with a bright edge.
 */

/** How many layers draw a figure's depth. */
const LAYERS = 14;
const FONT = '"Helvetica Neue", Arial, sans-serif';
const SIDE_BACK = new THREE.Color("#05323a");
const SIDE_FRONT = new THREE.Color("#0f7c88");

export function makeFanPicture(): { texture: THREE.CanvasTexture; draw: (text: string, turn: number) => void } {
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

  const draw = (text: string, turn: number) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, size, size);
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
      ctx.fillStyle = `#${side.copy(SIDE_BACK).lerp(SIDE_FRONT, f).getHexString()}`;
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
      const lit = ctx.createLinearGradient(0, -baseline, 0, baseline);
      lit.addColorStop(0, "#f2feff");
      lit.addColorStop(0.45, "#5fe6ff");
      lit.addColorStop(1, "#1a8fd6");
      ctx.fillStyle = lit;
      ctx.fillText(g.char, 0, baseline);
      ctx.strokeStyle = "#c8f8ff";
      ctx.lineWidth = em * 0.018;
      ctx.strokeText(g.char, 0, baseline);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    texture.needsUpdate = true;
  };
  return { texture, draw };
}
