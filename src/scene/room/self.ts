import {
  CHAIR_SEAT_TOP,
  EYE_HEIGHT,
  HAND_Y,
  KEYBOARD,
  MOUSE,
  PIECES,
  SEATED_EYE_HEIGHT,
  horizontalAt,
  pieceToWorld,
} from "./layout";
import { placeCamera, type RoomPose } from "../camera/roomCamera";

export { placeCamera };

/**
 * The reader's own body. The reader is the room's owner, looking out of
 * their own eyes (docs/room-migration.md, "自分自身"), so the body stands
 * wherever the camera is, turned the way it is turned: looking down shows
 * it, the security camera on the right-hand monitor films it, and sitting
 * down at the PC puts its hands on the keyboard and the mouse.
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
/** From the base of the neck to the hips. Chosen so the seated eye height puts the hips on the chair's seat. */
export const TORSO = 0.46;
export const SHOULDER_HALF = 0.19;
/** How far the chest stands in front of the torso's axis (its half-depth), and how wide it is either side. */
export const TORSO_DEPTH = 0.09;
export const TORSO_HALF_WIDTH = 0.15;
export const HIP_HALF = 0.1;
/** How far the hanging hands reach below the shoulders. */
const ARM = 0.62;
/** A seated thigh, out from the hips towards the desk. */
const THIGH = 0.45;

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

/** How far through sitting down the body is: 0 standing at eye height, 1 at the seated eye height. */
export function seatedShare(eyeHeight: number): number {
  return Math.max(0, Math.min(1, (EYE_HEIGHT - eyeHeight) / (EYE_HEIGHT - SEATED_EYE_HEIGHT)));
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Where the hands rest at the desk: the left on the keyboard, the right on the mouse. */
export function deskHands(): [Vec3, Vec3] {
  return [
    pieceToWorld(PIECES.desk, [KEYBOARD.x - 0.1, HAND_Y, KEYBOARD.z]),
    pieceToWorld(PIECES.desk, [MOUSE.x, HAND_Y, MOUSE.z]),
  ];
}

export function bodyJoints(pose: RoomPose): BodyJoints {
  // The eye with the head held level: the body hangs from there, and the
  // head leaning forward to look down (`headLean`) does not take it along.
  const [fx, fz] = horizontalAt(pose.yaw / (Math.PI / 180));
  const eye: Vec3 = [fx * pose.forward, pose.eyeHeight, fz * pose.forward];
  const forward: Vec3 = [fx, 0, fz];
  const right: Vec3 = [-fz, 0, fx];
  const seated = seatedShare(pose.eyeHeight);

  // The head goes where the eye goes, leaning included.
  const head = add(placeCamera(pose).position, add(scale(forward, -0.06), [0, 0.02, 0]));
  const neck = add(eye, add(scale(forward, -NECK_BACK), [0, -NECK_DROP, 0]));
  const hips = add(neck, [0, -TORSO, 0]);
  const shoulders: [Vec3, Vec3] = [-1, 1].map((side) => add(neck, add(scale(right, side * SHOULDER_HALF), [0, -0.04, 0]))) as [Vec3, Vec3];

  const hanging = shoulders.map((s) => add(s, add(scale(forward, 0.04), [0, -ARM, 0]))) as [Vec3, Vec3];
  const resting = deskHands();
  const hands = hanging.map((h, i) => mix(h, resting[i], seated)) as [Vec3, Vec3];
  const elbows = shoulders.map((s, i) => add(mix(s, hands[i], 0.5), [0, -0.06, 0])) as [Vec3, Vec3];

  const hipJoints = [-1, 1].map((side) => add(hips, scale(right, side * HIP_HALF)));
  const knees = hipJoints.map((h) =>
    mix(add(h, [0, -h[1] / 2, 0]), add(h, scale(forward, THIGH)), seated)
  ) as [Vec3, Vec3];
  const feet = hipJoints.map((h, i) => {
    const standing: Vec3 = [h[0] + forward[0] * FEET_FORWARD, 0, h[2] + forward[2] * FEET_FORWARD];
    const sitting: Vec3 = [knees[i][0] + forward[0] * 0.05, 0, knees[i][2] + forward[2] * 0.05];
    return mix(standing, sitting, seated);
  }) as [Vec3, Vec3];

  return { yaw: pose.yaw, head, neck, hips, shoulders, elbows, hands, knees, feet };
}

/** Where a seated body's hips come to rest: on the chair's seat. */
export const SEATED_HIPS_Y = SEATED_EYE_HEIGHT - NECK_DROP - TORSO;
export { CHAIR_SEAT_TOP };
