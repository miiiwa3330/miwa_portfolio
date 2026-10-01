import { describe, expect, it } from "vitest";
import {
  AUTO_ORBIT_SPEED,
  ORBIT_DAMP_LAMBDA,
  ORBIT_RETURN_SPEED,
  easeInOutCubic,
  orbitArcBetween,
  orbitStepFraction,
  wrapAngle,
} from "./cameraMotion";

/** The angle between two directions, from their dot product. */
function angleBetween(a: number[], b: number[]): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.min(1, Math.max(-1, dot / (Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2])))));
}

/** The point at `azimuth`/`polar` on a sphere of `radius` round the origin, the way the planet's orbit placed its camera. */
function pointOn(azimuth: number, polar: number, radius = 1): [number, number, number] {
  return [Math.sin(azimuth) * Math.sin(polar) * radius, Math.cos(polar) * radius, Math.cos(azimuth) * Math.sin(polar) * radius];
}

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

describe("orbitArcBetween", () => {
  const dirOf = (a: { azimuth: number; polar: number }): [number, number, number] => {
    const [x, y, z] = pointOn(a.azimuth, a.polar, 1);
    return [x, y, z];
  };

  it("measures a tilt as the tilt itself", () => {
    // Polar runs along a meridian, so a change in it is already an arc.
    expect(orbitArcBetween({ azimuth: 1.2, polar: 1.0 }, { azimuth: 1.2, polar: 1.4 })).toBeCloseTo(0.4);
  });

  it("measures a turn round the equator as the turn itself", () => {
    const half = Math.PI / 2;
    expect(orbitArcBetween({ azimuth: 0.2, polar: half }, { azimuth: 0.9, polar: half })).toBeCloseTo(0.7);
  });

  it("counts the same turn of azimuth for far less the nearer a pole it happens", () => {
    // Why a speed for the camera has to be asked for in arc rather than in
    // azimuth: high over the planet a whole turn crosses almost no ground, and
    // a cap written in azimuth alone would let the camera race round up there.
    const equator = orbitArcBetween({ azimuth: 0, polar: Math.PI / 2 }, { azimuth: 0.5, polar: Math.PI / 2 });
    const overhead = orbitArcBetween({ azimuth: 0, polar: 0.3 }, { azimuth: 0.5, polar: 0.3 });
    expect(equator).toBeCloseTo(0.5);
    expect(overhead).toBeLessThan(0.5 * equator);
  });

  it("agrees with the angle between the two directions those angles name", () => {
    // An oracle that shares no arithmetic with the closed form: build both
    // points through orbitPose and measure them the way geometry does.
    const pairs: [{ azimuth: number; polar: number }, { azimuth: number; polar: number }][] = [
      [{ azimuth: 0, polar: 1 }, { azimuth: 0.4, polar: 1.3 }],
      [{ azimuth: -2.9, polar: 0.5 }, { azimuth: 2.9, polar: 2.1 }], // either side of ±π
      [{ azimuth: 1, polar: 0.2 }, { azimuth: 4, polar: 2.8 }],
      [{ azimuth: 0.75, polar: 1.57 }, { azimuth: 0.76, polar: 1.58 }],
    ];
    for (const [a, b] of pairs) {
      expect(orbitArcBetween(a, b)).toBeCloseTo(angleBetween(dirOf(a), dirOf(b)));
    }
  });

  it("is zero, and not NaN, where the two points coincide", () => {
    const arc = orbitArcBetween({ azimuth: 2.2, polar: 0.8 }, { azimuth: 2.2, polar: 0.8 });
    expect(Number.isNaN(arc)).toBe(false);
    expect(arc).toBeCloseTo(0);
  });
});

