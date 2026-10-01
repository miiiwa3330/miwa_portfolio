import {
  CHAIR_SEAT_TOP,
  HAND_Y,
  KEYBOARD,
  MOUSE,
  PIECES,
  SEATED_EYE_HEIGHT,
  horizontalAt,
  pieceToWorld,
} from "./layout";
import { placeCamera, type RoomPose } from "../camera/roomCamera";
import { STANDING, footStep, ARM_SWING, type Gait } from "./gait";
import { seatShare, seatedShare } from "./seat";

export { placeCamera, seatedShare };

/**
 * The reader's own body. The reader is the room's owner, looking out of
 * their own eyes (docs/room-migration.md, "自分自身"), so the body stands
 * wherever the camera is, turned the way it is turned: looking down shows
 * it, the security camera on the right-hand monitor films it, and sitting
 * down at the PC puts its hands on the keyboard and the mouse.
 *
 * It walks wherever the camera travels (`room/gait.ts` works the steps out
 * from the eye's movement) and sits down on the chair at the PC
 * (`room/seat.ts`). The legs are two bones each, bent at the knee to reach
 * wherever the foot has to be.
 *
 * **Provisional (仮) proportions**, a simple figure for now; what it looks
 * like is undecided. What is not provisional is where it is: the head is
 * round the eye, the body hangs below and a little behind it, and nothing of
 * it may come into the reader's own view looking ahead (tested).
 */

type Vec3 = [number, number, number];

/** From the eye down to the base of the neck, and back from the eye to it. */
export const NECK_DROP = 0.17;
export const NECK_BACK = 0.05;
/** How far in front of the hips the feet stand — a little, as someone standing at ease does, so they show looking down. */
export const FEET_FORWARD = 0.15;
/** Walking, the feet pass under the hips instead: a stride's reach either side of a point this far ahead. */
const FEET_FORWARD_WALKING = 0.05;
/** From the base of the neck to the hips. Chosen so the seated eye height puts the hips on the chair's seat. */
export const TORSO = 0.46;
export const SHOULDER_HALF = 0.19;
/** How far the chest stands in front of the torso's axis (its half-depth), and how wide it is either side. */
export const TORSO_DEPTH = 0.09;
export const TORSO_HALF_WIDTH = 0.15;
export const HIP_HALF = 0.1;
/** How far the hanging hands reach below the shoulders. */
const ARM = 0.62;
/**
 * The leg's two bones. Together a little longer than the standing hips are
 * high (0.92 m), so a standing knee is soft rather than locked, and a foot at
 * the end of a step still reaches the floor.
 */
export const THIGH = 0.47;
export const SHIN = 0.48;
/** Sat, the feet rest this far out in front of the hips, under the desk. */
const SEATED_FEET_FORWARD = 0.5;

