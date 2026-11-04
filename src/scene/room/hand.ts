import { STATURE } from "./figure";

/**
 * The owner's hands: a palm, four fingers of three bones and a thumb, as
 * points a hand's own frame puts them at, and the grips that curl them.
 * Drawn by `objects/Self.tsx`, which puts a capsule along every bone and
 * curls them on a skeleton; read by the tests, which check that the fingers
 * sit on the keys and the mice and not in them.
 *
 * The character sheet keeps its hands in its pockets, so nothing of them can
 * be measured there: the sizes are the usual shares of a body's height
 * (hand 0.108 of it, breadth 0.048) at the figure's 168 cm. Sat at the desk
 * the hands are the biggest thing of the body the reader sees — the ovals
 * they were before showed it most (2026-11-01).
 *
 * The hand's frame, for the right hand: the wrist at the origin, +Y along
 * the fingers, +X out of the back of the hand, +Z the thumb's side. The left
 * hand is its mirror (`handBasis` turns +Z the other way).
 */

type Vec3 = [number, number, number];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** Wrist crease to the tip of the middle finger. */
const LENGTH = 0.108 * STATURE;
/** Wrist crease to the middle finger's knuckle: the palm's share of the hand. */
const PALM_SHARE = 0.57;

export const HAND = {
  length: LENGTH,
  palm: LENGTH * PALM_SHARE,
  /** Across the knuckles, and across the wrist where the palm meets the forearm. */
  breadth: 0.048 * STATURE,
  wristBreadth: 0.062,
  /** Back to front through the palm. */
  thickness: 0.028,
  /**
   * How far back along the forearm from the arm's end (`BodyJoints.hands`,
   * the point that rests over the keys) the wrist is: the arm's end is under
   * the ball of the hand, just behind the knuckles, and the forearm left
   * between elbow and wrist is the usual 0.155 of the height (26 cm). With
   * the wrist 4.5 cm back (the palm's middle at the arm's end, as the old
   * oval's was), the fingers reached 2–3 cm past the EX-G's front and the
   * HHKB's home row.
   */
  wristBack: 0.08,
} as const;

/**
 * A finger or the thumb: where its first bone starts, which way the bones
 * point uncurled, which way they curl, how long each is and how thick.
 */
export type Digit = {
  base: Vec3;
  dir: Vec3;
  /** Square to `dir`: curling turns the bones from `dir` towards this. */
  bend: Vec3;
  lengths: readonly number[];
  radii: readonly number[];
};

/** The phalanges' shares of a finger, knuckle to tip. */
const PHALANGES = [0.46, 0.3, 0.24];
const PALM_SIDE: Vec3 = [-1, 0, 0];

function finger(across: number, back: number, length: number, radius: number, splay: number): Digit {
  return {
    base: [0.002, HAND.palm - back, across],
    dir: [0, Math.cos(splay), Math.sin(splay)],
    bend: PALM_SIDE,
    lengths: PHALANGES.map((share) => share * length),
    radii: [radius, radius * 0.92, radius * 0.85],
  };
}

const MIDDLE = LENGTH - HAND.palm;

/** Index, middle, ring and little, from the thumb's side across. */
export const FINGERS: readonly Digit[] = [
  finger(0.029, 0.004, MIDDLE * 0.91, 0.0088, 0.08),
  finger(0.0095, 0, MIDDLE, 0.0092, 0.02),
  finger(-0.0095, 0.005, MIDDLE * 0.95, 0.0085, -0.05),
  finger(-0.028, 0.016, MIDDLE * 0.75, 0.0075, -0.12),
];

const THUMB_DIR = unit([-0.35, 0.75, 0.45]);
/** The thumb bends in across the palm. */
const THUMB_BEND = unit(sub([-0.5, 0, -1], scale(THUMB_DIR, dot([-0.5, 0, -1], THUMB_DIR))));

