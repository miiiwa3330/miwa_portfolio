import { describe, expect, it } from "vitest";
import { STOP_ORDER, standardView, subjectYaw, viewDirection, yawDelta, yawOf } from "./layout";
import { ROOM_TOUR, adjacentStop, buildRingTour, stopU } from "./tour";

const pitchOf = (d: readonly number[]) => Math.asin(d[1]) / (Math.PI / 180);

describe("ROOM_TOUR", () => {
  it("passes through every stop's standing view", () => {
    for (const stop of STOP_ORDER) {
      const d = ROOM_TOUR.direction(stopU(stop));
      const view = standardView(stop);
      expect(Math.abs(yawDelta(yawOf(d[0], d[2]), view.yaw))).toBeLessThan(1e-6);
      expect(pitchOf(d)).toBeCloseTo(view.pitch, 6);
    }
  });

  it("starts at the PC", () => {
    expect(stopU("desk")).toBe(0);
    const d = ROOM_TOUR.direction(0);
    expect(Math.abs(yawDelta(yawOf(d[0], d[2]), subjectYaw("desk")))).toBeLessThan(1e-6);
  });

  it("turns right, steadily, as u grows", () => {
    // One unit of u is one full turn, at a constant rate of yaw.
    let previous = yawOf(...([ROOM_TOUR.direction(0)[0], ROOM_TOUR.direction(0)[2]] as [number, number]));
    for (let i = 1; i <= 100; i++) {
      const d = ROOM_TOUR.direction(i / 100);
      const yaw = yawOf(d[0], d[2]);
      expect(yawDelta(previous, yaw)).toBeCloseTo(3.6, 6);
      previous = yaw;
    }
  });

  it("closes into a loop without a step at the seam", () => {
    const a = ROOM_TOUR.direction(0.9999);
    const b = ROOM_TOUR.direction(0);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1e-3);
  });

  it("keeps the gaze level-ish between stops", () => {
    // The spline must not swing to the ceiling or the floor between two stops
    // that are both near eye level.
    const pitches = STOP_ORDER.map((s) => standardView(s).pitch);
    const lo = Math.min(...pitches) - 5;
    const hi = Math.max(...pitches) + 5;
    for (let i = 0; i < 360; i++) {
      const p = pitchOf(ROOM_TOUR.direction(i / 360));
      expect(p).toBeGreaterThan(lo);
      expect(p).toBeLessThan(hi);
    }
  });

  it("finds where on the turn any gaze lies, by yaw", () => {
    for (const u of [0, 0.13, 0.5, 0.77]) {
      const d = ROOM_TOUR.direction(u);
      expect(ROOM_TOUR.nearestU(d)).toBeCloseTo(u, 6);
      // Looking up or down at the same yaw is the same place on the tour.
      const tilted = viewDirection(yawOf(d[0], d[2]), 50);
      expect(ROOM_TOUR.nearestU(tilted)).toBeCloseTo(u, 6);
    }
  });

  it("measures its length as one turn, so a turn rate divides into du", () => {
    expect(ROOM_TOUR.length).toBeCloseTo(2 * Math.PI, 12);
  });
});

describe("adjacentStop", () => {
  it("walks the order both ways and wraps", () => {
    expect(adjacentStop("desk", 1)).toBe(STOP_ORDER[1]);
    expect(adjacentStop("desk", -1)).toBe(STOP_ORDER[STOP_ORDER.length - 1]);
    expect(adjacentStop(STOP_ORDER[STOP_ORDER.length - 1], 1)).toBe("desk");
  });
});

describe("buildRingTour", () => {
  it("visits anchors in turning-right order whatever order they are given in", () => {
    const tour = buildRingTour([
      { yaw: 10, pitch: 0 },
      { yaw: 300, pitch: 0 },
      { yaw: 120, pitch: 0 },
    ]);
    expect(tour.order).toEqual([0, 2, 1]);
    expect(tour.anchorU(2)).toBeCloseTo(110 / 360, 12);
    expect(tour.anchorU(1)).toBeCloseTo(290 / 360, 12);
  });
});
