import { horizontalAt } from "./layout";

/**
 * The reader's walk: which foot is where in its step, worked out from how the
 * eye moves over the floor — so the legs walk whenever the camera travels,
 * whatever moved it (a flight to an area, a turn on the spot), without being
 * told about any of it.
 *
 * **Steps are counted in distance, not time.** One stride (both feet, two
 * steps) passes per `STRIDE` metres travelled, and a planted foot slides back
 * under the body exactly as fast as the body moves forward, so it stays put on
 * the floor at any speed — a walk timed by the clock would skate whenever the
 * flight sped up or slowed down. Turning on the spot counts too, as the feet
 * travelling round a small circle (`TURN_RADIUS`), and shuffles them.
 */

const DEG = Math.PI / 180;

/** **Provisional (仮).** One stride (left and right step), in metres. */
export const STRIDE = 0.9;
/** How high a swinging foot lifts at the top of its step. */
export const FOOT_LIFT = 0.07;
/** How far the feet travel round, per radian turned on the spot. */
export const TURN_RADIUS = 0.25;
/** The speed, in m/s, at and above which the walk is a full one: the feet lift highest, the head dips deepest. */
export const FULL_WALK_SPEED = 1.0;
/** **Provisional (仮).** How far the eye dips, in metres, as the weight comes down onto each foot. */
export const STEP_BOB = 0.015;
/** How far the arms swing against the legs, as a share of the feet's travel. */
export const ARM_SWING = 0.45;
/** How quickly the walk picks up and dies away, per second. */
const EASE_RATE = 8;
/** How quickly a foot left mid-step is brought down once the travelling stops, in strides per second. */
const SETTLE_RATE = 1.4;

export type Gait = {
  /** Strides taken. The left foot swings through the first half of each, the right through the second. */
  phase: number;
  /** 0 standing still … 1 a full walk. */
  amount: number;
  /**
   * The way the walk goes, in the body's frame: [to the right, forward].
   * Eased rather than snapped, and not renormalised: reversing, it shrinks
   * through nothing and grows again the other way, closing the feet up as it
   * does, instead of flipping the step round in a frame.
   */
  heading: [number, number];
  /** How much of the travel is going somewhere (1) rather than turning on the spot (0). */
  going: number;
  /** Where the eye was over the floor and which way the body faced, last frame. */
  last: { x: number; z: number; yaw: number } | null;
};

export const STANDING: Gait = { phase: 0, amount: 0, heading: [0, 1], going: 1, last: null };

const wrapAngle = (a: number) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
const toward = (from: number, to: number, fraction: number) => from + (to - from) * fraction;

/**
 * One frame of the walk. `x`/`z` is the held eye over the floor, `yaw` the
 * body's facing (radians); `carried` is how much of any movement is not the
 * reader's own feet — sat on the rolling chair, nobody walks.
 */
export function advanceGait(gait: Gait, x: number, z: number, yaw: number, dt: number, carried = 0): Gait {
  if (!gait.last || dt <= 0) return { ...gait, last: { x, z, yaw } };
  const dx = x - gait.last.x;
  const dz = z - gait.last.z;
  const distance = Math.hypot(dx, dz);
  const turned = Math.abs(wrapAngle(yaw - gait.last.yaw)) * TURN_RADIUS;
  const walked = (distance + turned) * (1 - carried);
  const fraction = 1 - Math.exp(-EASE_RATE * dt);

  const amount = toward(gait.amount, Math.min(1, walked / dt / FULL_WALK_SPEED), fraction);

  // Going somewhere: which way, in the body's own frame.
  let heading = gait.heading;
  if (distance > 1e-6) {
    const [fx, fz] = horizontalAt(yaw / DEG);
    const right = (dx * -fz + dz * fx) / distance;
    const forward = (dx * fx + dz * fz) / distance;
    heading = [toward(heading[0], right, fraction), toward(heading[1], forward, fraction)];
  }
  const going = walked > 1e-6 ? distance / (distance + turned) : gait.going;

  let phase = gait.phase + walked / STRIDE;
  // Stopped with a foot in the air: finish the step rather than leave it hanging.
  if (walked / dt < 0.05) {
    const toDown = Math.ceil(phase * 2 - 1e-9) / 2 - phase;
    phase += Math.min(toDown, SETTLE_RATE * dt);
  }
  return { phase, amount, heading, going, last: { x, z, yaw } };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Where a foot is in its step: how far ahead of where it stands at rest it is,
 * in the body's frame ([right, forward], metres), and how high it is lifted.
 * `side` 0 is the left foot, 1 the right.
 */
export function footStep(gait: Gait, side: 0 | 1): { offset: [number, number]; lift: number } {
  const p = (((gait.phase + side * 0.5) % 1) + 1) % 1;
  // Half a stride per step; the feet close up as the walk dies away.
  const reach = (STRIDE / 2) * gait.going * Math.min(1, gait.amount * 1.5);
  let along: number;
  let lift = 0;
  if (p < 0.5) {
    // Swinging: from behind to ahead, off the floor.
    const s = p / 0.5;
    along = reach * (smooth(s) - 0.5);
    lift = FOOT_LIFT * Math.min(1, gait.amount * 1.5) * Math.sin(Math.PI * s);
  } else {
    // Planted: the body passes over it at exactly the speed it travels.
    along = reach * (0.5 - (p - 0.5) / 0.5);
  }
  return { offset: [gait.heading[0] * along, gait.heading[1] * along], lift };
}

/** How far the eye dips this frame, in metres (negative): deepest as each foot comes down. */
export function stepBob(gait: Gait): number {
  return -STEP_BOB * gait.amount * (0.5 + 0.5 * Math.cos(4 * Math.PI * gait.phase));
}
