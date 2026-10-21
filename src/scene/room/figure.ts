/**
 * The room owner's figure, measured off the character sheet
 * (`reference/4/3.png`, Studio Wrong's look — docs/room-migration.md,
 * "自分自身の見た目の参考"): the front view of its turnaround, ground at
 * y = 841 px, top of the hair at y = 485 px. The user set the height at
 * 168 cm and kept the sheet's proportions — a head a little large for the
 * body, 5.8 heads tall (2026-10-02) — so every height below is the sheet's
 * share of its 356 px times 1.68 m.
 *
 * **The eye this puts at 1.49 m is the camera's** (`EYE_HEIGHT` reads it):
 * the reader looks out of this figure's eyes. Measured, not chosen.
 *
 * Nothing here imports the room: the room's numbers that depend on the body
 * (the eye, the chair's seat and back) are read from here.
 */

/** The sheet, in px of `reference/4/3.png`, front view. */
export const SHEET = {
  ground: 841,
  top: 485,
  /** The pupils, behind the glasses. */
  eye: 525,
  chin: 546,
  /** Where the neck meets the shoulders' slope. */
  neckBase: 556,
  /** The shoulders' points, where the sleeves start. */
  shoulder: 566,
  /** The top of the trousers, from the side view (y 658): the hip joint is under the cloth, a little below. */
  waist: 658,
  /** The trousers' crotch, from the back view, where light shows between the legs: a dropped one. */
  crotch: 718,
  /** Widths: the hair round the head, the T-shirt across the shoulders, one trouser leg, and the legs' centres apart. */
  hairWidth: 66,
  faceWidth: 44,
  shoulderWidth: 64,
  sleevesWidth: 96,
  legWidth: 38,
  legsApart: 41,
  /** One sneaker across, front view. */
  shoeWidth: 40,
} as const;

/** **The user's choice** (2026-10-02): about 168 cm. */
export const STATURE = 1.68;

const PX = STATURE / (SHEET.ground - SHEET.top);
const height = (y: number) => (SHEET.ground - y) * PX;
const width = (px: number) => px * PX;

/**
 * The hip joint, estimated: it is under the trousers on the sheet. 0.46 of
 * the height — 9 cm under the waistband (0.514), which sits low on loose
 * trousers, and 19 cm over their dropped crotch (0.345).
 */
const HIP_SHARE = 0.46;

export const FIGURE = {
  stature: STATURE,
  eye: height(SHEET.eye),
  chin: height(SHEET.chin),
  neckBase: height(SHEET.neckBase),
  shoulder: height(SHEET.shoulder),
  hip: STATURE * HIP_SHARE,
  waist: height(SHEET.waist),
  crotch: height(SHEET.crotch),
  /** Half-widths. */
  hairHalf: width(SHEET.hairWidth) / 2,
  faceHalf: width(SHEET.faceWidth) / 2,
  shoulderHalf: width(SHEET.shoulderWidth) / 2,
  sleevesHalf: width(SHEET.sleevesWidth) / 2,
  legRadius: width(SHEET.legWidth) / 2,
  hipHalf: width(SHEET.legsApart) / 2,
  shoeWidth: width(SHEET.shoeWidth),
} as const;

/** From the eye down to the base of the neck. */
export const NECK_DROP = FIGURE.eye - FIGURE.neckBase;
/** From the base of the neck to the hip joints, along the spine. */
export const TORSO = FIGURE.neckBase - FIGURE.hip;
/** How far the eye stands in front of the base of the neck. */
export const NECK_BACK = 0.05;

/**
 * **Provisional (仮).** Sat at the PC, the body leans forward over the desk
 * this far, at the hips (radians). The figure's tall body for its legs —
 * that large head — would put the eye at 1.35 m sitting up straight on an
 * ordinary chair; leaning in, a little round-shouldered the way the sheet's
 * café scene sits, brings it down to the seated eye the PC was framed at.
 */
export const SEATED_LEAN = (13 * Math.PI) / 180;
/** How far the hip joints sit above the chair's cushion: the seat of the trousers and what is under it. */
export const HIP_OVER_SEAT = 0.08;
/** How far the back of the seated body stands behind its hip joints. */
export const PELVIS_BACK = 0.12;

/** Sat leaning in: from the eye down to the hip joints, and back to them. */
export function seatedHipsFromEye(): { down: number; back: number } {
  return { down: NECK_DROP + TORSO * Math.cos(SEATED_LEAN), back: NECK_BACK + TORSO * Math.sin(SEATED_LEAN) };
}
