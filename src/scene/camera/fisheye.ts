import type { Direction } from "../planet/geometry";

/**
 * The camera's lens: how a direction off the view axis lands on the screen.
 *
 *     r = tan(θ / k) / tan(H / k)
 *
 * `θ` is the angle off the view axis, `H` half the horizontal field of view,
 * and `r` the distance from the frame's centre in half-widths — so the frame's
 * left and right edges are exactly `H` off-axis, whatever `k` is.
 *
 * - **k = 1 is an ordinary perspective** (rectilinear): `r = tanθ / tanH`,
 *   which is what three.js's `PerspectiveCamera` draws.
 * - **k = 2 is the stereographic fisheye** the user picked in
 *   `sandbox/room-lab.html` (2026-10-01) over equidistant: it keeps small
 *   things their own shape all the way to the edge (it is conformal), where
 *   equidistant squeezes them radially — to about 0.70 of their width at 161°.
 *   The price is that the centre of the frame comes out smaller.
 *
 * **Why `k` is a number and not a switch.** Going from the standard view to
 * the fisheye blends `k` from 1 to 2 together with the field of view, so the
 * room bends over the length of a flight instead of swapping lenses in one
 * frame. Every `k` in between is a valid lens with the same edges.
 *
 * **The lens shader (`LENS_FRAGMENT_SHADER`) computes exactly
 * `unprojectLens`**, pixel by pixel, and the markers are placed and sized with
 * `projectLens` and `lensPixelsPerRadian`. If the two ever disagree, the
 * dotted lines from the cards point beside the markers, and clicks on a
 * marker miss it.
 *
 * Camera space throughout: +X right, +Y up, looking down -Z.
 * Screen positions are normalised device coordinates, -1..1 on both axes,
 * before any shift of the projection (`RoomPose.share` / `lift`).
 */

/** An ordinary perspective. */
export const RECTILINEAR = 1;
/** The stereographic fisheye. */
export const STEREOGRAPHIC = 2;

/** How far from the frame's centre, in half-widths, a ray `theta` off the view axis lands. */
export function lensRadius(theta: number, halfHFov: number, k: number): number {
  return Math.tan(theta / k) / Math.tan(halfHFov / k);
}

/** The inverse: the angle off the view axis of a point `r` half-widths from the centre. */
export function lensTheta(r: number, halfHFov: number, k: number): number {
  return k * Math.atan(r * Math.tan(halfHFov / k));
}

/**
 * The widest angle off-axis this lens can put anywhere on a screen, however
 * large: 90° for a perspective (the image plane), 180° for stereographic (the
 * point straight behind goes to infinity).
 */
export function lensHorizon(k: number): number {
  return (k * Math.PI) / 2;
}

/**
 * Where a camera-space direction lands on screen, or `null` if this lens
 * cannot show it at all (behind a perspective camera, straight behind a
 * fisheye).
 */
export function projectLens(
  dir: Direction,
  halfHFov: number,
  aspect: number,
  k: number
): { x: number; y: number } | null {
  const [x, y, z] = dir;
  const length = Math.hypot(x, y, z);
  if (length < 1e-12) return null;
  const theta = Math.acos(Math.max(-1, Math.min(1, -z / length)));
  if (theta > lensHorizon(k) - 1e-6) return null;
  const side = Math.hypot(x, y);
  if (side < 1e-12) return { x: 0, y: 0 };
  const r = lensRadius(theta, halfHFov, k);
  // r is measured in half-widths; the frame is 1/aspect half-widths tall.
  return { x: (r * x) / side, y: ((r * y) / side) * aspect };
}

/** The camera-space unit direction seen at a screen position. */
export function unprojectLens(ndcX: number, ndcY: number, halfHFov: number, aspect: number, k: number): Direction {
  const px = ndcX;
  const py = ndcY / aspect;
  const r = Math.hypot(px, py);
  if (r < 1e-12) return [0, 0, -1];
  const theta = lensTheta(r, halfHFov, k);
  const s = Math.sin(theta);
  return [(s * px) / r, (s * py) / r, -Math.cos(theta)];
}

/**
 * How many screen pixels one radian spans, `theta` off the view axis, in the
 * direction *around* the axis.
 *
 * What a marker is sized with: something `s` across seen from `d` away
 * subtends `s/d` radians, so it covers `s/d` times this many pixels. For a
 * perspective (k = 1) this is `halfWidthPx / (tanH · cosθ)` — the focal
 * length in pixels over the depth, exactly how three.js sizes a sprite — and
 * for stereographic, which is conformal, it is the same in every direction.
 * In between it is the around-the-axis figure, the one that matches both ends.
 */
export function lensPixelsPerRadian(theta: number, halfHFov: number, k: number, halfWidthPx: number): number {
  if (theta < 1e-6) return halfWidthPx / (k * Math.tan(halfHFov / k));
  return (halfWidthPx * lensRadius(theta, halfHFov, k)) / Math.sin(theta);
}

/**
 * The fisheye's fragment shader: `unprojectLens` for every pixel of a
 * full-screen quad, sampling a cube map drawn from the camera's position.
 *
 * `uShift` is the projection's shift (`RoomPose.share`, `lift`) in ndc — the
 * same slide `setViewOffset` gives a perspective camera, so the subject sits
 * clear of the card through either lens. Opaque on purpose: the room covers
 * every pixel, and an alpha of 0 carried over from a cut-out in the cube
 * (the PC screen's hole, step 4) would show whatever is behind the canvas.
 */
export const LENS_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform samplerCube uCube;
  uniform mat3 uRot;
  uniform float uHalf;
  uniform float uAspect;
  uniform float uK;
  uniform vec2 uShift;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0 - uShift;
    p.y /= uAspect;
    float r = length(p);
    float theta = uK * atan(r * tan(uHalf / uK));
    vec2 around = r > 1e-6 ? p / r : vec2(0.0);
    vec3 d = vec3(sin(theta) * around, -cos(theta));
    gl_FragColor = vec4(textureCube(uCube, uRot * d).rgb, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const LENS_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;
