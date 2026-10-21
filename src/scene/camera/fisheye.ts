import type { Direction } from "../direction";

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
 * How large each face of the fisheye's cube has to be, in px, for the picture
 * not to be stretched: a face spans 90°, so the middle of it carries `size/2`
 * px per radian, and that has to reach what the lens puts at the middle of the
 * screen — `halfWidth · dpr / (k · tan(H/k))` device px per radian.
 *
 * At a fixed 1024 px a retina screen (dpr 2) stretched the faces about 1.85×
 * at the middle of the fisheye, and the staircase edges of the faces (they are
 * drawn without the canvas's antialiasing) came out magnified — the jagged
 * look the user reported (2026-10-01). Rounded up to a multiple of 64, never
 * below 512, and capped: the faces cost video memory (see `LensRenderer`).
 */
export function cubeFaceSize(widthCssPx: number, dpr: number, hfovDeg: number, k: number, cap: number): number {
  const half = (hfovDeg * Math.PI) / 360;
  const centre = lensPixelsPerRadian(0, half, k, (widthCssPx * dpr) / 2);
  return Math.min(cap, Math.max(512, Math.ceil((2 * centre) / 64) * 64));
}

/**
 * The fisheye's fragment shader: `unprojectLens` for every pixel of a
 * full-screen quad, sampling a cube map drawn from the camera's position.
 *
 * `uShift` is the projection's shift (`RoomPose.share`, `lift`) in ndc — the
 * same slide `setViewOffset` gives a perspective camera, so the subject sits
 * clear of the card through either lens. Opaque on purpose: the room covers
 * every pixel, and an alpha of 0 carried over from a cut-out in the cube
 * (the PC screen's hole) would show whatever is behind the canvas.
 *
 * The cube already holds tone-mapped colour (`FACE_COPY_FRAGMENT_SHADER`), so
 * this only encodes it for the screen — tone mapping it again would darken it.
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

/**
 * Copies one antialiased face (drawn into a multisampled, half-float target)
 * into the cube, tone-mapping it on the way: three.js only tone-maps what is
 * drawn to the screen, and the cube is 8-bit sRGB to keep it small, which
 * would clip the room's highlights if they were stored before tone mapping.
 * The curve is three.js's own `ACESFilmicToneMapping`, word for word — the
 * fisheye has to come out the same colour as the standard view (checked by
 * drawing k = 1 both ways and comparing pixels).
 */
export const FACE_COPY_FRAGMENT_SHADER = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uFace;
  uniform float uExposure;
  vec3 RRTAndODTFit(vec3 v) {
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return a / b;
  }
  vec3 acesFilmic(vec3 color) {
    const mat3 ACESInputMat = mat3(
      vec3(0.59719, 0.07600, 0.02840),
      vec3(0.35458, 0.90834, 0.13383),
      vec3(0.04823, 0.01566, 0.83777)
    );
    const mat3 ACESOutputMat = mat3(
      vec3(1.60475, -0.10208, -0.00327),
      vec3(-0.53108, 1.10813, -0.07276),
      vec3(-0.07367, -0.00605, 1.07602)
    );
    color *= uExposure / 0.6;
    color = ACESInputMat * color;
    color = RRTAndODTFit(color);
    color = ACESOutputMat * color;
    return clamp(color, 0.0, 1.0);
  }
  void main() {
    gl_FragColor = vec4(acesFilmic(texture2D(uFace, vUv).rgb), 1.0);
  }
`;
