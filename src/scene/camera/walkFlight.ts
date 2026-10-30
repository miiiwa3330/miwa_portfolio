import { easeInOutCubic, wrapAngle } from "./cameraMotion";
import { blendRoomPose, easedMove, floorSpot, type RoomMove, type RoomPose } from "./roomCamera";
import { EYE_HEIGHT } from "../room/layout";
import { ROLL_IN, seatShare, seatedShare, standForward } from "../room/seat";

/**
 * A flight the reader walks. The camera is the room owner's eyes, so stepping
 * out towards an area is walking there, and the PC's zoom is sitting down:
 *
 *     [roll out → stand up] → walk → [sit down → roll in]
 *
 * The bracketed legs are only at the chair (`room/seat.ts`): the reader sits
 * down on it pulled out, then rolls in with it, and gets up the same way in
 * reverse. The walk keeps a walker's pace — it speeds up and slows down
 * over `WALK_EASE` and cruises at `WALK_SPEED` between — rather than easing
 * the whole way like a camera; the steps themselves are the body's business
 * (`room/gait.ts`), counted from how far the eye moves.
 *
 * Where nothing walks (turning on the spot, a change of lens), it is the
 * plain glide it always was (`easedMove`), and never shorter than the
 * duration asked for: a walk shorter than that is slowed to fit.
 */

/** **Provisional (仮).** The walking pace, in m/s — brisk; a room 6.6 m across. */
export const WALK_SPEED = 1.5;
/** How long the walk takes to get up to pace, and to stop. */
export const WALK_EASE = 0.35;
/** **Provisional (仮).** Sitting down from standing on the pulled-out chair, and getting up. */
export const SIT_SECONDS = 0.8;
/** **Provisional (仮).** Rolling in to the desk with the chair, all the way (`ROLL_IN`), and back out. */
export const ROLL_SECONDS = 0.45;

/** How long walking `distance` metres takes at the room's pace, from standing to standing. */
export function walkTime(distance: number): number {
  if (distance <= 0) return 0;
  const easing = WALK_SPEED * WALK_EASE;
  return distance >= easing ? distance / WALK_SPEED + WALK_EASE : 2 * Math.sqrt((distance * WALK_EASE) / WALK_SPEED);
}

/**
 * How far along a walk of `distance` metres the walker is after `t` seconds:
 * evenly faster over the first `WALK_EASE`, at pace, evenly slower to a stop.
 */
export function walkedBy(distance: number, t: number): number {
  const total = walkTime(distance);
  if (t <= 0 || total <= 0) return 0;
  if (t >= total) return distance;
  const ease = Math.min(WALK_EASE, total / 2);
  const pace = distance / (total - ease);
  const rate = pace / ease;
  if (t < ease) return 0.5 * rate * t * t;
  if (t > total - ease) return distance - 0.5 * rate * (total - t) ** 2;
  return 0.5 * pace * ease + pace * (t - ease);
}

/** The eye over the floor for a place and a distance out from it along a yaw (radians). */
function spot(x: number, z: number, forward: number, yaw: number): [number, number] {
  return floorSpot({ x, z, forward, yaw });
}

/**
 * The way the eye walks over the floor going from place `pa` and (`a`,
 * `yawA`) to `pb` and (`b`, `yawB`) with all of them blended evenly — the
 * way a pose blends: the camera steps out along the ray it looks along, so
 * the way out curves when it turns as it goes.
 */
function walkPath(
  pa: [number, number],
  a: number,
  yawA: number,
  pb: [number, number],
  b: number,
  yawB: number
): { length: number; blendAt: (share: number) => number } {
  const turn = wrapAngle(yawB - yawA);
  const steps = 32;
  const along = [0];
  let [px, pz] = spot(pa[0], pa[1], a, yawA);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const [x, z] = spot(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, a + (b - a) * t, yawA + turn * t);
    along.push(along[i - 1] + Math.hypot(x - px, z - pz));
    px = x;
    pz = z;
  }
  const length = along[steps];
  return {
    length,
    // How far through the blend a share of the way is. The blend does not
    // cover the floor evenly (a turn swings the step out along the view), so
    // going by the blend alone walked 2% over the pace turning to the shelf.
    blendAt(share) {
      if (length <= 0) return share;
      const target = share * length;
      let i = 1;
      while (i < steps && along[i] < target) i++;
      const span = along[i] - along[i - 1];
      return (i - 1 + (span > 0 ? (target - along[i - 1]) / span : 0)) / steps;
    },
  };
}

const ease = (from: number, to: number, t: number) => from + (to - from) * easeInOutCubic(Math.max(0, Math.min(1, t)));

