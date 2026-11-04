import { describe, expect, it } from "vitest";
import {
  DIGITS,
  HAND,
  MAC_MOUSE_GRIP,
  MOUSE_GRIP,
  RELAXED,
  TYPING,
  digitJoints,
  gripFor,
  handBasis,
  handJoints,
  handToWorld,
} from "./hand";
import { FOREARM, bodyJoints, type BodyJoints } from "./self";
import { STATURE } from "./figure";
import { STANDING } from "./gait";
import { DESK_TOP_Y, EYE_HEIGHT, KEYBOARD, MAC_MOUSE, MOUSE, PIECES, STANDARD_HFOV, pieceToWorld, zoomView } from "./layout";
import { capTop, capTopHeight, keyboardKeys, plateToBoard } from "./keyboard";
import { fAt, outlineAt, profileAt } from "./mouse";
import { M0100 } from "./macMouse";
import { deskViewPose } from "./deskViews";
import { poseFromView, type RoomPose } from "../camera/roomCamera";

type Vec3 = [number, number, number];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const framing = { hfov: STANDARD_HFOV, share: 0, lift: 0 };

/** A point in the room, in the desk's frame (its +Z towards the room's middle). */
const origin = pieceToWorld(PIECES.desk, [0, 0, 0]);
const deskX = pieceToWorld(PIECES.desk, [1, 0, 0]);
const deskZ = pieceToWorld(PIECES.desk, [0, 0, 1]);
function toDesk(p: Vec3): Vec3 {
  const d = [p[0] - origin[0], p[2] - origin[2]];
  return [d[0] * (deskX[0] - origin[0]) + d[1] * (deskX[2] - origin[2]), p[1], d[0] * (deskZ[0] - origin[0]) + d[1] * (deskZ[2] - origin[2])];
}

/**
 * How high the desk's things stand at a point (desk frame): the HHKB's key
 * tops (each cap's own top, dish and lean), the EX-G's top, or the desk.
 */
const keys = keyboardKeys();
function standsAt(x: number, z: number): number {
  let top = DESK_TOP_Y;
  const bx = x - KEYBOARD.x;
  const bz = z - KEYBOARD.z;
  for (const key of keys) {
    const cap = capTop(key);
    const u = (bx - key.x) / cap.width;
    const v = (bz - (key.z + cap.dz)) / cap.depth;
    if (Math.abs(u) <= 0.5 && Math.abs(v) <= 0.5) {
      top = Math.max(top, DESK_TOP_Y + plateToBoard([key.x + u * cap.width, capTopHeight(key, u, v), key.z + cap.dz + v * cap.depth])[1]);
    }
  }
  const f = fAt(z - MOUSE.z);
  if (f >= 0 && f <= 1) {
    const { left, right } = outlineAt(f);
    if (x - MOUSE.x >= left && x - MOUSE.x <= right) top = Math.max(top, MOUSE.y + profileAt(f).top);
  }
  return top;
}
/** The highest thing under a ball of radius `r`: a knuckle between two caps still rests on them. */
function under(x: number, z: number, r: number): number {
  let top = -Infinity;
  for (const dx of [-r, 0, r]) for (const dz of [-r, 0, r]) top = Math.max(top, standsAt(x + dx, z + dz));
  return top;
}

const right = (j: BodyJoints): Vec3 => [Math.cos(j.yaw), 0, Math.sin(j.yaw)];
function basisOf(j: BodyJoints, i: 0 | 1) {
  const side = i === 0 ? -1 : 1;
  const r = right(j);
  const grip = gripFor(side, j.sat, j.along);
  return { grip, basis: handBasis(j.elbows[i], j.hands[i], [r[0] * side, 0, r[2] * side], side, grip) };
}

/** How far each joint's ball stands over what is under it, in metres: `[digit][joint]`, the thumb last. */
function clearances(j: BodyJoints, i: 0 | 1, standing: (x: number, z: number, r: number) => number = under): number[][] {
  const { grip, basis } = basisOf(j, i);
  return handJoints(grip).map((joints, d) =>
    joints.map((p, n) => {
      const r = DIGITS[d].radii[Math.min(n, 2)];
      const w = toDesk(handToWorld(basis, p));
      return w[1] - r - standing(w[0], w[2], r);
    })
  );
}

/** The lowest the palm's underside comes over what is under it. */
function palmClearance(j: BodyJoints, i: 0 | 1): number {
  const { basis } = basisOf(j, i);
  let least = Infinity;
  for (let a = 0; a <= 1.0001; a += 0.1) {
    for (let c = -0.45; c <= 0.451; c += 0.15) {
      const w = toDesk(handToWorld(basis, [-HAND.thickness / 2, a * HAND.palm, c * HAND.breadth]));
      least = Math.min(least, w[1] - under(w[0], w[2], 0.004));
    }
  }
  return least;
}

const atPC = bodyJoints(poseFromView(zoomView("desk"), framing));
const atMac = bodyJoints({ ...deskViewPose("mac"), ...framing });
const standingPose: RoomPose = { x: 0, z: 0, yaw: 0.4, pitch: 0, forward: 0, eyeHeight: EYE_HEIGHT, ...framing };
const standing = bodyJoints(standingPose, STANDING, 0);

