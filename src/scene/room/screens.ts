import { MONITOR_SCREEN, PIECES, horizontalAt, monitorFace, pieceToWorld, type PieceKey } from "./layout";

/**
 * Flat things in the room that carry HTML: the PC's screen now, the
 * hologram's text in step 5 (docs/room-migration.md).
 *
 * A panel is a rectangle in world space with a size in metres and a size in
 * CSS px. The HTML is laid out at the px size, and the CSS 3D layer
 * (`camera/cssView.ts`) scales it into the metres — so the GUI is designed at
 * a fixed resolution, the way a real screen is.
 */

export type Vec3 = [number, number, number];

export type Panel = {
  /** The centre of the rectangle, in world metres. */
  centre: Vec3;
  /** World unit vectors: to the right and up as the panel reads, and out of its face. */
  right: Vec3;
  up: Vec3;
  normal: Vec3;
  width: number;
  height: number;
  pxWidth: number;
  pxHeight: number;
};

/**
 * A panel standing in a piece's frame at `local`, turned `yaw` radians about
 * its own vertical — the same turn a three.js group's `rotation.y` gives it.
 */
export function piecePanel(
  piece: PieceKey,
  local: Vec3,
  yaw: number,
  size: { width: number; height: number },
  px: { width: number; height: number }
): Panel {
  const [fx, fz] = horizontalAt(PIECES[piece].angle);
  // The piece's own axes in the world: +X to the right seen from the room's
  // centre, +Z back towards the centre (`pieceToWorld`).
  const x: Vec3 = [-fz, 0, fx];
  const z: Vec3 = [-fx, 0, -fz];
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    centre: pieceToWorld(PIECES[piece], local),
    right: [c * x[0] - s * z[0], 0, c * x[2] - s * z[2]],
    up: [0, 1, 0],
    normal: [s * x[0] + c * z[0], 0, s * x[2] + c * z[2]],
    width: size.width,
    height: size.height,
    pxWidth: px.width,
    pxHeight: px.height,
  };
}

/**
 * The PC's screen, at the resolution its GUI is laid out in.
 *
 * 1240 × 760 is the prototype's (`sandbox/room-lab.html`): at the seated zoom
 * its 22px body text read comfortably, and the ratio is the screen's own
 * (0.62 × 0.38 m), so the HTML fills it exactly.
 */
export const DESK_SCREEN_PX = { width: 1240, height: 760 } as const;

const gui = monitorFace("gui");
export const DESK_SCREEN: Panel = piecePanel("desk", gui.centre, gui.yaw, MONITOR_SCREEN, DESK_SCREEN_PX);
