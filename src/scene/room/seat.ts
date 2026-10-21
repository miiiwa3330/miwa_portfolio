import {
  CHAIR_SEAT,
  CHAIR_SEAT_FORWARD,
  EYE_HEIGHT,
  SEATED_EYE_HEIGHT,
  SUBJECTS,
  chairBackZ,
  horizontalAt,
  subjectYaw,
  zoomView,
} from "./layout";
import { floorSpot, type RoomPose } from "../camera/roomCamera";

/**
 * Sitting down at the PC: where the reader stands to sit, how far down they
 * are, and where the chair is meanwhile.
 *
 * Sat at the PC, the chair is pushed in so far that its seat reaches the
 * desk's front edge — there is no room to stand between the two. So the
 * reader sits the way anyone does: down onto the chair pulled out, then rolls
 * in with it (`ROLL_IN`). And the pulled-out chair stands on the straight
 * line from the centre to the desk, which the reader walks along, so it waits
 * off to the left (`CHAIR_PARKED`) and is brought round behind the legs over
 * the last steps in (`CHAIR_APPROACH`), then under them as they go down.
 *
 * Everything here is a function of the camera's held pose (no sway, no step
 * bob), so the chair and the body cannot disagree with the flight about how
 * far through sitting down the reader is.
 */

const DEG = Math.PI / 180;

/** **Provisional (仮).** How far the reader rolls in with the chair, once sat down on it pulled out. */
export const ROLL_IN = 0.3;
/**
 * **Provisional (仮).** Where the chair waits while nobody is sitting on it,
 * relative to its pulled-out place: off the walk to the desk, to the left,
 * turned a little — as if pushed aside on getting up.
 */
export const CHAIR_PARKED = { x: -0.62, yaw: 0.45 } as const;
/** How far behind its pulled-out place the chair comes round to, clear of the standing reader's calves. */
export const CHAIR_BEHIND = 0.65;
/** Over how much of the walk in, before the place to sit, the chair is brought round behind the reader. */
export const CHAIR_APPROACH = 0.5;
/** How far through sitting down (`seatShare`) the chair is in place under the reader. */
export const CHAIR_IN_PLACE = 0.7;

/** The seated eye's distance out from the centre, along `seatYaw()` — the PC's zoom. */
export function seatForward(): number {
  return zoomView("desk").forward;
}

/** Where the reader stands to sit down (and stands up): the seated eye's spot with the chair pulled out. */
export function standForward(): number {
  return seatForward() - ROLL_IN;
}

/** The way the seat faces from the centre, in degrees. */
export function seatYaw(): number {
  return subjectYaw("desk");
}

/** How far through standing → seated an eye height is: 0 at standing height, 1 at the seated one. */
export function seatedShare(eyeHeight: number): number {
  return Math.max(0, Math.min(1, (EYE_HEIGHT - eyeHeight) / (EYE_HEIGHT - SEATED_EYE_HEIGHT)));
}

const smoothstep = (from: number, to: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** The held eye's place over the floor, along the seat's line and to its right, in metres. */
function onSeatLine(pose: RoomPose): { along: number; across: number } {
  const [x, z] = floorSpot(pose);
  const [ux, uz] = horizontalAt(seatYaw());
  return { along: x * ux + z * uz, across: x * -uz + z * ux };
}

/** 1 on the seat's line, 0 more than a body's width off it. */
function onLine(across: number): number {
  return 1 - smoothstep(0.1, 0.25, Math.abs(across));
}

/**
 * How far through sitting down the reader is: 0 standing (anywhere), 1 sat.
 *
 * Only at the chair. Height alone is not enough: the hologram's zoom lowers
 * the eye too (to 1.45 m), and read as a share of sitting that put the hands
 * a quarter of the way to the keyboard while standing at the hologram.
 */
export function seatShare(pose: RoomPose): number {
  const { along, across } = onSeatLine(pose);
  const atChair = smoothstep(standForward() - 0.2, standForward() - 0.05, along) * (1 - smoothstep(seatForward() + 0.05, seatForward() + 0.2, along));
  return seatedShare(pose.eyeHeight) * atChair * onLine(across);
}

/**
 * Where the chair stands, in the desk's own frame (`pieceToWorld`'s: +Z
 * towards the centre): its back's foot at `x`/`z`, turned `yaw` (radians,
 * three.js's sense — anticlockwise from above).
 *
 * Sat, it is under the reader, its back `CHAIR_BACK_BEHIND_EYE` behind the
 * eye (`chairBackZ`, at the desk), and rolls in with them. Going down, it
 * comes in from behind to there. Walking in, it comes round from aside to
 * behind. Anywhere else it is aside.
 */
export function chairPlacement(pose: RoomPose): { x: number; z: number; yaw: number } {
  const pcX = SUBJECTS.desk.local[0];
  const { along, across } = onSeatLine(pose);
  const sat = seatShare(pose);
  if (sat >= 1) return { x: pcX, z: chairBackZ() + (seatForward() - along), yaw: 0 };

  const pulledOut = chairBackZ() + ROLL_IN;
  // Walking in: first back, alongside the reader, then across behind them.
  // Only walking up to it facing the desk: walked past on the keys (`freeWalk`), it stays put.
  const facing = smoothstep(0.7, 0.85, Math.cos(pose.yaw - seatYaw() * DEG));
  const approach = smoothstep(standForward() - CHAIR_APPROACH, standForward(), along) * onLine(across) * facing;
  const back = smoothstep(0, 0.5, approach);
  const over = smoothstep(0.5, 1, approach);
  // Sitting down: forward, under them.
  const under = smoothstep(0, CHAIR_IN_PLACE, sat);
  return {
    x: pcX + CHAIR_PARKED.x * (1 - over),
    z: pulledOut + CHAIR_BEHIND * back * (1 - under),
    yaw: CHAIR_PARKED.yaw * (1 - over),
  };
}

/** The chair's seat over the floor, in its own frame: from the back's foot towards the desk (-Z). */
export const CHAIR_SEAT_SPAN = {
  halfWidth: CHAIR_SEAT.width / 2,
  from: CHAIR_SEAT_FORWARD - CHAIR_SEAT.depth / 2,
  to: CHAIR_SEAT_FORWARD + CHAIR_SEAT.depth / 2,
} as const;