/** The thumb: its long first bone (the ball of the thumb) from low on the palm's edge, then two short ones. */
export const THUMB: Digit = {
  base: [-0.004, 0.022, 0.026],
  dir: THUMB_DIR,
  bend: THUMB_BEND,
  lengths: [0.045, 0.032, 0.027],
  radii: [0.0125, 0.0105, 0.0095],
};

/**
 * A way of holding the hand: how far each joint of each finger curls
 * (radians, knuckle first; index, middle, ring, little), the thumb's, and
 * how far the wrist bends back with the forearm level (less the steeper it
 * is: none hanging). **The three grips are provisional (仮)**, set by the
 * numbers the tests check: the fingertips on the keys and the mouse, not in
 * them, and the palm clear of both.
 */
export type Grip = {
  fingers: readonly (readonly number[])[];
  thumb: readonly number[];
  lift: number;
  /**
   * How far the hand is turned to lie level, whichever way the forearm
   * slopes, 0–1: on a desk the wrist bends to put the hand on it. At the
   * Mac's seat the elbow is low (0.73 m) and the forearm climbs to the
   * mouse; along the forearm the fingers stood 3–8 cm over it.
   */
  level: number;
};

/** Hanging at the side, or swinging walking: a loose, half-open hand. */
export const RELAXED: Grip = {
  fingers: [
    [0.2, 0.35, 0.25],
    [0.25, 0.42, 0.28],
    [0.3, 0.48, 0.3],
    [0.38, 0.55, 0.32],
  ],
  thumb: [0, 0.2, 0.2],
  lift: 0,
  level: 0,
};

/**
 * The left hand on the HHKB: knuckles high, the fingers coming down onto the
 * keys. With the wrist straight, the palm at the keys' height curled the
 * fingertips 2–3 cm into the far rows.
 */
export const TYPING: Grip = {
  fingers: [
    [0.56, 1.06, 0.63],
    [0.45, 0.85, 0.5],
    [0.36, 0.68, 0.4],
    [0.38, 0.72, 0.43],
  ],
  thumb: [0, 0.43, 0.43],
  lift: 0.25,
  level: 1,
};

/**
 * The right hand on the mouse, held in the palm: the index, middle and ring
 * fingers on the buttons' fronts. The EX-G is the small size (6.4 cm
 * across) and the hand a man's, so the little finger is past its right side
 * and the thumb past its left; curled further, each went into its side.
 */
export const MOUSE_GRIP: Grip = {
  fingers: [
    [0.23, 0.54, 0.39],
    [0.2, 0.47, 0.34],
    [0.13, 0.3, 0.21],
    [0.18, 0.42, 0.3],
  ],
  thumb: [0, 0.3, 0.3],
  lift: 0.1,
  level: 1,
};

/**
 * The right hand on the Mac's M0100: lower and boxier than the EX-G, it put
 * the knuckles low enough that even straight, the ring and little fingers
 * went into it; the wrist bends back further, and the index and middle
 * fingers rest just over its front.
 */
export const MAC_MOUSE_GRIP: Grip = {
  fingers: [
    [0.23, 0.53, 0.38],
    [0.23, 0.53, 0.38],
    [0.11, 0.25, 0.18],
    [0.06, 0.14, 0.1],
  ],
  thumb: [0, 0.58, 0.58],
  lift: 0.2,
  level: 1,
};

/** Part way from one grip to another. */
export function mixGrip(a: Grip, b: Grip, t: number): Grip {
  const m = (x: number, y: number) => x * (1 - t) + y * t;
  return {
    fingers: a.fingers.map((f, i) => f.map((c, k) => m(c, b.fingers[i][k]))),
    thumb: a.thumb.map((c, k) => m(c, b.thumb[k])),
    lift: m(a.lift, b.lift),
    level: m(a.level, b.level),
  };
}

/**
 * How a hand holds itself: the left types and the right holds the mouse as
 * far as the body is sat (`BodyJoints.sat`) — the PC's mouse or the Mac's
 * as far over to the Mac's seat as it is (`BodyJoints.along`).
 */