export type BodyJoints = {
  /** The way the body faces: the camera's yaw, never its pitch — the body does not tilt to look up or down. */
  yaw: number;
  head: Vec3;
  neck: Vec3;
  hips: Vec3;
  shoulders: [Vec3, Vec3];
  elbows: [Vec3, Vec3];
  hands: [Vec3, Vec3];
  knees: [Vec3, Vec3];
  feet: [Vec3, Vec3];
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Where the hands rest at the desk: the left on the keyboard, the right on the mouse. */
export function deskHands(): [Vec3, Vec3] {
  return [
    pieceToWorld(PIECES.desk, [KEYBOARD.x - 0.1, HAND_Y, KEYBOARD.z]),
    pieceToWorld(PIECES.desk, [MOUSE.x, HAND_Y, MOUSE.z]),
  ];
}

/**
 * A leg reaching from the hip for `target`, the knee bending towards `pole`.
 * Out of reach, the foot stops short along the same line — it lifts off the
 * floor rather than the leg stretching.
 */
export function bendLeg(hip: Vec3, target: Vec3, pole: Vec3): { knee: Vec3; foot: Vec3 } {
  const d = sub(target, hip);
  const distance = Math.hypot(d[0], d[1], d[2]);
  const reach = THIGH + SHIN - 1e-6;
  const length = Math.max(Math.abs(THIGH - SHIN) + 1e-6, Math.min(reach, distance));
  const dir = scale(d, 1 / distance);
  const foot = distance <= reach ? target : add(hip, scale(dir, length));
  // The knee: along the leg by `a`, then out to the side the knee bends by `h`.
  const a = (THIGH * THIGH - SHIN * SHIN + length * length) / (2 * length);
  const h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  const across = sub(pole, scale(dir, dot(pole, dir)));
  const acrossLength = Math.hypot(across[0], across[1], across[2]) || 1;
  return { knee: add(add(hip, scale(dir, a)), scale(across, h / acrossLength)), foot };
}

/**
 * Every joint of the body for a pose. `pose` is the pose as drawn (sway and
 * step included — the body carries the head); `gait` is the walk
 * (`room/gait.ts`); `sat` is how far through sitting down at the PC the
 * reader is, worked out from the held pose (`seatShare`).
 */
export function bodyJoints(pose: RoomPose, gait: Gait = STANDING, sat: number = seatShare(pose)): BodyJoints {
  // The eye with the head held level: the body hangs from there, and the
  // head leaning forward to look down (`headLean`) does not take it along.
  const [fx, fz] = horizontalAt(pose.yaw / (Math.PI / 180));
  const eye: Vec3 = [fx * pose.forward, pose.eyeHeight, fz * pose.forward];
  const forward: Vec3 = [fx, 0, fz];
  const right: Vec3 = [-fz, 0, fx];
  const inBody = (offset: [number, number]): Vec3 => add(scale(right, offset[0]), scale(forward, offset[1]));

  // The head goes where the eye goes, leaning included.
  const head = add(placeCamera(pose).position, add(scale(forward, -0.06), [0, 0.02, 0]));
  const neck = add(eye, add(scale(forward, -NECK_BACK), [0, -NECK_DROP, 0]));
  const hips = add(neck, [0, -TORSO, 0]);
  const shoulders: [Vec3, Vec3] = [-1, 1].map((side) => add(neck, add(scale(right, side * SHOULDER_HALF), [0, -0.04, 0]))) as [Vec3, Vec3];

  const steps = [footStep(gait, 0), footStep(gait, 1)];
  const walking = Math.min(1, gait.amount * 1.5);

  // The arms swing against the legs: the left hand back as the left foot goes forward.
  const hanging = shoulders.map((s, i) =>
    add(add(s, add(scale(forward, 0.04), [0, -ARM, 0])), inBody([-steps[i].offset[0] * ARM_SWING * 0.3, -steps[i].offset[1] * ARM_SWING]))
  ) as [Vec3, Vec3];
  const resting = deskHands();
  const hands = hanging.map((h, i) => mix(h, resting[i], sat)) as [Vec3, Vec3];
  const elbows = shoulders.map((s, i) => add(mix(s, hands[i], 0.5), [0, -0.06, 0])) as [Vec3, Vec3];

  const ahead = FEET_FORWARD + (FEET_FORWARD_WALKING - FEET_FORWARD) * walking;
  const legs = [-1, 1].map((side, i) => {
    const hip = add(hips, scale(right, side * HIP_HALF));
    const standing = add([hip[0], steps[i].lift, hip[2]], inBody([steps[i].offset[0], ahead + steps[i].offset[1]]));
    const sitting = add([hip[0], 0, hip[2]], scale(forward, SEATED_FEET_FORWARD));
    return bendLeg(hip, mix(standing, sitting, sat), forward);
  });
  const knees = legs.map((l) => l.knee) as [Vec3, Vec3];
  const feet = legs.map((l) => l.foot) as [Vec3, Vec3];

  return { yaw: pose.yaw, head, neck, hips, shoulders, elbows, hands, knees, feet };
}

/** Where a seated body's hips come to rest: on the chair's seat. */
export const SEATED_HIPS_Y = SEATED_EYE_HEIGHT - NECK_DROP - TORSO;
export { CHAIR_SEAT_TOP };
