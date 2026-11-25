/**
 * Pure real-world dimensions and placement math for Japan Post's standard
 * rectangular red mailbox — "郵便差出箱13号" (Type 13 postbox, 1996+ spec):
 *
 * - Main box body: width 81 cm, height 83 cm, depth 56 cm
 * - Black steel pedestal leg: height 55 cm, diameter 17 cm (radius 8.5 cm)
 * - Dual mail slots: width 29 cm × height 4 cm each, side by side
 * - Standard colour: Postal Red (Munsell ~7.5R 4/14 → `#c81d18`)
 *
 * Kept free of three.js and React so footprint, slot geometry, and top-surface
 * letter/pencil placement are verified directly by unit tests.
 */

/** Official Japan Post Type-13 postal red (Munsell ~7.5R 4/14). */
export const POSTBOX_RED = "#c81d18";
export const POSTBOX_LEG_BLACK = "#1c1f24";
export const POSTBOX_SLOT_METAL = "#cfd5dc";

export const POSTBOX_BODY = {
  width: 0.72,
  height: 0.74,
  depth: 0.5,
  cornerRadius: 0.024,
} as const;

export const POSTBOX_LEG = {
  height: 0.42,
  radius: 0.08,
  baseWidth: 0.34,
  baseDepth: 0.34,
  baseHeight: 0.024,
} as const;

/** World/piece Y coordinate of the top surface of the postbox body (m). */
export const POSTBOX_TOP_Y = POSTBOX_LEG.height + POSTBOX_BODY.height;

/** World/piece Y coordinate of the centre of the red box body (m). */
export const POSTBOX_BODY_CENTER_Y = POSTBOX_LEG.height + POSTBOX_BODY.height / 2;

export type PostboxSlotSpec = {
  id: "left" | "right";
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Dual mail slots on the upper front face. */
export const POSTBOX_SLOTS: readonly PostboxSlotSpec[] = [
  {
    id: "left",
    x: -0.17,
    y: POSTBOX_TOP_Y - 0.125,
    width: 0.255,
    height: 0.038,
  },
  {
    id: "right",
    x: 0.17,
    y: POSTBOX_TOP_Y - 0.125,
    width: 0.255,
    height: 0.038,
  },
] as const;

/** Letter writing set placed atop the flat red postbox roof (`y = POSTBOX_TOP_Y`). */
export const LETTER_SET = {
  underPaper: {
    width: 0.2,
    depth: 0.25,
    thickness: 0.002,
    x: -0.11,
    z: 0.035,
    yaw: 0.07,
  },
  topPaper: {
    width: 0.2,
    depth: 0.25,
    thickness: 0.0024,
    x: -0.09,
    z: 0.055,
    yaw: 0.19,
  },
  envelope: {
    width: 0.21,
    depth: 0.11,
    thickness: 0.0055,
    x: 0.145,
    z: 0.075,
    yaw: -0.26,
  },
  pencil: {
    length: 0.175,
    radius: 0.006,
    x: 0.015,
    z: 0.07,
    yaw: 0.56,
  },
} as const;

/** Compute the 2D axis-aligned bounding half-extents of a rotated rectangle `(w × d)` on the roof. */
export function rotatedFootprintHalfExtents(
  width: number,
  depth: number,
  yaw: number
): [number, number] {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  return [(width * c + depth * s) / 2, (width * s + depth * c) / 2];
}
