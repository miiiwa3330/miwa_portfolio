import { cameraBasis, lensBends, placeCamera, projectionLiftPx, projectionShiftPx, toCameraSpace, type RoomPose } from "./roomCamera";
import type { Panel } from "../room/screens";

/**
 * HTML placed in the room: the CSS 3D transforms that put a panel of HTML
 * where the WebGL camera sees its rectangle, so the two line up to the pixel.
 *
 * The same construction as three.js's `CSS3DRenderer` (which
 * `sandbox/room-lab.html` used), written out as plain arithmetic so it can be
 * tested:
 *
 *     layer   perspective: f px, perspective-origin at the frame's centre
 *      └ camera   transform: translateZ(f) · view · translate(w/2, h/2)
 *         └ panel    transform: translate(-50%, -50%) · panel's world matrix
 *
 * where `f` is the focal length in px, and `view` is the camera's view matrix
 * with its y row turned over (CSS's y grows down, the room's grows up). The
 * panel's world matrix likewise turns its y column over, so the HTML's own
 * top-to-bottom runs down the panel.
 *
 * **Why not drei's `<Html transform>`, which is the same construction.** It
 * centres its perspective on the frame and reads only the projection's
 * vertical scale, so a camera whose projection is shifted — the room's always
 * is, to clear the card (`RoomPose.share`, and `lift` on a phone) — draws the
 * HTML off from where WebGL draws the screen. Here the shift moves the
 * perspective's origin and the camera together, which is exactly a slide of
 * the finished picture. It also leaves the canvas alone: drei's
 * `occlude="blending"` rewrites the canvas element's own z-index, position and
 * pointer-events.
 *
 * **The world is drawn at `CSS_UNITS` px a metre.** Writing metres straight
 * into the matrices (a scale of a few thousandths on the panel) drew
 * correctly in the prototype; it was dropped there while chasing a hit-test
 * bug whose cause turned out to be `overflow: hidden` (docs/room-migration.md),
 * and is kept out here so that a tiny scale is never a suspect again.
 */

export const CSS_UNITS = 1000;

/** A CSS `matrix3d`, column-major — the same order as three.js's `Matrix4.elements`. */
export type Mat4 = number[];

/** The focal length, in px, of a perspective that spans `hfov` degrees across `width` px. */
export function focalPx(hfovDeg: number, width: number): number {
  return width / 2 / Math.tan((hfovDeg * Math.PI) / 360);
}

/**
 * The camera's view matrix in the CSS layer's terms: world (scaled by
 * `CSS_UNITS`) to camera space, with y turned over.
 */
export function cssViewMatrix(pose: RoomPose): Mat4 {
  const { right, up, forward } = cameraBasis(pose);
  const { position } = placeCamera(pose);
  const p = position.map((v) => v * CSS_UNITS);
  const dot = (a: readonly number[]) => a[0] * p[0] + a[1] * p[1] + a[2] * p[2];
  // Rows: right, -up (CSS y is down), -forward (camera space looks down -Z).
  const rows = [right, up.map((v) => -v), forward.map((v) => -v)];
  const t = rows.map((row) => -dot(row));
  return [
    rows[0][0], rows[1][0], rows[2][0], 0,
    rows[0][1], rows[1][1], rows[2][1], 0,
    rows[0][2], rows[1][2], rows[2][2], 0,
    t[0], t[1], t[2], 1,
  ];
}

/** A panel's world matrix in the CSS layer's terms: px of its HTML to scaled world, y turned over. */
export function cssPanelMatrix(panel: Panel): Mat4 {
  const scale = (panel.width * CSS_UNITS) / panel.pxWidth;
  const [r, u, n] = [panel.right, panel.up, panel.normal];
  const c = panel.centre.map((v) => v * CSS_UNITS);
  return [
    r[0] * scale, r[1] * scale, r[2] * scale, 0,
    -u[0] * scale, -u[1] * scale, -u[2] * scale, 0,
    n[0] * scale, n[1] * scale, n[2] * scale, 0,
    c[0], c[1], c[2], 1,
  ];
}

/** Rounds away float dust that CSS would print as `1e-17`. */
function cssNumber(v: number): string {
  return Math.abs(v) < 1e-10 ? "0" : String(v);
}

export function matrix3d(m: Mat4): string {
  return `matrix3d(${m.map(cssNumber).join(",")})`;
}

/**
 * The numbers the layer and its camera element are built from: the focal
 * length, the slide of the picture for the card's shifts, and the view.
 */
export function cssCameraParts(pose: RoomPose, width: number) {
  return {
    focal: focalPx(pose.hfov, width),
    // The card's shifts, as `setViewOffset` applies them: the picture slides
    // by the same px, so both the perspective's origin and the camera move.
    dx: -projectionShiftPx(pose.share, width),
    view: cssViewMatrix(pose),
  };
}

/** The styles for the layer (perspective) and its camera element, for a frame `width` × `height` px. */
export function cssCameraStyle(
  pose: RoomPose,
  width: number,
  height: number
): { perspective: string; perspectiveOrigin: string; transform: string } {
  const { focal, dx, view } = cssCameraParts(pose, width);
  const dy = -projectionLiftPx(pose.lift, height);
  return {
    perspective: `${focal}px`,
    perspectiveOrigin: `${width / 2 + dx}px ${height / 2 + dy}px`,
    transform: `translate(${dx}px,${dy}px) translateZ(${focal}px) ${matrix3d(view)} translate(${width / 2}px,${height / 2}px)`,
  };
}

/** The transform for a panel's element, which sits at the camera element's top-left corner. */
export function cssPanelTransform(panel: Panel): string {
  return `translate(-50%,-50%) ${matrix3d(cssPanelMatrix(panel))}`;
}

/**
 * Whether a panel can be drawn at all from this pose.
 *
 * - **Only through a plain perspective.** CSS draws nothing else, so through
 *   the fisheye the HTML would sit where a perspective camera would have put
 *   it, not where the bent room is. The screen's own lit face stands in.
 * - **Only well in front of the camera**, as in the prototype: CSS's
 *   perspective can turn a panel behind the camera over and draw it huge.
 * - **Only from its front.** The back of a monitor is not a mirrored screen.
 */
export function panelShown(panel: Panel, pose: RoomPose): boolean {
  if (lensBends(pose.lens)) return false;
  const [x, y, z] = toCameraSpace(pose, panel.centre);
  const ahead = -z / Math.hypot(x, y, z);
  if (!(ahead > 0.15)) return false;
  const { position } = placeCamera(pose);
  const toCamera = [position[0] - panel.centre[0], position[1] - panel.centre[1], position[2] - panel.centre[2]];
  return panel.normal[0] * toCamera[0] + panel.normal[1] * toCamera[1] + panel.normal[2] * toCamera[2] > 0;
}
