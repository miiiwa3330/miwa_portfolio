import { DESK_SCREEN_PX } from "./screens";

/**
 * The PC's mouse: an **ELECOM EX-G, S size** — the quiet 2.4 GHz wireless
 * five-button model M-XGS30DBSKCBK (black, JAN 4549550382397), the user's
 * choice (2026-10-22, https://www.sofmap.com/product_detail.aspx?sku=101671141)
 * — with the owner's name printed where the maker's is ("Miiiwa", as the
 * keyboard's "Miiiwa Professional3"). Its size is the series' S size, 71 ×
 * 108 × 52 mm (width × depth × height, as the stores list it); the shape is
 * read off the user's photos, `reference/5/` — 2.png and 6.png from above,
 * 3.png and 10.png from the left (the thumb side), 1.png, 4.png, 7.png and
 * 9.png from the front, 5.png and 11.png from below. 6.png's outline is 0.660
 * as wide as it is long; the maker's 71/108 is 0.657.
 *
 * The mouse's own frame: origin on the desk under the middle of its outline
 * seen from above, +X to the right, +Y up, +Z towards the reader — so the
 * buttons are at −Z. Along its length a point is `f` (0 at the front tip, 1
 * at the tail); across, `u` (−1 at the left edge, the thumb's side, +1 at the
 * right) or `xFrac` (0 at the outline's leftmost point, 1 at its rightmost),
 * the fractions the photos were measured in.
 */

export const EXG = { width: 0.071, length: 0.108, height: 0.052 } as const;

/**
 * Measured, 41 steps from the front tip (f = 0) to the tail (f = 1): the
 * outline from above (2.png: each row's leftmost and rightmost dark pixel as
 * fractions of the outline's width), and the silhouette from the left side
 * (3.png: each column's top and bottom as fractions of the height). The
 * clean product shots taken later (6.png from above, 10.png from the side)
 * agree within 0.03 at every step. The underside curves up at both ends —
 * the front tip stands 12 mm off the desk.
 */
const OUTLINE_LEFT = [
  0.534, 0.292, 0.182, 0.136, 0.115, 0.101, 0.095, 0.094, 0.098, 0.094, 0.089, 0.084, 0.076, 0.069, 0.061, 0.052, 0.045, 0.036, 0.03, 0.022,
  0.017, 0.011, 0.007, 0.004, 0.002, 0.0, 0.001, 0.003, 0.007, 0.011, 0.02, 0.031, 0.044, 0.062, 0.088, 0.119, 0.166, 0.225, 0.298, 0.381, 0.561,
];
const OUTLINE_RIGHT = [
  0.576, 0.753, 0.793, 0.818, 0.831, 0.842, 0.848, 0.861, 0.885, 0.908, 0.928, 0.948, 0.964, 0.978, 0.987, 0.993, 0.996, 0.996, 0.993, 0.99,
  0.986, 0.991, 0.994, 0.998, 1.0, 1.0, 1.0, 0.998, 0.996, 0.992, 0.985, 0.977, 0.966, 0.952, 0.934, 0.912, 0.885, 0.853, 0.809, 0.749, 0.574,
];
const PROFILE_TOP = [
  0.269, 0.477, 0.567, 0.631, 0.686, 0.73, 0.772, 0.81, 0.844, 0.875, 0.904, 0.927, 0.948, 0.965, 0.98, 0.988, 0.996, 1.0, 0.997, 0.994, 0.987,
  0.975, 0.962, 0.946, 0.927, 0.906, 0.881, 0.852, 0.821, 0.786, 0.747, 0.703, 0.658, 0.608, 0.557, 0.501, 0.446, 0.385, 0.324, 0.259, 0.185,
];
const PROFILE_BOTTOM = [
  0.24, 0.157, 0.105, 0.062, 0.036, 0.028, 0.022, 0.017, 0.017, 0.016, 0.015, 0.013, 0.012, 0.01, 0.009, 0.007, 0.006, 0.006, 0.004, 0.004, 0.003,
  0.001, 0.001, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.001, 0.001, 0.003, 0.001, 0.003, 0.006, 0.013, 0.025, 0.087, 0.17,
];

/**
 * A cubic spline's second derivatives at its knots (`xs` ascending):
 * natural (straight at the ends) or clamped (level at the ends, so a curve
 * held level beyond them has no kink). Continuous in curvature — a curve
 * that is only continuous in slope (Catmull–Rom, the first version) jumps in
 * curvature at every sample, and the shell's shading showed a stripe at each
 * of the 41 steps, 2.7 mm apart (2026-10-22, the user).
 */
function splineCurvature(xs: readonly number[], ys: readonly number[], ends: "natural" | "clamped"): number[] {
  const n = xs.length;
  const a = new Array<number>(n).fill(0);
  const b = new Array<number>(n).fill(1);
  const c = new Array<number>(n).fill(0);
  const d = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const h0 = xs[i] - xs[i - 1];
    const h1 = xs[i + 1] - xs[i];
    a[i] = h0;
    b[i] = 2 * (h0 + h1);
    c[i] = h1;
    d[i] = 6 * ((ys[i + 1] - ys[i]) / h1 - (ys[i] - ys[i - 1]) / h0);
  }
  if (ends === "clamped" && n > 1) {
    const h0 = xs[1] - xs[0];
    const hn = xs[n - 1] - xs[n - 2];
    b[0] = 2 * h0;
    c[0] = h0;
    d[0] = 6 * ((ys[1] - ys[0]) / h0);
    a[n - 1] = hn;
    b[n - 1] = 2 * hn;
    d[n - 1] = -6 * ((ys[n - 1] - ys[n - 2]) / hn);
  }
  // Thomas's algorithm for the tridiagonal system.
  for (let i = 1; i < n; i++) {
    const w = a[i] / b[i - 1];
    b[i] -= w * c[i - 1];
    d[i] -= w * d[i - 1];
  }
  const m = new Array<number>(n);
  m[n - 1] = d[n - 1] / b[n - 1];
  for (let i = n - 2; i >= 0; i--) m[i] = (d[i] - c[i] * m[i + 1]) / b[i];
  return m;
}

function splineValue(xs: readonly number[], ys: readonly number[], m: readonly number[], x: number): number {
  let i = 0;
  let hi = xs.length - 2;
  while (i < hi) {
    const mid = (i + hi + 1) >> 1;
    if (xs[mid] <= x) i = mid;
    else hi = mid - 1;
  }
  const h = xs[i + 1] - xs[i];
  const A = (xs[i + 1] - x) / h;
  const B = (x - xs[i]) / h;
  return A * ys[i] + B * ys[i + 1] + (((A ** 3 - A) * m[i] + (B ** 3 - B) * m[i + 1]) * h * h) / 6;
}

const splines = new WeakMap<object, { xs: number[]; ys: number[]; m: number[] }>();

/** A table sampled evenly over 0–1, read through its samples on a natural cubic spline. */
export function sampleTable(table: readonly number[], t: number): number {
  let s = splines.get(table);
  if (!s) {
    const xs = table.map((_, i) => i / (table.length - 1));
    s = { xs, ys: [...table], m: splineCurvature(xs, table, "natural") };
    splines.set(table, s);
  }
  return splineValue(s.xs, s.ys, s.m, Math.min(1, Math.max(0, t)));
}

