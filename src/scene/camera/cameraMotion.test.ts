import { describe, expect, it } from "vitest";
import {
  MAX_PITCH,
  MOUSE_LOOK_SENSITIVITY,
  ORBIT_DAMP_LAMBDA,
  SWAY_BREATH_M,
  SWAY_PITCH_DEG,
  SWAY_YAW_DEG,
  dampFraction,
  easeInOutCubic,
  idleSway,
  mouseLook,
  wrapAngle,
} from "./cameraMotion";
import { viewDirection } from "../room/layout";

describe("wrapAngle", () => {
  it("leaves angles already inside (-π, π] alone", () => {
    for (const a of [-3, -1, 0, 1, 3]) expect(wrapAngle(a)).toBeCloseTo(a);
  });

  it("folds multiples of a full turn back to the same physical angle", () => {
    for (const turns of [1, 2, 5, -1, -3]) {
      expect(wrapAngle(0.4 + turns * Math.PI * 2)).toBeCloseTo(0.4);
    }
  });

  it("always returns a value within one half-turn", () => {
    // This is the property that keeps damp() taking the short way round
    // instead of unwinding many turns — the old rotation runaway.
    for (const a of [-100, -12.5, -7, 7, 12.5, 100, 1000]) {
      expect(Math.abs(wrapAngle(a))).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});

describe("dampFraction", () => {
  it("closes nothing in no time, and never the whole gap in one frame", () => {
    expect(dampFraction(0)).toBe(0);
    expect(dampFraction(-1)).toBe(0);
    for (const dt of [1 / 60, 0.1, 1, 5]) {
      expect(dampFraction(dt)).toBeGreaterThan(0);
      expect(dampFraction(dt)).toBeLessThan(1);
    }
  });

  it("closes half the gap in ln2/λ seconds, whatever the frame rate", () => {
    // Two half-frames close the same as one whole frame: the damp is frame-rate independent.
    const half = Math.log(2) / ORBIT_DAMP_LAMBDA;
    expect(dampFraction(half)).toBeCloseTo(0.5, 12);
    const step = dampFraction(half / 2);
    expect(1 - (1 - step) * (1 - step)).toBeCloseTo(0.5, 12);
  });
});

describe("idleSway", () => {
  const DEG = Math.PI / 180;
  const samples = Array.from({ length: 4000 }, (_, i) => idleSway(i * 0.05));

  it("stays within its small amplitudes", () => {
    for (const s of samples) {
      expect(Math.abs(s.yaw)).toBeLessThanOrEqual(SWAY_YAW_DEG * DEG + 1e-12);
      expect(Math.abs(s.pitch)).toBeLessThanOrEqual(SWAY_PITCH_DEG * DEG + 1e-12);
      expect(Math.abs(s.height)).toBeLessThanOrEqual(SWAY_BREATH_M + 1e-12);
    }
    // A sway, not a look round: well under a degree either way.
    expect(SWAY_YAW_DEG).toBeLessThan(1);
    expect(SWAY_PITCH_DEG).toBeLessThan(1);
  });

  it("actually moves, using most of its range over a few breaths", () => {
    const yaws = samples.map((s) => s.yaw);
    expect(Math.max(...yaws) - Math.min(...yaws)).toBeGreaterThan(SWAY_YAW_DEG * DEG);
    const heights = samples.map((s) => s.height);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(SWAY_BREATH_M);
  });

  it("is slow and smooth: no jump between frames at 60fps", () => {
    for (let i = 0; i < 600; i++) {
      const a = idleSway(i / 60);
      const b = idleSway((i + 1) / 60);
      expect(Math.abs(b.yaw - a.yaw)).toBeLessThan(0.02 * DEG);
      expect(Math.abs(b.pitch - a.pitch)).toBeLessThan(0.02 * DEG);
    }
  });

  it("does not drift: it averages out to looking where the camera is turned", () => {
    const mean = (f: (s: { yaw: number; pitch: number }) => number) => samples.reduce((sum, s) => sum + f(s), 0) / samples.length;
    expect(Math.abs(mean((s) => s.yaw))).toBeLessThan(0.1 * SWAY_YAW_DEG * DEG);
    expect(Math.abs(mean((s) => s.pitch))).toBeLessThan(0.1 * SWAY_PITCH_DEG * DEG);
  });
});

describe("easeInOutCubic", () => {
  it("starts and ends exactly where the flight does", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("is half way through its travel at half time", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 12);
  });

  // The property the whole curve exists for. The detail sheet takes roughly
  // 0.3s to clear the screen, so on the 1.2s flight home that is the first
  // quarter of the flight: an ease-out (which is what camera-controls' own
  // damping gives) would have spent well over half its travel by then, leaving
  // a snap for the part anyone can actually see.
  it("holds most of the travel back past the sheet's exit", () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(0.1);
  });

  it("never goes backwards", () => {
    let previous = -1;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const value = easeInOutCubic(Math.min(1, t));
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("is symmetrical about the midpoint", () => {
    for (const t of [0.1, 0.23, 0.4]) {
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 12);
    }
  });
});

describe("mouseLook", () => {
  const DEG = Math.PI / 180;
  /** Which way a turn went, seen from above: negative is clockwise, i.e. to the right (looking down -Z, right is +X). */
  const turnedRight = (before: { yaw: number; pitch: number }, after: { yaw: number; pitch: number }) => {
    const a = viewDirection(before.yaw / DEG, 0);
    const b = viewDirection(after.yaw / DEG, 0);
    return a[2] * b[0] - a[0] * b[2] < 0;
  };

  it("turns the reader right when the mouse moves right, the way a first-person game aims", () => {
    for (const yaw of [0, 1, -2.5]) {
      const before = { yaw, pitch: 0 };
      expect(turnedRight(before, mouseLook(yaw, 0, 40, 0))).toBe(true);
      expect(turnedRight(before, mouseLook(yaw, 0, -40, 0))).toBe(false);
    }
  });

  it("looks up when the mouse moves up (a negative movementY)", () => {
    const up = mouseLook(0, 0, 0, -50);
    expect(viewDirection(0, up.pitch / DEG)[1]).toBeGreaterThan(0);
    expect(mouseLook(0, 0, 0, 50).pitch).toBeLessThan(0);
  });

  it("turns by the sensitivity per px, on both axes", () => {
    const next = mouseLook(0.3, 0.1, 25, -10);
    expect(next.yaw).toBeCloseTo(0.3 + 25 * MOUSE_LOOK_SENSITIVITY, 12);
    expect(next.pitch).toBeCloseTo(0.1 + 10 * MOUSE_LOOK_SENSITIVITY, 12);
  });

  it("stops the head at the pitch limit, and lets it come straight back", () => {
    expect(mouseLook(0, 0, 0, -1e5).pitch).toBe(MAX_PITCH);
    expect(mouseLook(0, 0, 0, 1e5).pitch).toBe(-MAX_PITCH);
    // No pitch stored beyond the limit to unwind first.
    expect(mouseLook(0, MAX_PITCH, 0, 10).pitch).toBeLessThan(MAX_PITCH);
  });
});