describe("the hand's size", () => {
  it("is the usual shares of the figure's 168 cm: 0.108 of it long, 0.048 across", () => {
    expect(HAND.length).toBeCloseTo(0.108 * STATURE, 9);
    expect(HAND.breadth).toBeCloseTo(0.048 * STATURE, 9);
    // The middle finger is what the palm leaves.
    const middle = digitJoints(DIGITS[1], [0, 0, 0]);
    expect(middle[3][1] - middle[0][1]).toBeCloseTo(HAND.length - HAND.palm, 2);
  });

  it("leaves a forearm, elbow to wrist, of the usual 0.155 of the height (26 cm)", () => {
    expect(FOREARM - HAND.wristBack).toBeGreaterThan(0.25);
    expect(FOREARM - HAND.wristBack).toBeLessThan(0.27);
  });
});

describe("a digit's joints", () => {
  it("keep every bone's length, however far it curls", () => {
    for (const digit of DIGITS) {
      for (const curl of [
        [0, 0, 0],
        [0.4, 0.9, 0.5],
        [1.2, 1.5, 1],
      ]) {
        const joints = digitJoints(digit, curl);
        digit.lengths.forEach((length, k) => {
          const a = joints[k];
          const b = joints[k + 1];
          expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeCloseTo(length, 12);
        });
      }
    }
  });
});

describe("how the hand is held", () => {
  it("takes the grips as far as the body is sat, and the Mac's mouse as far over to its seat", () => {
    expect(gripFor(-1, 0)).toEqual(RELAXED);
    expect(gripFor(1, 0, 1)).toEqual(RELAXED);
    expect(gripFor(-1, 1)).toEqual(TYPING);
    expect(gripFor(-1, 1, 1)).toEqual(TYPING);
    expect(gripFor(1, 1)).toEqual(MOUSE_GRIP);
    expect(gripFor(1, 1, 1)).toEqual(MAC_MOUSE_GRIP);
  });

  it("turns the back of the hand up on the keys and the mice, and out with the palm to the thigh hanging", () => {
    for (const j of [atPC, atMac]) for (const i of [0, 1] as const) expect(basisOf(j, i).basis.x[1], `${i}`).toBeGreaterThan(0.8);
    for (const i of [0, 1] as const) {
      const out = right(standing).map((v) => v * (i === 0 ? -1 : 1)) as Vec3;
      expect(dot(basisOf(standing, i).basis.x, out)).toBeGreaterThan(0.9);
    }
  });

  it("puts each thumb on the body's side of its hand — the left hand is the right one mirrored", () => {
    for (const j of [atPC, standing]) {
      for (const i of [0, 1] as const) {
        const inward = right(j).map((v) => v * (i === 0 ? 1 : -1)) as Vec3;
        // At the desk the thumb points in; hanging it points forward, a little in.
        expect(dot(basisOf(j, i).basis.z, inward) + (j === standing ? 1 : 0), `${i}`).toBeGreaterThan(0.5);
      }
    }
  });

  it("lays the hands level on the desk, whichever way the forearm slopes", () => {
    for (const j of [atPC, atMac]) {
      for (const i of [0, 1] as const) {
        // Unbend the wrist by the grip's lift: along the hand is then level.
        const { grip, basis } = basisOf(j, i);
        const unbent = basis.y[1] * Math.cos(grip.lift) - basis.x[1] * Math.sin(grip.lift);
        expect(unbent).toBeCloseTo(0, 9);
      }
    }
  });
});

describe("the hands at the PC", () => {
  it("rest the left hand's fingertips on the HHKB's keys: on them, not in them", () => {
    const c = clearances(atPC, 0);
    c.forEach((joints, d) => joints.forEach((gap, n) => expect(gap, `digit ${d}, joint ${n}`).toBeGreaterThan(-0.0005)));
    for (const joints of c.slice(0, 4)) expect(joints[3]).toBeLessThan(0.012);
  });

  it("rest the right hand's index and middle fingers on the EX-G's buttons, nothing of it in the mouse", () => {
    const c = clearances(atPC, 1);
    c.forEach((joints, d) => joints.forEach((gap, n) => expect(gap, `digit ${d}, joint ${n}`).toBeGreaterThan(-0.0005)));
    const { grip, basis } = basisOf(atPC, 1);
    const joints = handJoints(grip);
    for (const d of [0, 1]) {
      expect(c[d][3]).toBeLessThan(0.004);
      const tip = toDesk(handToWorld(basis, joints[d][3]));
      const f = fAt(tip[2] - MOUSE.z);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThan(1);
    }
  });

  it("keep both palms clear of the keys and the mouse", () => {
    for (const i of [0, 1] as const) expect(palmClearance(atPC, i), `${i}`).toBeGreaterThan(0.005);
  });
});

describe("the hands at the Mac", () => {
  it("keep the right hand out of the M0100, taken as a box as tall as its top", () => {
    const box = (x: number, z: number) =>
      Math.abs(x - MAC_MOUSE.x) < M0100.width / 2 && Math.abs(z - MAC_MOUSE.z) < M0100.length / 2 ? DESK_TOP_Y + M0100.height : DESK_TOP_Y;
    clearances(atMac, 1, box).forEach((joints, d) => joints.forEach((gap, n) => expect(gap, `digit ${d}, joint ${n}`).toBeGreaterThan(0)));
  });
});