/**
 * A measured table eased: two passes of a 1-2-1 average, the ends kept. The
 * photos' pixel steps (about ±0.5 px, ±0.03–0.05 mm) rippled the shell — the
 * user saw it bumpy; easing moves no sample more than a few hundredths of a
 * millimetre beyond that.
 */
function ease(table: readonly number[], passes = 2): number[] {
  let t = [...table];
  for (let p = 0; p < passes; p++) t = t.map((v, i) => (i === 0 || i === t.length - 1 ? v : (t[i - 1] + 2 * v + t[i + 1]) / 4));
  return t;
}

const LEFT = ease(OUTLINE_LEFT);
const RIGHT = ease(OUTLINE_RIGHT);
const TOP = ease(PROFILE_TOP);
const BOTTOM = ease(PROFILE_BOTTOM);

/** The outline's left and right edges at `f`, in metres. */
export function outlineAt(f: number): { left: number; right: number } {
  return { left: (sampleTable(LEFT, f) - 0.5) * EXG.width, right: (sampleTable(RIGHT, f) - 0.5) * EXG.width };
}

/** How high the top (the silhouette from the side) and the underside are at `f`, in metres. */
export function profileAt(f: number): { top: number; bottom: number } {
  return { top: sampleTable(TOP, f) * EXG.height, bottom: Math.max(0, sampleTable(BOTTOM, f)) * EXG.height };
}

export const zAt = (f: number): number => (f - 0.5) * EXG.length;
export const fAt = (z: number): number => z / EXG.length + 0.5;

/** `u` (−1 left edge … +1 right edge) at a point across the outline, and back. */
export function uAt(f: number, x: number): number {
  const { left, right } = outlineAt(f);
  return right > left ? ((x - left) / (right - left)) * 2 - 1 : 0;
}
export function xAt(f: number, u: number): number {
  const { left, right } = outlineAt(f);
  return left + ((u + 1) / 2) * (right - left);
}

/**
 * The cross-section. A right-handed ergonomic mouse: the top's ridge runs
 * left of the middle over the buttons, the thumb's side stays high there and
 * the right falls away to the little finger (7.png, from the front, though
 * the hand hides most of it); towards the tail the thumb's side drops into
 * the thumb rest and the palm's hump is in the middle.
 *
 * The thumb's side is a shoulder: the top runs out to the side buttons'
 * upper seam, and from there the flank rolls down to the wall — the side
 * buttons sit on that roll, which is why from above they are narrow strips
 * along the edge (6.png). The seam is seen from above (6.png,
 * `SIDE_BUTTONS.top`) and from the side (10.png, `SIDE_BUTTONS.upper`), so
 * at each step along the buttons the shoulder starts there (`shoulderAt`)
 * and the top passes through it at that height (`leftEdgeAt` is solved for
 * it). **Provisional (仮)**: the ridge's place (`ridge`, which the photos
 * cannot pin down), the right edge, where the right side rolls over, and how
 * square both rolls are.
 */
export const CROSS = {
  /** The ridge's `u`: over the buttons, and from where it moves to the middle by where. */
  ridge: { front: -0.25, back: 0, from: 0.35, to: 0.6 },
  /** The top's height at the right edge, before it rolls over into the wall, as a share of the ridge's. */
  rightEdge: 0.55,
  /** From what |u| the right side rolls over into the wall. */
  rollFrom: 0.72,
  /** How square the right side's roll is (a superellipse's power; 2 is round). */
  rollPower: 2.6,
} as const;

/**
 * The thumb rest, under the side buttons (12.png–16.png): from the shoulder
 * the flank falls in a concave scoop to a wing that stands out at about half
 * the height, and under the wing the side tucks back in to the desk. The
 * wing's edge is the outline seen from above; its height along the mouse is
 * read off the side view (10.png, `LIP`: the edge between the lit scoop and
 * the dark side under the wing, by eye, as a share of the height); how far
 * the side tucks in under it is the front view's (16.png: 5 mm under the
 * wing at its highest, 0.143 mm/px), less where the wing is lower.
 * Handing the top's own curve over to the wing's height makes the scoop
 * concave, and where the thumb's side has dropped (towards the tail) lower
 * than the wing, so the wing's edge stands up a little, as 15.png shows it.
 */
export const LIP: readonly (readonly [number, number])[] = [
  [0.107, 0.084],
  [0.282, 0.218],
  [0.435, 0.336],
  [0.557, 0.41],
  [0.603, 0.453],
  [0.694, 0.438],
  [0.778, 0.379],
  [0.87, 0.287],
  [0.938, 0.203],
  [0.984, 0.141],
];
export const WING = { tuck: 0.005 } as const;

/**
 * How round the mouse's edges are (2026-10-22, the user: "the corners are
 * too sharp — the real one is rounded", 17.png–19.png): the pieces' edges
 * where they turn down into a cut, the wing's edge, and the foot where the
 * walls meet the desk. **Provisional (仮)** radii: the photos show the
 * rounding, not its size.
 */
export const ROUND = { edge: 0.0005, lip: 0.0012, foot: 0.001 } as const;

/** A quarter round of radius `r`: how far it has turned down at `d` from where it ends vertical. */
function roundDrop(d: number, r: number): number {
  if (r <= 0 || d >= r) return 0;
  const x = r - Math.max(0, d);
  return r - Math.sqrt(r * r - x * x);
}
const LIP_TOP = Math.max(...LIP.map(([, h]) => h));

export function ridgeAt(f: number): number {
  const { front, back, from, to } = CROSS.ridge;
  // Eased, not straight: a straight move bent the ridge at both ends, two creases across the top.
  return front + (back - front) * smootherstep((f - from) / (to - from));
}

/** 0 to 1 with its slope and its curvature level at both ends — no line in the shading where it starts or stops. */
function smootherstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (6 * x - 15) + 10);
}

/**
 * A curve through (`key`, `value`) points with ascending keys, on a cubic
 * spline level at both ends and held level past them — so a shape solved at
 * measured steps has no crease, nor a stripe in its shading, at each step.
 */
export function smoothAt(points: readonly (readonly [number, number])[], key: number): number {
  const n = points.length;
  if (key <= points[0][0]) return points[0][1];
  if (key >= points[n - 1][0]) return points[n - 1][1];
  let s = splines.get(points);
  if (!s) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    s = { xs, ys, m: splineCurvature(xs, ys, "clamped") };
    splines.set(points, s);
  }
  return splineValue(s.xs, s.ys, s.m, key);
}

/** How far either side of the ridge the cross-section hands over from the left's curvature to the right's. */
const RIDGE_BLEND = 0.2;

/**
 * The top's height across as a share of the ridge's: a parabola from the
 * ridge to each edge's height. The two sides' curvatures differ, so they are
 * handed over smoothly within `RIDGE_BLEND` of the ridge — two parabolas
 * meeting at it jumped in curvature there, a thin stripe the length of the
 * mouse (2026-10-22, the user). The side buttons' seam is further out than
 * that, so solving for the left edge (`leftEdgeAt`) sees the left parabola alone.
 */
function parabola(u: number, ridge: number, leftEdge: number, rightEdge: number): number {
  const left = (1 - leftEdge) / (1 + ridge) ** 2;
  const right = (1 - rightEdge) / (1 - ridge) ** 2;
  const s = smootherstep((u - ridge) / (2 * RIDGE_BLEND) + 0.5);
  return 1 - (left + (right - left) * s) * (u - ridge) ** 2;
}