export function gripFor(side: number, sat: number, along = 0): Grip {
  return mixGrip(RELAXED, side < 0 ? TYPING : mixGrip(MOUSE_GRIP, MAC_MOUSE_GRIP, along), sat);
}

/** Every joint of a digit, base to tip, in the hand's frame. */
export function digitJoints(digit: Digit, curl: readonly number[]): Vec3[] {
  const joints: Vec3[] = [digit.base];
  let angle = 0;
  digit.lengths.forEach((length, k) => {
    angle += curl[k] ?? 0;
    const along = add(scale(digit.dir, Math.cos(angle)), scale(digit.bend, Math.sin(angle)));
    joints.push(add(joints[k], scale(along, length)));
  });
  return joints;
}

/** Every digit's joints for a grip, the thumb last. */
export function handJoints(grip: Grip): Vec3[][] {
  return [...FINGERS.map((f, i) => digitJoints(f, grip.fingers[i])), digitJoints(THUMB, grip.thumb)];
}

/** Every digit, the thumb last — in the order `handJoints` gives their joints. */
export const DIGITS: readonly Digit[] = [...FINGERS, THUMB];

export type HandBasis = {
  /** Out of the back of the hand, along the fingers, and the thumb's side. */
  x: Vec3;
  y: Vec3;
  z: Vec3;
  wrist: Vec3;
  /** Out of the back of the wrist, the hand not bent: the forearm's own back, where a watch's face goes. */
  back: Vec3;
};

/**
 * How a hand is turned, from its forearm: +Y down the forearm, the back of
 * the hand (+X) as near straight up as that allows, a little out — so on the
 * keys and the mouse the back of the hand is up, and hanging at the side it
 * faces out with the palm to the thigh. Turned towards level as far as the
 * grip's `level`, then bent back at the wrist by its `lift`. The wrist stays
 * on the forearm's line. `out` is the body's side the arm is on, `side` −1 for the
 * left hand (its thumb, +Z, the other way).
 *
 * **The arm's end (`BodyJoints.hands`) is where the underside of the palm
 * rests**, so the wrist stands half the palm's thickness over the forearm's
 * line. With the palm's middle there instead, the palm sank into the mouse's
 * back (the arm's end is at 0.82 m, the mouse's hump 0.827 m).
 */
export function handBasis(elbow: Vec3, hand: Vec3, out: Vec3, side: number, grip: Pick<Grip, "lift" | "level">): HandBasis {
  const forearm = unit(sub(hand, elbow));
  const level: Vec3 = [forearm[0], 0, forearm[2]];
  const y = Math.hypot(level[0], level[2]) > 1e-6 ? unit(add(scale(forearm, 1 - grip.level), scale(unit(level), grip.level))) : forearm;
  // Up for a level hand, out for a hanging one: hanging a little forward, "up"
  // left the back of the hand turned 48° to the front.
  const want = add([0, 1 - Math.abs(y[1]), 0], scale(out, 0.35));
  const flat = sub(want, scale(y, dot(want, y)));
  const back = Math.hypot(flat[0], flat[1], flat[2]) > 1e-6 ? unit(flat) : unit(sub(out, scale(y, dot(out, y))));
  const wrist = add(sub(hand, scale(forearm, HAND.wristBack)), scale(back, HAND.thickness / 2));
  const bend = grip.lift * (1 - Math.abs(y[1]));
  const x = sub(scale(back, Math.cos(bend)), scale(y, Math.sin(bend)));
  const along = add(scale(y, Math.cos(bend)), scale(back, Math.sin(bend)));
  return { x, y: along, z: scale(cross(x, along), side), wrist, back };
}

/** A point in a hand's frame, in the room. */
export function handToWorld(basis: HandBasis, p: Vec3): Vec3 {
  return add(basis.wrist, add(add(scale(basis.x, p[0]), scale(basis.y, p[1])), scale(basis.z, p[2])));
}
