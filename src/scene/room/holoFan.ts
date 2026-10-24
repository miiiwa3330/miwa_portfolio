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

/**
 * The self-introduction on the fan (2026-10-25, the user: the PC's
 * `自己紹介.holo` switches the fan from the clock to it; 「下から上へ流れる
 * 数行」): the text wrapped to a width inside the circle and rolled up from
 * below the fan to above it, a line at a time, fading out at the top and
 * bottom of the circle. In px of the fan's picture, from its middle, +Y
 * down. **仮**: every size and the rate.
 */
export const ABOUT_ROLL = {
  /** The text's em (px): about ten full-width characters to a line. */
  em: 38,
  /** One line to the next, in ems. */
  leading: 1.45,
  /** How wide a line may run (px): the circle's chord 0.45 of its radius off the middle. */
  width: 2 * Math.sqrt(1 - 0.45 ** 2) * (HOLO_FAN.px / 2) * 0.92,
  /** How fast it rolls, in lines a second: about 6 characters a second. */
  rate: 0.6,
  /** How far in from the circle's edge a line has faded out, and over how much it fades (px). */
  fadeFrom: 0.88 * (HOLO_FAN.px / 2),
  fadeOver: 46,
} as const;

/** Characters that may not begin a line: they hang off the end of the line before (ぶら下げ). */
const NO_LINE_START = "、。，．・：；？！ー」』）】〉》ｰ,.:;?!)]}'\"";

/**
 * The paragraphs wrapped to `width` by `measure`, with an empty line between
 * paragraphs. Full-width text breaks between any two characters; Latin text
 * between words. A closing mark never begins a line: it hangs off the line
 * before.
 */
export function wrapAbout(paragraphs: readonly string[], width: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  paragraphs.forEach((paragraph, p) => {
    if (p > 0) lines.push("");
    // Words of Latin letters stay whole; anything else is a token of its own.
    const tokens = paragraph.match(/[A-Za-z0-9'’\-]+\s*|\s+|./gu) ?? [];
    let line = "";
    for (const token of tokens) {
      const next = line + token;
      if (line !== "" && measure(next.trimEnd()) > width && !NO_LINE_START.includes(token[0])) {
        lines.push(line.trimEnd());
        line = token.trimStart();
      } else line = next;
    }
    if (line.trim() !== "") lines.push(line.trimEnd());
  });
  return lines;
}

/** One line of the roll in view: which, where its middle is (px from the fan's middle, +Y down), and how bright. */
export type RolledLine = { index: number; y: number; alpha: number };

/**
 * The lines in view `t` seconds after the roll began, and whether it is over
 * (the last line gone off the top). The first line comes in from below the
 * fan, so the roll starts empty and ends empty.
 */
export function rollAbout(lineCount: number, t: number): { lines: RolledLine[]; done: boolean } {
  const step = ABOUT_ROLL.em * ABOUT_ROLL.leading;
  const edge = ABOUT_ROLL.fadeFrom + step;
  // The first line's middle: from just below the faded edge, up at `rate` lines a second.
  const first = edge - Math.max(0, t) * ABOUT_ROLL.rate * step;
  const lines: RolledLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const y = first + i * step;
    if (y > edge) break;
    if (y < -edge) continue;
    const alpha = Math.min(1, Math.max(0, (ABOUT_ROLL.fadeFrom - Math.abs(y)) / ABOUT_ROLL.fadeOver));
    if (alpha > 0) lines.push({ index: i, y, alpha });
  }
  return { lines, done: first + (lineCount - 1) * step < -edge };
}