/** A flight from one held pose to another, walked; at least `minDuration` seconds long. */
export function planRoomMove(from: RoomPose, to: RoomPose, minDuration: number): RoomMove {
  const fromSat = seatShare(from) > 0;
  const toSat = seatShare(to) > 0;
  // Already sat and staying sat (a resize, a repeat): nothing to get up for.
  if (fromSat && toSat) return easedMove(from, to, minDuration);

  const stand = standForward();
  // Getting up: roll back out to where the chair stands pulled out, then rise.
  const rollOut = fromSat ? Math.max(0, from.forward - stand) : 0;
  const rise = fromSat ? seatedShare(from.eyeHeight) : 0;
  // Sitting down: the same, the other way round.
  const rollIn = toSat ? Math.max(0, to.forward - stand) : 0;
  const sit = toSat ? seatedShare(to.eyeHeight) : 0;

  const walkFrom = fromSat ? Math.min(from.forward, stand) : from.forward;
  const walkTo = toSat ? Math.min(to.forward, stand) : to.forward;
  const heightFrom = fromSat ? EYE_HEIGHT : from.eyeHeight;
  const heightTo = toSat ? EYE_HEIGHT : to.eyeHeight;
  const path = walkPath([from.x, from.z], walkFrom, from.yaw, [to.x, to.z], walkTo, to.yaw);
  const distance = path.length;

  const legs = {
    rollOut: (rollOut / ROLL_IN) * ROLL_SECONDS,
    rise: rise * SIT_SECONDS,
    walk: walkTime(distance),
    sit: sit * SIT_SECONDS,
    rollIn: (rollIn / ROLL_IN) * ROLL_SECONDS,
  };
  const natural = legs.rollOut + legs.rise + legs.walk + legs.sit + legs.rollIn;
  // Nothing to walk: a turn on the spot, or a change of lens.
  if (natural <= 1e-6 || (distance < 1e-3 && !fromSat && !toSat)) return easedMove(from, to, minDuration);

  const stretch = Math.max(1, minDuration / natural);
  const t1 = legs.rollOut * stretch;
  const t2 = t1 + legs.rise * stretch;
  const t3 = t2 + legs.walk * stretch;
  const t4 = t3 + legs.sit * stretch;
  const duration = natural * stretch;
  // Unwrapped from where the flight starts, as `blendRoomPose` turns: the short way round.
  const endYaw = from.yaw + wrapAngle(to.yaw - from.yaw);

  return {
    duration,
    at(elapsed) {
      const t = Math.max(0, Math.min(duration, elapsed));
      // The lens, the field of view, the pitch and the card's shifts glide the whole way.
      const pose = blendRoomPose(from, to, easeInOutCubic(duration > 0 ? t / duration : 1));
      let forward: number;
      let eyeHeight: number;
      let yaw: number;
      // The place on the floor moves only while walking: before it, the reader is still where they were.
      let place = t < t2 ? 0 : 1;
      if (t < t1) {
        forward = ease(from.forward, walkFrom, t / t1);
        eyeHeight = from.eyeHeight;
        yaw = from.yaw;
      } else if (t < t2) {
        forward = walkFrom;
        eyeHeight = ease(from.eyeHeight, heightFrom, (t - t1) / (t2 - t1));
        yaw = from.yaw;
      } else if (t < t3) {
        const share = path.blendAt(distance > 0 ? walkedBy(distance, (t - t2) / stretch) / distance : (t - t2) / (t3 - t2));
        forward = walkFrom + (walkTo - walkFrom) * share;
        eyeHeight = heightFrom + (heightTo - heightFrom) * share;
        yaw = from.yaw + (endYaw - from.yaw) * share;
        place = share;
      } else if (t < t4) {
        forward = walkTo;
        eyeHeight = ease(heightTo, to.eyeHeight, (t - t3) / (t4 - t3));
        yaw = endYaw;
      } else {
        forward = t4 < duration ? ease(walkTo, to.forward, (t - t4) / (duration - t4)) : to.forward;
        eyeHeight = to.eyeHeight;
        yaw = endYaw;
      }
      return { ...pose, x: from.x + (to.x - from.x) * place, z: from.z + (to.z - from.z) * place, forward, eyeHeight, yaw };
    },
  };
}

/**
 * Sat at the desk, from one of its views to another (`room/deskViews.ts`):
 * the head turns, and between the PC's seat and the Mac's the chair rolls —
 * so the eye goes straight over the floor from the one seat to the other,
 * whatever the turn does. Blending the poses' places instead swung the eye
 * out along the turn (6 cm forward half-way through a turn of the head to
 * the right-hand monitor, where nothing should move but the head).
 */
export function seatedMove(from: RoomPose, to: RoomPose, duration: number): RoomMove {
  const a = floorSpot(from);
  const b = floorSpot(to);
  return {
    duration,
    at(elapsed) {
      const t = easeInOutCubic(duration > 0 ? Math.min(1, elapsed / duration) : 1);
      if (t >= 1) return to;
      const pose = blendRoomPose(from, to, t);
      const [x, z] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      // Back along the view by its step out, so `floorSpot` lands on the straight line.
      return { ...pose, x: x - Math.sin(pose.yaw) * pose.forward, z: z + Math.cos(pose.yaw) * pose.forward };
    },
  };
}

/** One move and then another, as one flight. */
export function chainMoves(first: RoomMove, second: RoomMove): RoomMove {
  return {
    duration: first.duration + second.duration,
    at: (elapsed) => (elapsed < first.duration ? first.at(elapsed) : second.at(elapsed - first.duration)),
  };
}
