import { CHAIR_SEAT_TOP, DESK_HANDS, PIECES, SEATED_EYE_HEIGHT, horizontalAt, pieceToWorld } from "./layout";
import { floorSpot, placeCamera, type RoomPose } from "../camera/roomCamera";
import { STANDING, footStep, ARM_SWING, type Gait } from "./gait";
import { seatFacing, seatOnLine, seatShare, seatedShare } from "./seat";
import { macHands } from "./deskViews";
import { wrapAngle } from "../camera/cameraMotion";
import { FIGURE, NECK_BACK, NECK_DROP, SEATED_LEAN, TORSO, seatedHipsFromEye } from "./figure";

export { placeCamera, seatedShare, NECK_BACK, NECK_DROP, TORSO };

/**
 * The reader's own body. The reader is the room's owner, looking out of
 * their own eyes (docs/room-migration.md, "自分自身"), so the body stands
 * wherever the camera is, turned the way it is turned: looking down shows
 * it, the security camera and the curve mirror show it whole, and sitting
 * down at the PC puts its hands on the keyboard and the mouse.
 *
 * It walks wherever the camera travels (`room/gait.ts` works the steps out
 * from the eye's movement) and sits down on the chair at the PC
 * (`room/seat.ts`), leaning in over the desk. The legs and the arms are two
 * bones each, bent at the knee and the elbow to reach wherever the foot and
 * the hand have to be.
 *
 * Its proportions are the character sheet's (`room/figure.ts`, 168 cm).
 * What is not negotiable is where it is: the head is round the eye, the
 * body hangs below and a little behind it, and nothing of it may come into
 * the reader's own view looking ahead (tested).
 */

type Vec3 = [number, number, number];

/** How far in front of the hips the feet stand — a little, as someone standing at ease does, so they show looking down. */
export const FEET_FORWARD = 0.15;
/** Walking, the feet pass straight under the hips: a stride's reach either side. */
const FEET_FORWARD_WALKING = 0;
/**
 * The shoulder joints, at the T-shirt's shoulders, and how far under the
 * base of the neck. The shirt is boxy and loose: any further in and the
 * arms hung inside it (2026-10-02).
 */
export const SHOULDER_HALF = FIGURE.shoulderHalf + 0.005;
const SHOULDER_DROP = FIGURE.neckBase - FIGURE.shoulder;
/** Half the T-shirt's depth front to back (it is loose), and half its width. */
export const TORSO_DEPTH = 0.1;
export const TORSO_HALF_WIDTH = FIGURE.shoulderHalf;
export const HIP_HALF = FIGURE.hipHalf;
/**
 * The arm's two bones, shoulder to elbow and elbow to the middle of the
 * hand. The sheet only shows the hands in the pockets; this is long enough
 * for a seated reader to reach the keyboard (`DESK_HANDS`) leaning in.
 */
export const UPPER_ARM = 0.32;
export const FOREARM = 0.34;
/** Sat typing, the shoulders come forward this far. */
const SHOULDERS_FORWARD_SEATED = 0.06;
/**
 * The leg's two bones. Together a hair longer than the standing hips are
 * high (0.77 m), so a standing knee is soft rather than locked; the ends of
 * a step reach the floor because the walk dips the body (`stepBob`).
 */
export const THIGH = 0.37;
export const SHIN = 0.42;
/** Sat, the feet rest a little in front of the knees: the shins nearly upright, the knees past the cushion's edge. */
const SEATED_FEET_FORWARD = THIGH + 0.04;
/** The head's middle: behind the eye and a little above it (the sheet's skull runs from the chin, 10 cm under the eye, to about 15 cm over it). */
export const HEAD_BEHIND_EYE = 0.085;
export const HEAD_OVER_EYE = 0.025;

