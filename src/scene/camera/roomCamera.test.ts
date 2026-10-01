import { describe, expect, it } from "vitest";
import {
  advanceRoomFlight,
  beginRoomFlight,
  blendRoomPose,
  placeCamera,
  poseFromView,
  projectionShiftPx,
  verticalFov,
  type RoomPose,
} from "./roomCamera";
import { MAX_FLIGHT_STEP } from "./cameraFlight";
import { EYE_HEIGHT, STANDARD_HFOV, standardView, subjectPoint, zoomView } from "../room/layout";

const DEG = Math.PI / 180;

const pose = (over: Partial<RoomPose> = {}): RoomPose => ({
  yaw: 0,
  pitch: 0,
  forward: 0,
  eyeHeight: EYE_HEIGHT,
  hfov: STANDARD_HFOV,
  share: 0,
  ...over,
});

describe("placeCamera", () => {
  it("stands at the centre of the room at eye height when not stepped out", () => {
    const { position } = placeCamera(pose({ yaw: 1.3 }));
    expect(position[0]).toBeCloseTo(0, 12);
    expect(position[2]).toBeCloseTo(0, 12);
    expect(position[1]).toBe(EYE_HEIGHT);
  });

  it("looks straight at each stop's subject from the standing view", () => {
    for (const stop of ["desk", "about", "products", "skills", "experience", "contact"] as const) {
      const { position, target } = placeCamera(poseFromView(standardView(stop), STANDARD_HFOV, 0));
      const subject = subjectPoint(stop);
      const ray = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
      const toSubject = [subject[0] - position[0], subject[1] - position[1], subject[2] - position[2]];
      const cos =
        (ray[0] * toSubject[0] + ray[1] * toSubject[1] + ray[2] * toSubject[2]) /
        (Math.hypot(...ray) * Math.hypot(...toSubject));
      expect(cos).toBeCloseTo(1, 9);
    }
  });

  it("steps out towards the subject for a zoom, still looking at it", () => {
    const view = zoomView("products");
    const { position, target } = placeCamera(poseFromView(view, STANDARD_HFOV, 0));
    expect(Math.hypot(position[0], position[2])).toBeCloseTo(view.forward, 9);
    const subject = subjectPoint("products");
    const ray = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
    const toSubject = [subject[0] - position[0], subject[1] - position[1], subject[2] - position[2]];
    const cos =
      (ray[0] * toSubject[0] + ray[1] * toSubject[1] + ray[2] * toSubject[2]) /
      (Math.hypot(...ray) * Math.hypot(...toSubject));
    expect(cos).toBeCloseTo(1, 9);
  });
});

describe("verticalFov", () => {
  it("keeps the horizontal field of view whatever the frame's shape", () => {
    for (const aspect of [16 / 9, 1, 390 / 844]) {
      const v = verticalFov(STANDARD_HFOV, aspect);
      const backToHorizontal = 2 * Math.atan(Math.tan((v * DEG) / 2) * aspect);
      expect(backToHorizontal / DEG).toBeCloseTo(STANDARD_HFOV, 9);
    }
  });

  it("is taller than the width on a portrait phone", () => {
    // Why the phone will need its own field of view (docs/room-migration.md).
    expect(verticalFov(STANDARD_HFOV, 390 / 844)).toBeGreaterThan(100);
  });
});

describe("projectionShiftPx", () => {
  it("moves the subject right of centre by share of the half-width", () => {
    // A shifted window of `width` px starting at `shift` sees the frame's
    // centre at (width/2 - shift); in ndc that is 1 - 2·(width/2 - shift)/width.
    const width = 1600;
    const share = 0.3;
    const shift = projectionShiftPx(share, width);
    const subjectPx = width / 2 - shift;
    const ndc = (subjectPx / width) * 2 - 1;
    expect(ndc).toBeCloseTo(share, 12);
  });

  it("does nothing with no card to clear", () => {
    expect(projectionShiftPx(0, 1600)).toBeCloseTo(0, 12);
  });
});

describe("blendRoomPose", () => {
  it("turns the short way round across ±π", () => {
    const from = pose({ yaw: 170 * DEG });
    const to = pose({ yaw: -170 * DEG });
    const mid = blendRoomPose(from, to, 0.5);
    // Half way the short way is 180°, not 0°.
    expect(Math.abs(Math.cos(mid.yaw) - -1)).toBeLessThan(1e-9);
  });

  it("arrives exactly at both ends", () => {
    const from = pose({ yaw: 0.2, pitch: -0.1, forward: 0, eyeHeight: 1.55, hfov: 67, share: 0.22 });
    const to = pose({ yaw: 1.1, pitch: 0.05, forward: 1.8, eyeHeight: 1.12, hfov: 67, share: 0.3 });
    expect(blendRoomPose(from, to, 0)).toEqual(from);
    const end = blendRoomPose(from, to, 1);
    for (const key of Object.keys(to) as (keyof RoomPose)[]) expect(end[key]).toBeCloseTo(to[key], 12);
  });
});

describe("advanceRoomFlight", () => {
  it("charges no time on its first frame", () => {
    const flight = beginRoomFlight(pose(), pose({ yaw: 1 }), 1, null);
    const first = advanceRoomFlight(flight, 1);
    expect(first.pose.yaw).toBe(0);
    expect(first.done).toBe(false);
  });

  it("never advances more than MAX_FLIGHT_STEP in one frame", () => {
    const flight = beginRoomFlight(pose(), pose({ yaw: 1 }), 1, null);
    advanceRoomFlight(flight, 0);
    advanceRoomFlight(flight, 5);
    expect(flight.elapsed).toBeCloseTo(MAX_FLIGHT_STEP, 12);
  });

  it("hands back the free view's angles on the landing frame, and only then", () => {
    const land = { yaw: 0.7, pitch: -0.05 };
    const flight = beginRoomFlight(pose(), pose({ yaw: 0.7, pitch: -0.05 }), 0.2, land);
    expect(advanceRoomFlight(flight, 0).landed).toBeNull();
    expect(advanceRoomFlight(flight, 0.1).landed).toBeNull();
    const last = advanceRoomFlight(flight, 0.1);
    expect(last.done).toBe(true);
    expect(last.landed).toEqual(land);
  });

  it("lands nowhere for a flight that parks the camera", () => {
    const flight = beginRoomFlight(pose(), pose({ forward: 1 }), 0.1, null);
    advanceRoomFlight(flight, 0);
    const last = advanceRoomFlight(flight, 0.1);
    expect(last.done).toBe(true);
    expect(last.landed).toBeNull();
  });
});