/** The side buttons' upper seam at `f` as `u` (6.png): the top shell's left edge, which runs along it. */
function seamU(f: number): number {
  return uAt(f, xOfFrac(polylineAt(TONGUE.left, f)));
}

let solved: { shoulder: [number, number][]; edge: [number, number][] } | null = null;

function solve() {
  solved ??= (() => {
    const shoulder: [number, number][] = [];
    const edge: [number, number][] = [];
    for (const [at, share] of SIDE_BUTTONS.upper) {
      const u = seamU(at);
      const { top, bottom } = profileAt(at);
      const ridge = ridgeAt(at);
      // At the shoulder the roll has not begun: the top alone makes the seam's height.
      const needed = (share * EXG.height - bottom) / ((top - bottom) * tipShare(at));
      shoulder.push([at, -u]);
      edge.push([at, 1 - (1 - needed) / ((u - ridge) / (-1 - ridge)) ** 2]);
    }
    // The seam's heights are read column by column off 10.png, a few
    // thousandths of the height apart from their neighbours; solved straight
    // they swung the thumb's side 0.47 → 0.05 → 0.12 within 8 mm, a dent in
    // the flank. Eased once, the shell passes within a millimetre of them.
    const eased = ease(edge.map(([, e]) => e), 1);
    return { shoulder, edge: edge.map(([at], i) => [at, eased[i]] as [number, number]) };
  })();
  return solved;
}

/** Where the thumb's side starts to roll down to the wall, as |u|: the side buttons' upper seam, held level past them. */
export function shoulderAt(f: number): number {
  return smoothAt(solve().shoulder, f);
}

/**
 * The top's height at the left edge (were it not to roll over), as a share
 * of the ridge's, at `f`: solved at each measured step of the side buttons'
 * upper seam so the top passes through it (see `CROSS`), held level in
 * front of and behind the buttons.
 */
export function leftEdgeAt(f: number): number {
  return smoothAt(solve().edge, f);
}

/** The top's height across at `f`, as a share of the ridge's: a parabola either side of the ridge. */
export function crossShare(f: number, u: number): number {
  return parabola(u, ridgeAt(f), leftEdgeAt(f), CROSS.rightEdge);
}

/** The right side rolling over into its wall: 1 inside `rollFrom`, falling to 0 at the edge with a vertical tangent. */
export function rollover(u: number): number {
  const t = (u - CROSS.rollFrom) / (1 - CROSS.rollFrom);
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  return (1 - t ** CROSS.rollPower) ** (1 / CROSS.rollPower);
}

/** How high the thumb rest's wing stands at `f`, as a share of the mouse's height (10.png). */
export function lipAt(f: number): number {
  return smoothAt(LIP, f);
}

/**
 * How far the side tucks in under the wing at `f`, in metres: 16.png's 5 mm
 * where the wing stands highest over the underside, less where it is lower,
 * nothing where there is no wing (at the tail's tip the underside is higher
 * than the wing's line; tucked in there, the underside turned inside out) —
 * and never more than a quarter of the width.
 */
export function tuckAt(f: number): number {
  const { left, right } = outlineAt(f);
  const stands = Math.max(0, lipAt(f) * EXG.height - profileAt(f).bottom);
  return Math.min((WING.tuck * stands) / (LIP_TOP * EXG.height), (right - left) / 4);
}

/** Closes the two tips: 1 along the body, 0 at f = 0 and 1. Steep, so it barely touches the measured silhouette. */
function tipShare(f: number): number {
  return Math.max(0, 1 - Math.abs(2 * f - 1) ** 12) ** (1 / 12);
}

export type Vec3 = [number, number, number];

const smoothstep = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/**
 * A point on the mouse's shell at `f` along and `u` across, in the mouse's
 * frame: the top, the right side down to the desk, and on the left the
 * shoulder, the thumb rest's scoop and its wing (the outline at u = −1).
 */
export function shellPoint(f: number, u: number): Vec3 {
  const { top, bottom } = profileAt(f);
  // The cross-section shapes what stands over the underside, not the whole
  // height: at the tips, where the underside lifts 12 mm off the desk, the
  // right edge's share of the full height fell under the underside and the
  // shell folded through it.
  const over = top - bottom;
  const shoulder = shoulderAt(f);
  const { left, right } = outlineAt(f);
  let x = xAt(f, u);
  let rise: number;
  if (u >= -shoulder) {
    rise = over * crossShare(f, u) * (u > 0 ? rollover(u) : 1);
  } else {
    // From the shoulder (t = 0) to the wing's edge (t = 1): the top's own
    // curve handing over to the wing's height, level at both ends so it joins
    // the top without a crease and the wing is flat — then the wing's edge
    // rounds over and down (`ROUND.lip`), meeting the side under it upright.
    const t = (-u - shoulder) / (1 - shoulder);
    const keep = 1 - smootherstep(t);
    const wing = Math.max(0, lipAt(f) * EXG.height - bottom);
    rise = Math.max(0, over * crossShare(f, u) * keep + wing * (1 - keep));
    rise -= roundDrop(((u + 1) * (right - left)) / 2, lipRound(f));
  }
  const height = rise * tipShare(f);
  // The right wall's foot rounds in to the underside (`ROUND.foot`).
  if (u > CROSS.rollFrom) x -= roundDrop(height, footRound(f));
  return [x, bottom + height, zAt(f)];
}

/** The wing's edge's round at `f`: `ROUND.lip`, or half the wing's height where it stands lower. */
export function lipRound(f: number): number {
  return Math.min(ROUND.lip, Math.max(0, lipAt(f) * EXG.height - profileAt(f).bottom) / 2);
}

/**
 * The right wall's foot's round at `f`: `ROUND.foot`, less where the mouse
 * narrows to its tips, and nothing at them — there the whole shell is down
 * at the underside, and the round pulled the whole row in and folded it.
 */
function footRound(f: number): number {
  const { left, right } = outlineAt(f);
  return Math.min(ROUND.foot, (right - left) / 8) * tipShare(f);
}

/** The foot of the side under the wing: `ROUND.foot`, or half that side's height where it is lower. */
function skirtFoot(f: number): number {
  return Math.min(footRound(f), (shellPoint(f, -1)[1] - profileAt(f).bottom) / 2);
}

/**
 * The side under the wing, from the wing's edge (`v` = 0) tucking in and
 * down to the desk (`v` = 1): upright where it leaves the wing's round and
 * where it stands on the desk, tucked in between, and rounding in at its foot.
 */
export function skirtPoint(f: number, v: number): Vec3 {
  const { left } = outlineAt(f);
  const edge = shellPoint(f, -1)[1];
  const { bottom } = profileAt(f);
  const y = edge + (bottom - edge) * v;
  const x = left + tuckAt(f) * Math.sin((Math.PI / 2) * v) ** 2 + roundDrop(y - bottom, skirtFoot(f));
  return [x, y, zAt(f)];
}

/** The underside: the outline with the left side tucked in under the wing, inside the feet's rounds. */
export function basePoint(f: number, u: number): Vec3 {
  const { left, right } = outlineAt(f);
  const inner = left + tuckAt(f) + skirtFoot(f);
  const outer = right - footRound(f);
  return [inner + ((u + 1) / 2) * (outer - inner), profileAt(f).bottom, zAt(f)];
}