export type BodyJoints = {
  /**
   * The way the body faces: the camera's yaw, never its pitch — the body does
   * not tilt to look up or down. Sat, the seat's way: looking round at the
   * desk's other screens turns the head, not the body (`headYaw`).
   */
  yaw: number;
  /** The way the head faces: the camera's yaw. */
  headYaw: number;
  /** How far the body leans forward at the hips, in radians (sitting at the PC). */
  lean: number;
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

/**
 * How far over the floor from the body a hand reaches: the arm, and a lean
 * in over the desk (**仮**, 14 cm). The desk's machines are used only within
 * it (2026-10-23, the user: 「一定距離に近づかないと操作できないように（手の
 * 届く範囲）」): sitting at the PC its mouse is 0.73 m away and the HHKB's
 * far keys 0.74 m; from the room's middle the desk is 2 m off.
 */
export const REACH = UPPER_ARM + FOREARM + 0.14;

/** Whether a point in the room (world) is within the reader's reach, standing or sat where the held pose puts them. */
export function withinReach(pose: Pick<RoomPose, "x" | "z" | "yaw" | "forward">, point: readonly number[]): boolean {
  const [x, z] = floorSpot(pose);
  return Math.hypot(point[0] - x, point[2] - z) <= REACH;
}

/**
 * Where the hands rest at the desk: the left on the keyboard, the right on
 * the mouse — which slides (`mouse`, its offset from rest in the desk's
 * frame, `deskPointer`), and the hand goes with it.
 */
export function deskHands(mouse: readonly [number, number] = [0, 0]): [Vec3, Vec3] {
  const [x, y, z] = DESK_HANDS[1];
  return [pieceToWorld(PIECES.desk, DESK_HANDS[0]), pieceToWorld(PIECES.desk, [x + mouse[0], y, z + mouse[1]])];
}

/**
 * A limb of two bones reaching from `root` for `target`, the middle joint
 * bending towards `pole`. Out of reach, the end stops short along the same
 * line — a foot lifts off the floor rather than the leg stretching.
 */
export function bendLimb(root: Vec3, target: Vec3, pole: Vec3, first: number, second: number): { joint: Vec3; end: Vec3 } {
  const d = sub(target, root);
  const distance = Math.hypot(d[0], d[1], d[2]);
  const reach = first + second - 1e-6;
  const length = Math.max(Math.abs(first - second) + 1e-6, Math.min(reach, distance));
  const dir = scale(d, 1 / distance);
  const end = distance <= reach ? target : add(root, scale(dir, length));
  // The joint: along the limb by `a`, then out to the side it bends by `h`.
  const a = (first * first - second * second + length * length) / (2 * length);
  const h = Math.sqrt(Math.max(0, first * first - a * a));
  const across = sub(pole, scale(dir, dot(pole, dir)));
  const acrossLength = Math.hypot(across[0], across[1], across[2]) || 1;
  return { joint: add(add(root, scale(dir, a)), scale(across, h / acrossLength)), end };
}

/** A leg: `bendLimb` with the leg's bones, as knee and foot. */
export function bendLeg(hip: Vec3, target: Vec3, pole: Vec3): { knee: Vec3; foot: Vec3 } {
  const { joint, end } = bendLimb(hip, target, pole, THIGH, SHIN);
  return { knee: joint, foot: end };
}

/**
 * Every joint of the body for a pose. `pose` is the pose as drawn (sway and
 * step included — the body carries the head); `gait` is the walk
 * (`room/gait.ts`); `sat` is how far through sitting down at the PC the
 * reader is, worked out from the held pose (`seatShare`); `along` how far
 * over from the PC's seat to the Mac's (`seatOnLine`), which turns the body
 * and moves the hands from the PC's keyboard and mouse to the Mac's;
 * `mouse` and `macMouse` where the two mice have slid.
 */
export function bodyJoints(
  pose: RoomPose,
  gait: Gait = STANDING,
  sat: number = seatShare(pose),
  mouse: readonly [number, number] = [0, 0],
  macMouse: readonly [number, number] = [0, 0],
  along: number = seatOnLine(pose)
): BodyJoints {
  // Sat, the body faces the seat's way, whichever screen the head is turned to.
  const yaw = pose.yaw + wrapAngle(seatFacing(along) - pose.yaw) * sat;
  // The eye with the head held level: the body hangs from there, and the
  // head leaning forward to look down (`headLean`) does not take it along.
  const [fx, fz] = horizontalAt(yaw / (Math.PI / 180));
  const [sx, sz] = floorSpot(pose);
  const eye: Vec3 = [sx, pose.eyeHeight, sz];
  const forward: Vec3 = [fx, 0, fz];
  const right: Vec3 = [-fz, 0, fx];
  const up: Vec3 = [0, 1, 0];
  const inBody = (offset: [number, number]): Vec3 => add(scale(right, offset[0]), scale(forward, offset[1]));

  // The head goes where the eye goes, leaning included.
  // Behind the eye the way the head faces, which turns on its own while sat.
  const [hx, hz] = horizontalAt(pose.yaw / (Math.PI / 180));
  const head = add(placeCamera(pose).position, add(scale([hx, 0, hz], -HEAD_BEHIND_EYE), [0, HEAD_OVER_EYE, 0]));
  const neck = add(eye, add(scale(forward, -NECK_BACK), [0, -NECK_DROP, 0]));
  // Sitting, the body leans in over the desk from the hips: the hips go back.
  const lean = SEATED_LEAN * sat;
  const hips = sub(neck, add(scale(up, TORSO * Math.cos(lean)), scale(forward, TORSO * Math.sin(lean))));
  const shoulders = [-1, 1].map((side) =>
    add(neck, add(add(scale(right, side * SHOULDER_HALF), [0, -SHOULDER_DROP, 0]), scale(forward, SHOULDERS_FORWARD_SEATED * sat)))
  ) as [Vec3, Vec3];

  const steps = [footStep(gait, 0), footStep(gait, 1)];
  const walking = Math.min(1, gait.amount * 1.5);

  // The arms hang, and swing against the legs: the left hand back as the
  // left foot goes forward. Sat, the hands go to the keyboard and the mouse.
  const hanging = shoulders.map((s, i) =>
    add(
      add(s, add(scale(forward, 0.04), [0, -(UPPER_ARM + FOREARM) * 0.97, 0])),
      inBody([-steps[i].offset[0] * ARM_SWING * 0.3, -steps[i].offset[1] * ARM_SWING])
    )
  ) as [Vec3, Vec3];
  const pc = deskHands(mouse);
  const mac = macHands(macMouse);
  const resting = [mix(pc[0], mac[0], along), mix(pc[1], mac[1], along)];
  const arms = shoulders.map((s, i) => {
    const side = i === 0 ? -1 : 1;
    // Elbows bend back and out, and down at the desk.
    const pole = add(add(scale(forward, -1), scale(right, side * 0.6)), [0, -0.5 - sat, 0]);
    return bendLimb(s, mix(hanging[i], resting[i], sat), pole, UPPER_ARM, FOREARM);
  });
  const elbows = arms.map((a) => a.joint) as [Vec3, Vec3];
  const hands = arms.map((a) => a.end) as [Vec3, Vec3];

  const ahead = FEET_FORWARD + (FEET_FORWARD_WALKING - FEET_FORWARD) * walking;
  const legs = [-1, 1].map((side, i) => {
    const hip = add(hips, scale(right, side * HIP_HALF));
    const standing = add([hip[0], steps[i].lift, hip[2]], inBody([steps[i].offset[0], ahead + steps[i].offset[1]]));
    const sitting = add([hip[0], 0, hip[2]], scale(forward, SEATED_FEET_FORWARD));
    return bendLeg(hip, mix(standing, sitting, sat), forward);
  });
  const knees = legs.map((l) => l.knee) as [Vec3, Vec3];
  const feet = legs.map((l) => l.foot) as [Vec3, Vec3];

  return { yaw, headYaw: pose.yaw, lean, head, neck, hips, shoulders, elbows, hands, knees, feet };
}

/** Where a seated body's hip joints come to rest: over the chair's cushion. */
export const SEATED_HIPS_Y = SEATED_EYE_HEIGHT - seatedHipsFromEye().down;
export { CHAIR_SEAT_TOP };
