import { HOLO_FAN } from "./layout";

/**
 * What the hologram fan shows (`HOLO_FAN`, `objects/HoloFan.tsx`): the time,
 * as `HH:MM:SS` (2026-10-25, the user), in figures drawn as solids — a front
 * face, sides and tops — swaying slowly round the upright so their sides
 * come and go. That is how a real fan's pictures read as 3D: the picture is
 * flat, in the blades' sweep, and the solidity is in what is drawn (the
 * user chose this over figures standing out of the fan).
 *
 * Laid out in ems of the figures' font, centred on the fan's middle, +X right
 * and +Y **down** (the canvas's way).
 */

export const CLOCK = {
  /** How far along each character steps: the digits are tabular, so the time never jiggles as it ticks. */
  advance: { digit: 0.62, colon: 0.34 },
  /** Half the figures' height (a digit stands about 0.72 em). */
  halfHeight: 0.36,
  /** How deep the figures are. **仮** */
  depth: 0.32,
  /** Looked at from this far above (radians), so the tops show even with no sway. **仮** */
  elevation: 0.3,
  /** How far the eye is from the figures, for their perspective. **仮** */
  eye: 9,
  /** The sway round the upright: how far either way (radians) and how long a swing there and back takes (seconds). **仮** */
  sway: { amplitude: 0.6, period: 9 },
  /** How much of the fan's radius the figures may reach, whichever way they are turned. **仮** */
  fill: 0.88,
} as const;

/** The time as the fan shows it: 24-hour `HH:MM:SS`, by the reader's own clock. */
export function clockText(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

/** How far the figures are turned round the upright at time `t` (seconds). */
export function clockSway(t: number): number {
  return CLOCK.sway.amplitude * Math.sin((2 * Math.PI * t) / CLOCK.sway.period);
}

/** One face of a figure on the canvas: its middle, and how much it is squeezed across and down. */
export type GlyphFace = { x: number; y: number; sx: number; sy: number };
export type Glyph = { char: string; front: GlyphFace; back: GlyphFace };

const advanceOf = (char: string) => (char === ":" ? CLOCK.advance.colon : CLOCK.advance.digit);

/** A point of the figures (X right, Y up, Z out of the picture, in ems) turned by `turn`, seen from `CLOCK.elevation` above, on the canvas. */
function project(X: number, Y: number, Z: number, turn: number): { x: number; y: number; scale: number } {
  const x1 = X * Math.cos(turn) + Z * Math.sin(turn);
  const z1 = -X * Math.sin(turn) + Z * Math.cos(turn);
  const e = CLOCK.elevation;
  const y2 = Y * Math.cos(e) - z1 * Math.sin(e);
  const z2 = Y * Math.sin(e) + z1 * Math.cos(e);
  const scale = CLOCK.eye / (CLOCK.eye - z2);
  return { x: x1 * scale, y: -y2 * scale, scale };
}

/** Each character's front and back faces, turned by `turn`. */
export function clockGlyphs(text: string, turn: number): Glyph[] {
  const width = [...text].reduce((sum, c) => sum + advanceOf(c), 0);
  let left = -width / 2;
  return [...text].map((char) => {
    const X = left + advanceOf(char) / 2;
    left += advanceOf(char);
    const face = (Z: number): GlyphFace => {
      const p = project(X, 0, Z, turn);
      return { x: p.x, y: p.y, sx: Math.cos(turn) * p.scale, sy: Math.cos(CLOCK.elevation) * p.scale };
    };
    return { char, front: face(0), back: face(-CLOCK.depth) };
  });
}

/** How far from the fan's middle the furthest corner of any figure is, turned by `turn` (ems). */
export function clockReach(text: string, turn: number): number {
  const width = [...text].reduce((sum, c) => sum + advanceOf(c), 0);
  let reach = 0;
  for (const X of [-width / 2, width / 2])
    for (const Y of [-CLOCK.halfHeight, CLOCK.halfHeight])
      for (const Z of [0, -CLOCK.depth]) {
        const p = project(X, Y, Z, turn);
        reach = Math.max(reach, Math.hypot(p.x, p.y));
      }
  return reach;
}

/**
 * The figures' em in the fan's picture (px): as large as lets every corner
 * stay inside `CLOCK.fill` of the radius over the whole sway. Every time
 * has the same layout (the digits are tabular), so one is measured.
 */
export function clockEmPx(): number {
  let worst = 0;
  for (let i = 0; i <= 512; i++) worst = Math.max(worst, clockReach("00:00:00", CLOCK.sway.amplitude * (2 * i / 512 - 1)));
  return (CLOCK.fill * HOLO_FAN.px) / 2 / worst;
}

/** How many rings a real fan draws its picture in: one for each LED on a blade, from the middle out (128 for the SH-30's 256 across). */
export const LED_RINGS = HOLO_FAN.leds / 2;

/**
 * How many rings the picture is drawn in here: coarser than the real fan's
 * on purpose (2026-10-25, the user: 「あえて画質（サークルの量を減らす）を
 * 落として…もう少し遠目でもそれがわかるように」). The rings are what tells a
 * fan's picture from any other 3D; at 128 they showed only close up. **仮**
 */
export const PICTURE_RINGS = 48;

/**
 * How the blades are seen going round (2026-10-25, the user: 「本来、高速に
 * 棒が回っていて、あんまり視認できませんが、何かが回っている感は見てわかる
 * もの」). At 800 rpm the two blades pass a point 27 times a second, and a
 * frame (60 a second) catches them 80° on each time — drawn as they are, they
 * would be noise. What an eye or a camera keeps is a faint shadow of the bar
 * that seems to go round slowly, a smear trailing behind it, and the picture
 * a touch brighter where the LEDs have just been. So the shadow is drawn
 * going round at `apparentRate`, not at the real speed: **a look, not a
 * measurement — every value here is 仮.**
 */
export const BLADES = {
  count: 2,
  /** How many turns a second the shadow seems to make, anticlockwise seen from the front. */
  apparentRate: 1.4,
  /** The bar's width (m): an LED strip on its board. */
  width: 0.022,
  /** How dark: the whole sweep (what the eye keeps of it), the bar's shadow, and the smear just behind it. */
  sweepOpacity: 0.14,
  barOpacity: 0.55,
  smearOpacity: 0.32,
  /** How far behind the bar the smear and the fresh light fade over (radians). */
  smearFade: 0.9,
  /** How much brighter the picture is just behind the bar than across from it. */
  freshLight: 0.22,
  /**
   * How strong the sweep's edge is: the light ring the tips draw, and the
   * dark band they make seen edge-on. Made fainter at the user's word
   * (2026-10-25: 「縁の端の白と黒を薄くして」; they were 0.22 and 0.55).
   */
  tipOpacity: 0.08,
  edgeOpacity: 0.18,
} as const;

/** Where the first blade is at time `t` (seconds), in radians anticlockwise from +X seen from the front, in [0, 2π). */
export function bladeAngle(t: number): number {
  const turns = BLADES.apparentRate * t;
  return 2 * Math.PI * (turns - Math.floor(turns));
}
