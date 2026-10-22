import {
  MONITOR_SCREEN,
  PIECES,
  SUBJECTS,
  horizontalAt,
  monitorFace,
  pieceCentreDistance,
  pieceToWorld,
  type PieceKey,
} from "./layout";

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
 * 1240 × 760 is the prototype's (the room-lab prototype): at the seated zoom
 * its 22px body text read comfortably, and the ratio is the screen's own
 * (0.62 × 0.38 m), so the HTML fills it exactly.
 */
export const DESK_SCREEN_PX = { width: 1240, height: 760 } as const;

const gui = monitorFace("gui");
export const DESK_SCREEN: Panel = piecePanel("desk", gui.centre, gui.yaw, MONITOR_SCREEN, DESK_SCREEN_PX);

/**
 * The hologram's text, standing in the air over the device on the desk and
 * turned to face the middle of the room — so the zoom, which steps out along
 * the line from the centre to it, meets it square on.
 *
 * Drawn in front of the canvas (`RoomHtmlLayer`, no cut-out): a hologram has
 * to let the room show through it, and nothing stands between it and the
 * reader, from the middle or from the zoom (prototype 2). **Keep it that
 * way** — anything placed in front of it would be drawn behind the text.
 *
 * **Provisional (仮)** size: 0.56 × 0.54 m, about the width the zoom frames
 * (`SUBJECTS.about.frameWidth` at 70% of the view) and no taller than 80% of
 * the view at that distance, which leaves the header and the HOME button
 * clear — at 0.63 m its top ran under the header. Laid out at 640 × 617 px,
 * which the zoom draws at about its own size on a 1600px frame.
 */
export const HOLOGRAM_PX = { width: 640, height: 617 } as const;
export const HOLOGRAM_SIZE = { width: 0.56, height: 0.54 } as const;

const holo = SUBJECTS.about.local;
// The room's centre, in the desk's own frame, is straight out along +Z at the
// desk's distance; turn the panel's face to it.
const holoYaw = Math.atan2(-holo[0], pieceCentreDistance(PIECES.desk) - holo[2]);
export const HOLOGRAM_PANEL: Panel = piecePanel("desk", [holo[0], holo[1], holo[2]], holoYaw, HOLOGRAM_SIZE, HOLOGRAM_PX);

/**
 * Where a ray from `origin` along `dir` (world) meets a panel, in the
 * panel's CSS px from its top left — or null if it misses: parallel, behind
 * the origin, from behind the panel, or outside its rectangle. The mouse
 * uses it to put the PC's cursor under the reader's own pointer.
 */
export function panelPoint(panel: Panel, origin: Vec3, dir: Vec3): { x: number; y: number } | null {
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const facing = dot(dir, panel.normal);
  if (facing >= 0) return null;
  const toCentre: Vec3 = [panel.centre[0] - origin[0], panel.centre[1] - origin[1], panel.centre[2] - origin[2]];
  const t = dot(toCentre, panel.normal) / facing;
  if (t <= 0) return null;
  const hit: Vec3 = [origin[0] + dir[0] * t - panel.centre[0], origin[1] + dir[1] * t - panel.centre[1], origin[2] + dir[2] * t - panel.centre[2]];
  const across = dot(hit, panel.right) / panel.width + 0.5;
  const down = 0.5 - dot(hit, panel.up) / panel.height;
  if (across < 0 || across > 1 || down < 0 || down > 1) return null;
  return { x: across * panel.pxWidth, y: down * panel.pxHeight };
}