/** The shell's outward normal at (`f`, `u`), by finite differences. */
export function shellNormal(f: number, u: number): Vec3 {
  const e = 1e-3;
  const fa = shellPoint(Math.max(0, f - e), u);
  const fb = shellPoint(Math.min(1, f + e), u);
  const ua = shellPoint(f, Math.max(-1, u - e));
  const ub = shellPoint(f, Math.min(1, u + e));
  const df: Vec3 = [fb[0] - fa[0], fb[1] - fa[1], fb[2] - fa[2]];
  const du: Vec3 = [ub[0] - ua[0], ub[1] - ua[1], ub[2] - ua[2]];
  // Along f is +Z and across u is +X: f × u points up out of the top.
  const n: Vec3 = [df[1] * du[2] - df[2] * du[1], df[2] * du[0] - df[0] * du[2], df[0] * du[1] - df[1] * du[0]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/**
 * The marks on the shell, from 2.png (positions as `xFrac`, `f`): the split
 * between the two buttons from the front notch to the wheel's slot and along
 * it; the slot (leaning about 8°, its rear end further right), cut through
 * the top shell; the wheel in its front part; the DPI button and its light in
 * the rear part; the logo, read top to bottom on the left of the palm.
 */
export const MARKS = {
  split: [
    [0.436, 0],
    [0.49, 0.067],
    [0.567, 0.409],
  ] as readonly [number, number][],
  slot: { front: 0.067, back: 0.409, halfWidth: 0.0049 },
  wheel: { f: 0.155, radius: 0.009, width: 0.0068, rise: 0.0032 },
  dpi: { front: 0.27, back: 0.395, inset: 0.0009, sink: 0.0004 },
  light: { xFrac: 0.566, f: 0.363 },
  /** The maker's print ("ELECOM", which sizes the letters) replaced by the owner's name (2026-10-22, the user). */
  logo: { xFrac: [0.389, 0.492] as const, f: [0.641, 0.752] as const, maker: "ELECOM", text: "Miiiwa", colour: "#7276b4" },
} as const;

/** `xFrac` of a polyline of (`xFrac`, `f`) points at `f`, held flat past its ends. */
export function polylineAt(points: readonly (readonly [number, number])[], f: number): number {
  if (f <= points[0][1]) return points[0][0];
  for (let i = 1; i < points.length; i++) {
    const [x0, f0] = points[i - 1];
    const [x1, f1] = points[i];
    if (f <= f1) return x0 + ((x1 - x0) * (f - f0)) / (f1 - f0);
  }
  return points[points.length - 1][0];
}

export const xFracAt = (x: number): number => x / EXG.width + 0.5;
export const xOfFrac = (xFrac: number): number => (xFrac - 0.5) * EXG.width;

/** The slot's centre line, along which the wheel rolls: its angle off the length (radians, positive leaning the rear end right). */
export const SLOT_LEAN = (() => {
  const [, a, b] = MARKS.split;
  return Math.atan2((b[0] - a[0]) * EXG.width, (b[1] - a[1]) * EXG.length);
})();

/**
 * The buttons. The left and right are the front of the top shell, split down
 * the middle and hinged at `hinge` (f): a press bends a button down about
 * the hinge, so it goes down most at the front. A click anywhere on the top
 * shell up to `reach` lands on the button on its side of the split
 * (2026-10-22, the user: "make the left click's target a little bigger" —
 * it had stopped at the hinge and short of the thumb's side). **Provisional
 * (仮)**: the hinge (just behind the slot, where 2.png shows the split line
 * ending), the reach, and the travel — a real click moves the tip well under
 * a millimetre; this is a little more, to be seen from the chair.
 */
export const BUTTON = { hinge: 0.42, reach: 0.5, travel: 0.0012, wheelTravel: 0.0008, sideTravel: 0.001 } as const;

const smooth = smoothstep;

/**
 * How much of the left and right buttons' press moves the top shell at
 * (`f`, `u`): the lever about the hinge, on the split's side the point is.
 * In front of the slot the split is a real cut; behind it the two halves are
 * one piece, so the share fades across the split's line over `fade` and the
 * shell bends there rather than tears.
 */
export function buttonShare(f: number, u: number): [number, number] {
  if (f >= BUTTON.hinge) return [0, 0];
  const lever = (BUTTON.hinge - f) / BUTTON.hinge;
  const fromSplit = xAt(f, u) - xOfFrac(polylineAt(MARKS.split, f));
  const fade = 0.0008;
  return [lever * smooth(0.5 - fromSplit / fade), lever * smooth(0.5 + fromSplit / fade)];
}

/** Which button, if any, a press at (`f`, `u`) lands on: the top shell up to `BUTTON.reach`, by the side of the split. */
export function buttonAt(f: number, u: number): "left" | "right" | null {
  if (f > BUTTON.reach) return null;
  const edges = tongueEdges(f);
  if (!edges || u < edges.left || u > edges.right) return null;
  return xAt(f, u) < xOfFrac(polylineAt(MARKS.split, f)) ? "left" : "right";
}

/**
 * The two side buttons on the thumb's flank, front ("forward", the mouse's
 * button 4) and rear ("back", button 3), split at f 0.448 (2.png). Their
 * upper edge is a seam seen from above (6.png: `top`, from `xFrac` 0.154 at
 * f 0.32 to 0.35 at f 0.63) and from the side (10.png: `upper`, its height
 * as a share of the mouse's, each column's first dark run under the
 * silhouette — two outlying columns at f 0.437 and 0.451 left out); their
 * lower edge is the band's lower edge in 10.png (`lower`, read by eye: the
 * shadow under the buttons runs into the thumb rest's), about 6 mm under
 * the upper over the front button, tapering to 1–2 mm at the rear end.
 * Raised `raise` off the shell (**仮**).
 */
export const SIDE_BUTTONS = {
  forward: { from: 0.316, to: 0.445 },
  back: { from: 0.451, to: 0.641 },
  top: [
    [0.154, 0.32],
    [0.35, 0.63],
  ] as readonly [number, number][],
  upper: [
    [0.32, 0.935],
    [0.36, 0.955],
    [0.4, 0.935],
    [0.45, 0.935],
    [0.5, 0.92],
    [0.55, 0.89],
    [0.6, 0.825],
    [0.63, 0.83],
  ] as readonly [number, number][],
  lower: [
    [0.32, 0.84],
    [0.45, 0.82],
    [0.6, 0.79],
    [0.64, 0.8],
  ] as readonly [number, number][],
  raise: 0.0012,
} as const;

/** Across the flank at `f`: the side buttons' upper edge (from above) and lower edge (by height), as `u`. */
export function sideButtonSpan(f: number): { upper: number; lower: number } {
  const upper = seamU(f);
  const floor = polylineAt(SIDE_BUTTONS.lower.map(([at, share]) => [share, at] as const), f) * EXG.height;
  // The flank falls steadily from the upper edge out to the left wall: bisect for the height.
  let lo = -1;
  let hi = upper;
  if (shellPoint(f, hi)[1] <= floor) return { upper, lower: upper };
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (shellPoint(f, mid)[1] > floor) hi = mid;
    else lo = mid;
  }
  return { upper, lower: (lo + hi) / 2 };
}

/**
 * The top shell's outline seen from above (6.png, its contrast raised): one
 * piece from the buttons over the palm, shaped like a tongue — on the left
 * along the side buttons' upper seam, on the right along the seam with the
 * right side, the two coming round behind the palm to meet at (0.557, 0.877).
 * From there a seam runs down the tail (`tail`). In front of the first
 * measured points the edges run out to `hug` of the way to the outline at the
 * front tip: the top shell takes in the front face (the real seam runs low
 * across the front, 13.png — facing the monitor, never in view).
 */
export const TONGUE: {
  left: readonly (readonly [number, number])[];
  right: readonly (readonly [number, number])[];
  tail: readonly (readonly [number, number])[];
  hug: number;
} = {
  left: [[0.173, 0.097], [0.164, 0.144], [0.15, 0.25], ...SIDE_BUTTONS.top, [0.361, 0.686], [0.388, 0.781], [0.45, 0.84], [0.557, 0.877]],
  right: [[0.754, 0.06], [0.83, 0.2], [0.85, 0.35], [0.852, 0.525], [0.852, 0.745], [0.807, 0.828], [0.718, 0.857], [0.646, 0.871], [0.557, 0.877]],
  tail: [[0.557, 0.877], [0.468, 0.993]],
  hug: 0.95,
};
const TONGUE_END = TONGUE.left[TONGUE.left.length - 1][1];

/**
 * The cuts between the pieces (2026-10-22, the user: "split the mouse for
 * real, not a painted line"): half a cut's width, and how far its walls go
 * down to the dark inside (`mouseParts`). **Provisional (仮).** The depth is
 * more than a button's travel, so a pressed button never meets the inside.
 */
export const SEAM = { gap: 0.0003, depth: 0.0016 } as const;

/** A width in metres across the top view as a stretch of `u` at `f` (the slot is drawn in the top view). */
function gapU(f: number, metres: number): number {
  const { left, right } = outlineAt(f);
  return metres / Math.max(1e-4, (right - left) / 2);
}

/**
 * A width in metres along the shell as a stretch of `u` at (`f`, `u`). Not
 * across the top view: on the steep flank under the thumb's shoulder a step
 * of `u` runs 25 mm down for 4 mm across, and a cut sized from above opened
 * about six times as wide on it — a dark band rather than a seam.
 */
function gapAt(f: number, u: number, metres: number): number {
  const e = 1e-4;
  const a = shellPoint(f, Math.max(-1, u - e));
  const b = shellPoint(f, Math.min(1, u + e));
  const along = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (Math.min(1, u + e) - Math.max(-1, u - e));
  return metres / Math.max(1e-4, along);
}

function edgeU(points: readonly (readonly [number, number])[], f: number, hug: number): number {
  const [x0, f0] = points[0];
  if (f < f0) return hug + (uAt(f0, xOfFrac(x0)) - hug) * (f / f0);
  return uAt(f, xOfFrac(polylineAt(points, f)));
}

/** The top shell's two edges at `f`, as `u`; null behind its end. */
export function tongueEdges(f: number): { left: number; right: number } | null {
  if (f > TONGUE_END) return null;
  return { left: edgeU(TONGUE.left, f, -TONGUE.hug), right: edgeU(TONGUE.right, f, TONGUE.hug) };
}

/** The seam down the tail at `f`, as `u` — out through the left wall at the tip (6.png), so never past it. */
export function tailU(f: number): number {
  return Math.max(-1, uAt(f, xOfFrac(polylineAt(TONGUE.tail, f))));
}

/** The split between the buttons (and the slot's middle) at `f`, as `u`. */
export function splitU(f: number): number {
  return uAt(f, xOfFrac(polylineAt(MARKS.split, f)));
}

/** A stadium's half width at `f` between `front` and `back`, round at both ends with radius `half`. */
function stadium(f: number, front: number, back: number, half: number): number {
  const d = Math.min(f - front, back - f) * EXG.length;
  if (d <= 0) return 0;
  return d >= half ? half : Math.sqrt(half ** 2 - (half - d) ** 2);
}

/**
 * Half the width of the cut between the two buttons at `f`, in metres: a
 * seam's in front of the slot, the slot's along it (round at both ends),
 * nothing behind it — there the two halves are one piece, the palm.
 */
export function splitGap(f: number): number {
  const { front, back, halfWidth } = MARKS.slot;
  if (f < front) return SEAM.gap;
  if (f > back) return 0;
  const round = stadium(f, front, back, halfWidth);
  return f < (front + back) / 2 ? Math.max(SEAM.gap, round) : round;
}

/** Where the body is cut away round the two side buttons, a seam's width beyond them. */
const SIDE_HOLE = { from: SIDE_BUTTONS.forward.from - SEAM.gap / EXG.length, to: SIDE_BUTTONS.back.to + SEAM.gap / EXG.length };

export type Span = readonly [number, number] | null;

/**
 * The pieces, each as the stretch of `u` it covers at `f` (null where it is
 * not): the top shell in two halves either side of the split (they meet
 * behind the slot), the body either side of the top shell (and of the
 * tail's seam behind it, cut away round the side buttons), the side buttons,
 * and the DPI button in the slot. Neighbours stand a seam's width apart.
 */
export const PIECES = {
  topLeft(f: number): Span {
    const e = tongueEdges(f);
    if (!e) return null;
    const a = e.left + gapAt(f, e.left, SEAM.gap);
    const b = Math.min(e.right - gapAt(f, e.right, SEAM.gap), splitU(f) - gapU(f, splitGap(f)));
    return a < b ? [a, b] : null;
  },
  topRight(f: number): Span {
    const e = tongueEdges(f);
    if (!e) return null;
    const a = Math.max(e.left + gapAt(f, e.left, SEAM.gap), splitU(f) + gapU(f, splitGap(f)));
    const b = e.right - gapAt(f, e.right, SEAM.gap);
    return a < b ? [a, b] : null;
  },
  bodyLeft(f: number): Span {
    const e = tongueEdges(f);
    const edge = e ? e.left : tailU(f);
    let end = edge - gapAt(f, edge, SEAM.gap);
    if (f >= SIDE_HOLE.from && f <= SIDE_HOLE.to) {
      const at = Math.min(SIDE_BUTTONS.back.to, Math.max(SIDE_BUTTONS.forward.from, f));
      const lower = sideButtonSpan(at).lower;
      end = Math.min(end, lower - gapAt(f, lower, SEAM.gap));
    }
    return end > -1 ? [-1, end] : null;
  },
  bodyRight(f: number): Span {
    const e = tongueEdges(f);
    const edge = e ? e.right : tailU(f);
    const start = Math.max(-1, edge + gapAt(f, edge, SEAM.gap));
    return start < 1 ? [start, 1] : null;
  },
  side(which: "forward" | "back") {
    return (f: number): Span => {
      const { from, to } = SIDE_BUTTONS[which];
      if (f < from || f > to) return null;
      const { upper, lower } = sideButtonSpan(f);
      const a = lower + gapAt(f, lower, SEAM.gap);
      const b = upper - gapAt(f, upper, SEAM.gap);
      return a < b ? [a, b] : null;
    };
  },
  dpi(f: number): Span {
    const { front, back, inset } = MARKS.dpi;
    if (f < front || f > back) return null;
    const half = stadium(f, front, back, MARKS.slot.halfWidth - inset);
    if (half <= 0) return null;
    const c = splitU(f);
    const h = gapU(f, half);
    return [c - h, c + h];
  },
};

/**
 * The rows every piece is sampled on (`f`): even, about 0.4 mm apart, and
 * closer where the top shell's back end turns across the mouse within a few
 * hundredths of `f` — so the pieces' edges along the rows line up and the
 * cuts between them stay even.
 */
const GRID_ROWS: readonly number[] = (() => {
  const rows = new Set<number>();
  for (let i = 0; i <= 260; i++) rows.add(i / 260);
  for (let k = 0; k <= 100; k++) rows.add(Math.round((0.8 + k * 0.001) * 1e6) / 1e6);
  return [...rows].sort((a, b) => a - b);
})();

export type Surface = { positions: number[]; normals: number[]; uvs: number[]; press: number[]; indices: number[] };
/** A cut's walls: four corners a quad (the edge, then the same pushed down into the mouse), and for each quad a point of its piece (to tell its outside). */
export type Walls = { positions: number[]; press: number[]; indices: number[]; inside: Vec3[] };

const emptySurface = (): Surface => ({ positions: [], normals: [], uvs: [], press: [], indices: [] });
const emptyWalls = (): Walls => ({ positions: [], press: [], indices: [], inside: [] });

type BandSpec = {
  span: (f: number) => Span;
  cols: number;
  /** Where the columns gather: evenly, or towards the low or high end of the span. */
  spacing?: "even" | "low" | "high";
  /** How far the piece stands off the shell, along its normal. */
  lift?: number;
  /** Whether it carries the buttons' press (`buttonShare`). */
  press?: boolean;
  from?: number;
  to?: number;
  /** Which edges are cuts and get walls: the low and high sides along the rows (by `f`), the first and last rows. */
  walls: { low?: (f: number) => boolean; high?: (f: number) => boolean; start?: boolean; end?: boolean };
};

function columns(a: number, b: number, cols: number, spacing: BandSpec["spacing"]): number[] {
  return Array.from({ length: cols + 1 }, (_, j) => {
    const t = j / cols;
    const s = spacing === "low" ? 1 - Math.cos((Math.PI / 2) * t) : spacing === "high" ? Math.sin((Math.PI / 2) * t) : t;
    return a + (b - a) * s;
  });
}

/** Columns given to each rounded edge of a piece (and rows to a rounded first or last row). */
const ROUND_STEPS = 3;

/**
 * One piece: the shell sampled over its span row by row, with the shell's
 * own normals (so two pieces that meet without a cut shade as one), and a
 * wall down each edge that is a cut, `SEAM.depth` into the mouse. Every cut
 * edge rounds over into its wall (`ROUND.edge`): a quarter round, the
 * surface let down along its normal and its normal turned out over the edge,
 * on `ROUND_STEPS` extra columns (and rows) gathered at the edge. Faces and
 * walls are wound to face out of the piece.
 */
function band(spec: BandSpec, surface: Surface, walls: Walls): void {
  const from = spec.from ?? 0;
  const to = spec.to ?? 1;
  const lift = spec.lift ?? 0;
  const r = ROUND.edge;
  const reachF = Math.min(r, ((to - from) * EXG.length) / 3) / EXG.length;
  const extra: number[] = [];
  for (const t of [0.15, 0.4, 0.7, 1]) {
    if (spec.walls.start) extra.push(from + reachF * t);
    if (spec.walls.end) extra.push(to - reachF * t);
  }
  const rows = [...new Set([from, ...GRID_ROWS, ...extra, to].filter((f) => f >= from && f <= to))].sort((a, b) => a - b);
  type Row = { f: number; first: number; pts: Vec3[]; base: Vec3[]; ns: Vec3[]; press: [number, number][] };
  const built: (Row | null)[] = rows.map((f) => {
    const span = spec.span(f);
    if (!span) return null;
    const [a, b] = span;
    const roundLow = !!spec.walls.low?.(f);
    const roundHigh = !!spec.walls.high?.(f);
    // The round reaches `r` into the piece (along the shell), or a quarter of
    // a narrow one — and its radius shrinks with it, so a piece tapering to
    // nothing at a tip (the body beside the top shell at the front, by the
    // tail's seam at the back) does not fold over its own round.
    const perLow = r / gapAt(f, a, r);
    const perHigh = r / gapAt(f, b, r);
    const reachLow = Math.min(r / perLow, (b - a) / 4);
    const reachHigh = Math.min(r / perHigh, (b - a) / 4);
    const us: number[] = [];
    const gather = (k: number) => 1 - Math.cos((Math.PI / 2) * (k / ROUND_STEPS));
    for (let k = 0; k < ROUND_STEPS; k++) us.push(a + reachLow * gather(k));
    us.push(...columns(a + reachLow, b - reachHigh, spec.cols, spec.spacing));
    for (let k = ROUND_STEPS - 1; k >= 0; k--) us.push(b - reachHigh * gather(k));
    const row: Row = { f, first: surface.positions.length / 3, pts: [], base: [], ns: [], press: [] };
    for (const u of us) {
      const s = shellPoint(f, u);
      const n = shellNormal(f, u);
      const base: Vec3 = [s[0] + n[0] * lift, s[1] + n[1] * lift, s[2] + n[2] * lift];
      // The nearest rounded edge within its round: how far in, its radius, and which way is out over it.
      let near: { d: number; radius: number; out: () => Vec3 } | null = null;
      const consider = (d: number, radius: number, out: () => Vec3) => {
        if (d < radius && (!near || d / radius < near.d / near.radius)) near = { d, radius, out };
      };
      const across = () => tangent(sub3(shellPoint(f, Math.min(1, u + 1e-4)), shellPoint(f, Math.max(-1, u - 1e-4))), n);
      const along = () => tangent(sub3(shellPoint(Math.min(1, f + 1e-4), u), shellPoint(Math.max(0, f - 1e-4), u)), n);
      if (roundLow) consider((u - a) * perLow, reachLow * perLow, () => scale3(across(), -1));
      if (roundHigh) consider((b - u) * perHigh, reachHigh * perHigh, across);
      if (spec.walls.start) consider((f - from) * EXG.length, reachF * EXG.length, () => scale3(along(), -1));
      if (spec.walls.end) consider((to - f) * EXG.length, reachF * EXG.length, along);
      let p = base;
      let normal = n;
      if (near) {
        const { d, radius, out } = near as { d: number; radius: number; out: () => Vec3 };
        const drop = roundDrop(d, radius);
        p = [base[0] - n[0] * drop, base[1] - n[1] * drop, base[2] - n[2] * drop];
        const sin = (radius - d) / radius;
        const cos = Math.sqrt(Math.max(0, 1 - sin * sin));
        const o = out();
        normal = unit3([n[0] * cos + o[0] * sin, n[1] * cos + o[1] * sin, n[2] * cos + o[2] * sin]);
      }
      const share = spec.press ? buttonShare(f, u) : ([0, 0] as [number, number]);
      surface.positions.push(...p);
      surface.normals.push(...normal);
      surface.uvs.push(xFracAt(p[0]), 1 - f);
      surface.press.push(...share);
      row.pts.push(p);
      row.base.push(base);
      row.ns.push(n);
      row.press.push(share);
    }
    return row;
  });
  const k = spec.cols + 2 * ROUND_STEPS;
  for (let i = 0; i + 1 < built.length; i++) {
    const r = built[i];
    const s = built[i + 1];
    if (!r || !s) continue;
    for (let j = 0; j < k; j++) {
      const a = r.first + j;
      const b = s.first + j;
      const c = s.first + j + 1;
      const d = r.first + j + 1;
      surface.indices.push(a, b, c, a, c, d);
    }
  }
  const depth = SEAM.depth + lift;
  // An edge from p to q with the piece on its left seen from outside: the
  // quad (p, q, q's foot, p's foot), wound to face out of the piece. It
  // starts where the edge's round ends upright, and its foot is `depth` under
  // the unrounded edge. Both ends go down the same way, along their mean
  // normal: pushed along each its own, where the shell turns tightly (the
  // side buttons' front ends, the tips) the two ends crossed over and the
  // quad twisted half inside out.
  const wall = (row: Row, j: number, other: Row, m: number, inside: Vec3) => {
    const at = walls.positions.length / 3;
    const np = row.ns[j];
    const nq = other.ns[m];
    const n = unit3([np[0] + nq[0], np[1] + nq[1], np[2] + nq[2]]);
    const [p, q, pb, qb] = [row.pts[j], other.pts[m], row.base[j], other.base[m]];
    walls.positions.push(...p, ...q);
    walls.positions.push(pb[0] - n[0] * depth, pb[1] - n[1] * depth, pb[2] - n[2] * depth);
    walls.positions.push(qb[0] - n[0] * depth, qb[1] - n[1] * depth, qb[2] - n[2] * depth);
    walls.press.push(...row.press[j], ...other.press[m], ...row.press[j], ...other.press[m]);
    walls.indices.push(at, at + 3, at + 1, at, at + 2, at + 3);
    walls.inside.push(inside);
  };
  for (let i = 0; i + 1 < built.length; i++) {
    const r = built[i];
    const s = built[i + 1];
    if (!r || !s) continue;
    const f = (r.f + s.f) / 2;
    // The low side walked up the rows, the high side back down them; the
    // piece's inside is the first column past the round.
    if (spec.walls.low?.(f)) wall(r, 0, s, 0, r.base[ROUND_STEPS]);
    if (spec.walls.high?.(f)) wall(s, k, r, k, r.base[k - ROUND_STEPS]);
  }
  for (let i = 0; i < built.length; i++) {
    const r = built[i];
    if (!r) continue;
    const before = built[i - 1];
    const after = built[i + 1];
    // The first row walked high to low, the last low to high; the inside is
    // the same column a few rows in, past the round.
    const inward = (step: number) => built[Math.min(built.length - 1, Math.max(0, i + step * (ROUND_STEPS + 2)))] ?? (step > 0 ? after : before);
    if (spec.walls.start && !before && after) {
      const ref = inward(1)!;
      for (let j = k; j > 0; j--) wall(r, j, r, j - 1, ref.base[j]);
    }
    if (spec.walls.end && !after && before) {
      const ref = inward(-1)!;
      for (let j = 0; j < k; j++) wall(r, j, r, j + 1, ref.base[j]);
    }
  }
}

/** A grid of `rows` along (closer at the tips, from `from` to `to`) and `cols` across, for the pieces that are not cut. */
function grid(
  surface: Surface,
  rows: number,
  cols: number,
  at: (f: number, s: number) => { p: Vec3; n: Vec3 },
  outward: boolean,
  from = 0,
  to = 1
): void {
  const first = surface.positions.length / 3;
  for (let i = 0; i <= rows; i++) {
    const f = from + ((to - from) * (1 - Math.cos((Math.PI * i) / rows))) / 2;
    for (let j = 0; j <= cols; j++) {
      const { p, n } = at(f, j / cols);
      surface.positions.push(...p);
      surface.normals.push(...n);
      surface.uvs.push(xFracAt(p[0]), 1 - f);
      surface.press.push(0, 0);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = first + i * (cols + 1) + j;
      const b = a + cols + 1;
      if (outward) surface.indices.push(a, b, b + 1, a, b + 1, a + 1);
      else surface.indices.push(a, b + 1, b, a, a + 1, b + 1);
    }
  }
}

const across = (s: number) => Math.sin((Math.PI / 2) * (2 * s - 1));

export type MouseParts = {
  /** The top shell and the body, the side under the wing and the underside: one material. */
  shell: Surface;
  /** The walls of every cut in the shell. */
  walls: Walls;
  /** The dark inside the cuts and the slot: the shell pushed in by `SEAM.depth`. */
  inside: Surface;
  side: Record<"forward" | "back", { surface: Surface; walls: Walls; normal: Vec3 }>;
  dpi: { surface: Surface; walls: Walls };
};

let parts: MouseParts | null = null;

/**
 * The mouse in pieces, in its own frame, built once. The top shell's halves
 * carry the buttons' press; their walls go down with them.
 */
export function mouseParts(): MouseParts {
  parts ??= (() => {
    const shell = emptySurface();
    const walls = emptyWalls();
    const cutBetweenHalves = (f: number, edge: "left" | "right") => {
      const e = tongueEdges(f);
      if (!e) return false;
      // Behind the slot the halves are one piece — unless the split's line has
      // run off the top shell and this edge is the shell's own.
      return (
        splitGap(f) > 0 ||
        (edge === "left" ? splitU(f) >= e.right - gapAt(f, e.right, SEAM.gap) : splitU(f) <= e.left + gapAt(f, e.left, SEAM.gap))
      );
    };
    band({ span: PIECES.topLeft, cols: 16, press: true, walls: { low: () => true, high: (f) => cutBetweenHalves(f, "left") } }, shell, walls);
    band({ span: PIECES.topRight, cols: 16, press: true, walls: { low: (f) => cutBetweenHalves(f, "right"), high: () => true } }, shell, walls);
    band({ span: PIECES.bodyLeft, cols: 28, walls: { high: () => true } }, shell, walls);
    band({ span: PIECES.bodyRight, cols: 16, spacing: "high", walls: { low: () => true } }, shell, walls);
    // The side under the wing, and the underside.
    const skirtAt = (f: number, v: number) => {
      const p = skirtPoint(f, v);
      const e = 1e-3;
      const dv = sub3(skirtPoint(f, Math.min(1, v + e)), skirtPoint(f, Math.max(0, v - e)));
      const df = sub3(skirtPoint(Math.min(1, f + e), v), skirtPoint(Math.max(0, f - e), v));
      return { p, n: unit3(cross3(dv, df)) };
    };
    grid(shell, 120, 6, skirtAt, false);
    grid(shell, 72, 56, (f, s) => ({ p: basePoint(f, across(s)), n: [0, -1, 0] }), false);

    const inside = emptySurface();
    grid(
      inside,
      90,
      64,
      (f, s) => {
        // Not out to the wing's edge: pushed down from there it stood outside
        // the side tucking in under the wing, a dark sliver in view.
        const inner = -1 + gapU(f, 0.0015);
        const u = inner + ((across(s) + 1) / 2) * (1 - inner);
        const p = shellPoint(f, u);
        const n = shellNormal(f, u);
        // Shallower over the front's tight round: pushed in further than its
        // radius, the inside folded over itself.
        const d = SEAM.depth * (0.3 + 0.7 * smoothstep((f - 0.015) / 0.1));
        return { p: [p[0] - n[0] * d, p[1] - n[1] * d, p[2] - n[2] * d], n };
      },
      true,
      // Not the last hair of either tip: pushed in from a tip pinched shut,
      // the inside folded over itself, and no cut is seen there.
      0.015,
      0.985
    );

    const sidePiece = (which: "forward" | "back") => {
      const surface = emptySurface();
      const w = emptyWalls();
      const { from, to } = SIDE_BUTTONS[which];
      band({ span: PIECES.side(which), cols: 5, lift: SIDE_BUTTONS.raise, from, to, walls: { low: () => true, high: () => true, start: true, end: true } }, surface, w);
      const mean: Vec3 = [0, 0, 0];
      for (let i = 0; i < surface.normals.length; i += 3) for (let k = 0; k < 3; k++) mean[k] += surface.normals[i + k];
      return { surface, walls: w, normal: unit3(mean) };
    };
    const dpi = { surface: emptySurface(), walls: emptyWalls() };
    band(
      { span: PIECES.dpi, cols: 6, lift: -MARKS.dpi.sink, from: MARKS.dpi.front, to: MARKS.dpi.back, walls: { low: () => true, high: () => true, start: true, end: true } },
      dpi.surface,
      dpi.walls
    );
    return { shell, walls, inside, side: { forward: sidePiece("forward"), back: sidePiece("back") }, dpi };
  })();
  return parts;
}

const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
/** A direction along the shell: `d` with its part along the normal `n` taken out, made unit. */
const tangent = (d: Vec3, n: Vec3): Vec3 => {
  const along = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
  return unit3([d[0] - n[0] * along, d[1] - n[1] * along, d[2] - n[2] * along]);
};
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit3 = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** The wheel's centre in the mouse's frame: on the slot's line at `MARKS.wheel.f`, standing `rise` proud of the shell. */
export function wheelCentre(): Vec3 {
  const { f, radius, rise } = MARKS.wheel;
  const x = xOfFrac(polylineAt(MARKS.split, f));
  const top = shellPoint(f, uAt(f, x))[1];
  return [x, top + rise - radius, zAt(f)];
}

/**
 * The mouse's buttons, numbered as `MouseEvent.button` numbers them: the
 * left 0, the wheel 1, the right 2, back 3, forward 4. `MouseEvent.buttons`
 * is a bit mask in another order (left 1, right 2, wheel 4, back 8, forward 16).
 */
export type MouseButton = 0 | 1 | 2 | 3 | 4;
export const MOUSE_BUTTONS: readonly MouseButton[] = [0, 1, 2, 3, 4];
const BIT_OF: Record<MouseButton, number> = { 0: 1, 1: 4, 2: 2, 3: 8, 4: 16 };

/** The buttons a `MouseEvent.buttons` mask holds down. */
export function buttonsHeld(mask: number): MouseButton[] {
  return MOUSE_BUTTONS.filter((b) => (mask & BIT_OF[b]) !== 0);
}

/**
 * Where the mouse may go on the mat, and what that does on the PC's screen:
 * the screen is mapped onto a rectangle of the mat around where the mouse
 * rests (its middle is the screen's middle), the screen's proportions, so
 * every place of the mouse is one place of the cursor and back — the two
 * ways of moving the cursor (the reader's own pointer over the screen, and
 * dragging the mouse on the desk) can never disagree about where the mouse
 * is. **Provisional (仮)** size, 14 cm wide: clear of the keyboard's right
 * end and of the mug, and on the mat (`layout.test`).
 */
export const MOUSE_TRAVEL = { width: 0.14, depth: (0.14 * DESK_SCREEN_PX.height) / DESK_SCREEN_PX.width } as const;

/** The mouse's offset from where it rests, kept inside its travel. */
export function clampTravel([dx, dz]: readonly [number, number]): [number, number] {
  const hw = MOUSE_TRAVEL.width / 2;
  const hd = MOUSE_TRAVEL.depth / 2;
  return [Math.min(hw, Math.max(-hw, dx)), Math.min(hd, Math.max(-hd, dz))];
}

/** The cursor's place on the PC's screen (CSS px from its top left) for the mouse moved `offset` from rest. Towards the reader is down. */
export function cursorFromMouse(offset: readonly [number, number]): { x: number; y: number } {
  const [dx, dz] = clampTravel(offset);
  return {
    x: (dx / MOUSE_TRAVEL.width + 0.5) * DESK_SCREEN_PX.width,
    y: (dz / MOUSE_TRAVEL.depth + 0.5) * DESK_SCREEN_PX.height,
  };
}

/** A place kept on the PC's screen. */
export function clampCursor({ x, y }: { x: number; y: number }): { x: number; y: number } {
  return { x: Math.min(DESK_SCREEN_PX.width, Math.max(0, x)), y: Math.min(DESK_SCREEN_PX.height, Math.max(0, y)) };
}

/** `cursorFromMouse` backwards. */
export function mouseFromCursor(cursor: { x: number; y: number }): [number, number] {
  return clampTravel([
    (cursor.x / DESK_SCREEN_PX.width - 0.5) * MOUSE_TRAVEL.width,
    (cursor.y / DESK_SCREEN_PX.height - 0.5) * MOUSE_TRAVEL.depth,
  ]);
}

/**
 * Picking the mouse up to slide it: hold still on it this long (seconds)
 * and it is in the hand; move more than `slop` px before that and it is not
 * (**仮**). A button pressed this way clicks at once, and lets go when the
 * hand takes the mouse — seated, the hand covers the palm and the buttons
 * are all of the mouse there is to press.
 */
export const GRAB = { hold: 0.35, slop: 6 } as const;

/** How far the wheel turns for a scroll of one CSS px (radians): a 100 px notch turns it 15°. */
export const WHEEL_TURN_PER_PX = (15 * Math.PI) / 180 / 100;
/** How far it turns for a drag of one px up or down with the pointer on it (radians, **仮**). Down turns its top towards the reader, as a finger rolling it would. */
export const WHEEL_DRAG_TURN_PER_PX = 0.03;

/**
 * The click sounds: recorded mouse clicks from the same pack as the keys,
 * Makoto Hiramatsu's "Press & Click FREE" (CC BY 4.0, credited on /privacy).
 * Each recorded click holds the button going down and, 50–400 ms later,
 * coming back up, cut into two clips. Eight clicks; the pack does not say
 * which button each is, so every button plays all eight in turn.
 *
 * The EX-G M-XGS30DBSK has quiet switches; the recording is an ordinary
 * click (whether to muffle it is waiting on the user).
 */
export const MOUSE_CLICKS = 8;

/** Which click the `strike`-th press of `button` plays (1-based): each button walks the eight from its own start. */
export function mouseSample(button: MouseButton, strike: number): number {
  return ((button * 3 + strike) % MOUSE_CLICKS) + 1;
}

/** Where a click is served from (`public/sounds/mouse/`). */
export function mouseSampleUrl(n: number, part: "down" | "up"): string {
  return `/sounds/mouse/click-${String(n).padStart(2, "0")}-${part}.mp3`;
}