describe("orbitStepFraction — how much of the gap one frame closes", () => {
  const frame = 1 / 60;
  const equator = Math.PI / 2;
  const gapOf = (gap: number) => ({
    from: { azimuth: 0, polar: equator },
    to: { azimuth: gap, polar: equator },
  });
  /** The arc a single frame actually covers, for a gap of `gap` radians. */
  const travelled = (gap: number, cap?: number) => {
    const { from, to } = gapOf(gap);
    const fraction = orbitStepFraction(from, to, frame, cap);
    return orbitArcBetween(from, {
      azimuth: from.azimuth + (to.azimuth - from.azimuth) * fraction,
      polar: from.polar + (to.polar - from.polar) * fraction,
    });
  };

  it("uncapped, takes the same share of the gap however big the gap is", () => {
    // The damp's own shape, and the complaint about it: a share of what is
    // left means a drag that went far is hauled back proportionally faster.
    expect(orbitStepFraction(gapOf(0.02).from, gapOf(0.02).to, frame)).toBeCloseTo(
      orbitStepFraction(gapOf(1.5).from, gapOf(1.5).to, frame)
    );
    expect(travelled(1.5)).toBeGreaterThan(travelled(0.02) * 50);
  });

  it("capped, covers the same arc however big the gap is", () => {
    // The fix, stated as the property that was wanted: one speed, not one
    // duration. 0.2 and 0.8 radians away both leave at the same pace.
    expect(travelled(0.2, ORBIT_RETURN_SPEED)).toBeCloseTo(travelled(0.8, ORBIT_RETURN_SPEED));
    expect(travelled(0.2, ORBIT_RETURN_SPEED)).toBeCloseTo(ORBIT_RETURN_SPEED * frame);
  });

  it("never crosses more arc in a frame than the cap allows", () => {
    for (const gap of [0.05, 0.2, 0.6, 1.5, 3.0]) {
      expect(travelled(gap, ORBIT_RETURN_SPEED)).toBeLessThanOrEqual(ORBIT_RETURN_SPEED * frame + 1e-12);
    }
  });

  it("holds to the cap on a long frame as well as a short one", () => {
    // The cap is a speed, so a frame worth four of them may cover four times
    // as much — and no more. A fixed per-frame step would fall behind on a
    // slow device instead.
    const { from, to } = gapOf(1.2);
    const long = 4 / 60;
    const fraction = orbitStepFraction(from, to, long, ORBIT_RETURN_SPEED);
    expect(fraction * 1.2).toBeCloseTo(ORBIT_RETURN_SPEED * long);
  });

  it("hands back to the damp for the last fraction of a degree", () => {
    // What ends a return: within about speed/λ radians the damp is already the
    // slower of the two, and the cap stops having anything to say.
    const close = gapOf(ORBIT_RETURN_SPEED / ORBIT_DAMP_LAMBDA / 4);
    expect(orbitStepFraction(close.from, close.to, frame, ORBIT_RETURN_SPEED)).toBe(
      orbitStepFraction(close.from, close.to, frame)
    );
  });

  it("never asks for more than the whole gap", () => {
    for (const gap of [1e-9, 1e-4, 0.01, 1, 3]) {
      for (const cap of [undefined, ORBIT_RETURN_SPEED]) {
        const { from, to } = gapOf(gap);
        const fraction = orbitStepFraction(from, to, frame, cap);
        expect(fraction).toBeGreaterThan(0);
        expect(fraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it("stays a number when there is no gap at all", () => {
    const still = { azimuth: 0.4, polar: 1.1 };
    expect(orbitStepFraction(still, still, frame, ORBIT_RETURN_SPEED)).toBeGreaterThan(0);
  });

  it("returns zero and never NaN when paused or delta is non-positive", () => {
    const { from, to } = gapOf(1.0);
    expect(orbitStepFraction(from, to, 0)).toBe(0);
    expect(orbitStepFraction(from, to, 0, ORBIT_RETURN_SPEED)).toBe(0);
    expect(orbitStepFraction(from, to, -0.01)).toBe(0);
    expect(Number.isNaN(orbitStepFraction(from, to, 0))).toBe(false);
  });
});

describe("drifting back onto the tour path after a drag", () => {
  const frame = 1 / 60;

  /**
   * Seconds for a camera released `gap` radians off the path to get back to
   * within `arrived`, with the path's own point drifting away from it at
   * `targetSpeed` all the while.
   */
  const secondsHome = (gap: number, cap: number | undefined, targetSpeed = 0, arrived = 0.02) => {
    const equator = Math.PI / 2;
    let camera = 0;
    let target = gap;
    for (let step = 0; step < 60 * 120; step++) {
      target += targetSpeed * frame;
      const from = { azimuth: camera, polar: equator };
      const to = { azimuth: target, polar: equator };
      if (to.azimuth - from.azimuth <= arrived) return step * frame;
      camera += (to.azimuth - from.azimuth) * orbitStepFraction(from, to, frame, cap);
    }
    return Infinity;
  };

  it("takes seconds where the damp alone took a fraction of one", () => {
    // The report this answers: released 0.35 rad (20°) off the path, the
    // planet was snatched back before the hand had left it.
    expect(secondsHome(0.35, undefined)).toBeLessThan(1);
    expect(secondsHome(0.35, ORBIT_RETURN_SPEED)).toBeGreaterThan(4);
    expect(secondsHome(0.35, ORBIT_RETURN_SPEED)).toBeLessThan(8);
  });

  it("still catches the path when the path is drifting away from it", () => {
    // The reason the cap cannot simply be AUTO_ORBIT_SPEED: the tour keeps
    // advancing while the camera returns, so a camera trailing directly behind
    // is chasing a point that is running from it at exactly that speed.
    expect(secondsHome(0.35, AUTO_ORBIT_SPEED, AUTO_ORBIT_SPEED)).toBe(Infinity);
    expect(secondsHome(0.35, ORBIT_RETURN_SPEED, AUTO_ORBIT_SPEED)).toBeLessThan(15);
  });

  it("closes on that receding point at about the speed the planet turns by itself", () => {
    // Which is what "come back at the idle rotation's speed" was asked for:
    // the arc between camera and target shrinks at ORBIT_RETURN_SPEED minus
    // the drift, and that difference is the idle drift itself.
    const gap = 0.35;
    const chasing = secondsHome(gap, ORBIT_RETURN_SPEED, AUTO_ORBIT_SPEED);
    expect(chasing).toBeGreaterThan(0.8 * (gap / AUTO_ORBIT_SPEED));
    expect(chasing).toBeLessThan(1.2 * (gap / AUTO_ORBIT_SPEED));
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
