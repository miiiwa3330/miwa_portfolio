import { describe, expect, it } from "vitest";
import { CHAIR_SEAT_SPAN, chairPlacement, seatShare, standForward } from "./seat";
import { CHAIR_BACK_BEHIND_EYE, PIECES, STANDARD_HFOV, STOP_KEYS, chairBackZ, horizontalAt, pieceCentreDistance, standardView, zoomView } from "./layout";
import { poseFromView, type RoomPose } from "../camera/roomCamera";
import { planRoomMove } from "../camera/walkFlight";
import { bodyJoints } from "./self";
import { STANDING, advanceGait } from "./gait";

const framing = { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 };
const desk = poseFromView(zoomView("desk"), framing);
const centre = poseFromView(standardView("desk"), framing);
const deskDistance = pieceCentreDistance(PIECES.desk);

/** A world point in the desk's frame (+Z towards the centre); the desk stands at yaw 0, world -Z. */
const inDesk = (p: readonly number[]): [number, number] => [p[0], p[2] + deskDistance];

/** How far inside the chair's seat a point over the floor is (positive inside), in metres. */
function insideSeat(chair: { x: number; z: number; yaw: number }, point: [number, number]): number {
  const dx = point[0] - chair.x;
  const dz = point[1] - chair.z;
  // Into the chair's own frame: undo its turn (three.js's, anticlockwise from above).
  const c = Math.cos(chair.yaw);
  const s = Math.sin(chair.yaw);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  return Math.min(CHAIR_SEAT_SPAN.halfWidth - Math.abs(lx), -lz - CHAIR_SEAT_SPAN.from, CHAIR_SEAT_SPAN.to + lz);
}

describe("seatShare", () => {
  it("is sat at the PC's zoom and standing at the centre", () => {
    expect(seatShare(desk)).toBe(1);
    expect(seatShare(centre)).toBe(0);
  });

  it("is never sitting at any other area's zoom, however low it brings the eye", () => {
    for (const stop of STOP_KEYS) {
      if (stop === "desk") continue;
      expect(seatShare(poseFromView(zoomView(stop), framing))).toBe(0);
    }
    // The hologram's zoom lowers the eye by 10 cm, and stands near the desk.
    expect(zoomView("about").eyeHeight).toBeLessThan(1.5);
  });
});

describe("the chair", () => {
  it("is under the reader sat at the PC, its back just behind the eye", () => {
    const chair = chairPlacement(desk);
    expect(chair.z).toBeCloseTo(chairBackZ(), 12);
    expect(chair.yaw).toBe(0);
    // The eye, in the desk's frame, sits CHAIR_BACK_BEHIND_EYE in front of the back.
    expect(chair.z - (deskDistance - desk.forward)).toBeCloseTo(CHAIR_BACK_BEHIND_EYE, 12);
  });

  it("stands clear of the way from the centre to the place to sit", () => {
    const chair = chairPlacement(centre);
    // Anything on the line out to the desk, a body's half-width either side.
    for (let along = 0; along <= standForward(); along += 0.05) {
      for (const x of [-0.2, 0, 0.2]) {
        expect(insideSeat(chair, [x, deskDistance - along])).toBeLessThan(0);
      }
    }
  });

  for (const [name, from, to] of [
    ["walking in and sitting down", centre, desk],
    ["getting up and walking away", desk, centre],
  ] as const) {
    it(`never runs into the reader's legs, ${name}`, () => {
      const move = planRoomMove(from, to, 1.1);
      let worst = -Infinity;
      // Stepping as the camera does (Scene's `applyPose`), so the feet are where the walk puts them.
      let gait = STANDING;
      for (let t = 0; t <= move.duration + 1; t += 1 / 120) {
        const pose = move.at(t);
        const sat = seatShare(pose);
        const [hx, hz] = horizontalAt(pose.yaw / (Math.PI / 180));
        gait = advanceGait(gait, hx * pose.forward, hz * pose.forward, pose.yaw, 1 / 120, sat);
        const chair = chairPlacement(pose);
        const j = bodyJoints(pose, gait, sat);
        // The lower legs: the feet, and down the shins below the seat.
        for (const i of [0, 1]) {
          for (const k of [0, 0.5, 1]) {
            const p = j.feet[i].map((f, n) => f + (j.knees[i][n] - f) * k);
            if (p[1] < 0.45) worst = Math.max(worst, insideSeat(chair, inDesk(p)));
          }
        }
      }
      // Measured 5 mm walking in and 3 mm getting up (2026-10-02), where a calf brushes the seat's edge.
      expect(worst).toBeLessThan(0.01);
    });
  }

  it("moves only while the reader is near: walking about the room elsewhere leaves it where it was", () => {
    const parked = chairPlacement(centre);
    for (const stop of STOP_KEYS) {
      if (stop === "desk" || stop === "about") continue;
      const pose: RoomPose = poseFromView(zoomView(stop), framing);
      expect(chairPlacement(pose)).toEqual(parked);
    }
  });
});
