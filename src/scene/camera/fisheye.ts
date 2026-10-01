import type { Direction } from "../planet/geometry";

/**
 * The fisheye view's lens: a stereographic projection, filling the frame's
 * width with `hfov` degrees.
 *
 * Stereographic was the user's pick in `sandbox/room-lab.html` (2026-10-01)
 * over equidistant: it keeps small things their own shape all the way to the
 * edge (it is conformal), where equidistant squeezes them radially — to about
 * 0.70 of their width at 161°. The price is that the centre of the frame comes
 * out smaller and the edges larger.
 *
 * **The fisheye shader has to compute exactly `unprojectStereographic`**, pixel
 * by pixel, and markers placed on screen use `projectStereographic`. If the
 * two ever disagree, the leader lines from the cards point beside the markers.
 *
 * Camera space throughout: +X right, +Y up, looking down -Z.
 * Screen positions are normalised device coordinates, -1..1 on both axes.
 */

/** How far from the frame's centre, in half-widths, a ray `theta` off the view axis lands. */
export function stereographicRadius(theta: number, halfHFov: number): number {
  return Math.tan(theta / 2) / Math.tan(halfHFov / 2);
}

/** The inverse: the angle off the view axis of a point `r` half-widths from the centre. */
export function stereographicTheta(r: number, halfHFov: number): number {
  return 2 * Math.atan(r * Math.tan(halfHFov / 2));
}

/**
 * Where a camera-space direction lands on screen, or `null` if it is behind
 * the lens (stereographic sends the point straight behind to infinity).
 */
export function projectStereographic(
  dir: Direction,
  halfHFov: number,
  aspect: number
): { x: number; y: number } | null {
  const [x, y, z] = dir;
  const length = Math.hypot(x, y, z);
  if (length < 1e-12) return null;
  const theta = Math.acos(Math.max(-1, Math.min(1, -z / length)));
  if (theta > Math.PI - 1e-6) return null;
  const side = Math.hypot(x, y);
  if (side < 1e-12) return { x: 0, y: 0 };
  const r = stereographicRadius(theta, halfHFov);
  // r is measured in half-widths; the frame is 1/aspect half-widths tall.
  return { x: (r * x) / side, y: ((r * y) / side) * aspect };
}

/** The camera-space unit direction seen at a screen position. */
export function unprojectStereographic(ndcX: number, ndcY: number, halfHFov: number, aspect: number): Direction {
  const px = ndcX;
  const py = ndcY / aspect;
  const r = Math.hypot(px, py);
  if (r < 1e-12) return [0, 0, -1];
  const theta = stereographicTheta(r, halfHFov);
  const s = Math.sin(theta);
  return [(s * px) / r, (s * py) / r, -Math.cos(theta)];
}
