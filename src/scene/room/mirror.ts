import { BOARD_FRAME, PIECES, ROOM_RADIUS, SUBJECTS, pieceCentreDistance, pieceToWorld } from "./layout";

/**
 * The curve mirror (カーブミラー) — the convex mirror off a street corner —
 * hung over the investigation board's top right corner (the user's choice,
 * 2026-10-02). The reader is the room's owner and sees the room through
 * their own eyes; this is one of the places they see themselves
 * (docs/room-migration.md, "自分自身の見え方").
 *
 * The glass is a cap cut from a sphere (`curvature`), turned to face the
 * middle of the room, so from the centre it shows the reader whole — small,
 * the way a curve mirror shows a street.
 */

type Vec3 = [number, number, number];

/**
 * **Provisional (仮).** Twice the first one's diameter (the user, 2026-10-02):
 * 96 cm across will not fit between the board's top (2.35 m) and the neon
 * strip round the top of the wall (2.98 m), so it hangs in front of the
 * board's top right corner rather than clear above it.
 */
export const CURVE_MIRROR = {
  /** The middle of the glass, in the board's frame: this far right of the board's middle… */
  x: PIECES.board.width / 2 + 0.15,
  /** …and this far above the top of its frame. */
  above: 0.07,
  /**
   * How far the bracket holds the glass out from the wall. Tilted down to
   * face the room, the mirror's top leans back towards the wall: at 30 cm
   * the top of its back went 6 cm into it.
   */
  standOff: 0.45,
  /** The rim's radius. */
  radius: 0.48,
  /** The radius of the sphere the glass is cut from: about a 120° view, like a road mirror's. */
  curvature: 1.0,
  /** How far the orange back stands behind the rim. */
  back: 0.055,
  /** What it is turned to face: the middle of the room, at chest height. */
  aim: [0, 1.25, 0] as Vec3,
} as const;

/** The angle, in radians, from the glass's middle to its rim, seen from the sphere's centre. */
export function mirrorCapAngle(): number {
  return Math.asin(CURVE_MIRROR.radius / CURVE_MIRROR.curvature);
}

/** How far behind the glass's middle its rim is: the depth of the bulge. */
export function mirrorRimDepth(): number {
  return CURVE_MIRROR.curvature * (1 - Math.cos(mirrorCapAngle()));
}

/**
 * Where the mirror hangs, in world coordinates: where its bracket meets the
 * wall, the middle of the glass, and the way the glass faces (unit length).
 */
export function curveMirror(): { mount: Vec3; centre: Vec3; normal: Vec3 } {
  const { x, above, standOff, aim } = CURVE_MIRROR;
  const y = SUBJECTS.experience.local[1] + BOARD_FRAME.height / 2 + above;
  // The board's back is flat; the wall behind it curves away. Where the wall
  // is, this far to the side, in the board's frame (+Z towards the centre).
  const wallZ = pieceCentreDistance(PIECES.board) - Math.sqrt(ROOM_RADIUS * ROOM_RADIUS - x * x);
  const mount = pieceToWorld(PIECES.board, [x, y, wallZ]);
  const centre = pieceToWorld(PIECES.board, [x, y, wallZ + standOff]);
  const d = [aim[0] - centre[0], aim[1] - centre[1], aim[2] - centre[2]];
  const length = Math.hypot(d[0], d[1], d[2]);
  return { mount, centre, normal: [d[0] / length, d[1] / length, d[2] / length] };
}
