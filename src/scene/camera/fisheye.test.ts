import { describe, expect, it } from "vitest";
import {
  RECTILINEAR,
  STEREOGRAPHIC,
  lensPixelsPerRadian,
  lensRadius,
  lensTheta,
  projectLens,
  unprojectLens,
} from "./fisheye";
import type { Direction } from "../planet/geometry";

const DEG = Math.PI / 180;
const HALF = (161 / 2) * DEG;
const HALF_STANDARD = (67 / 2) * DEG;
const ASPECT = 16 / 9;

const fromAngles = (yawDeg: number, pitchDeg: number): Direction => {
  const c = Math.cos(pitchDeg * DEG);
  return [Math.sin(yawDeg * DEG) * c, Math.sin(pitchDeg * DEG), -Math.cos(yawDeg * DEG) * c];
};

describe("the lens at k = 1", () => {
  it("is the pinhole projection three.js draws", () => {
    // Written out independently of the lens: a point (X, Y, Z) in front of a
    // pinhole lands at X/-Z and Y/-Z on the image plane, and the frame's
    // half-width on that plane is tan(H).
    for (const [yaw, pitch] of [
      [0, 0],
      [20, 5],
      [-30, -12],
      [33, 18],
      [-5, 40],
    ]) {
      const [x, y, z] = fromAngles(yaw, pitch);
      const p = projectLens([x, y, z], HALF_STANDARD, ASPECT, RECTILINEAR)!;
      expect(p.x).toBeCloseTo(x / -z / Math.tan(HALF_STANDARD), 9);
      expect(p.y).toBeCloseTo((y / -z / Math.tan(HALF_STANDARD)) * ASPECT, 9);
    }
  });

  it("cannot show anything at or behind the image plane", () => {
    expect(projectLens(fromAngles(90, 0), HALF_STANDARD, ASPECT, RECTILINEAR)).toBeNull();
    expect(projectLens(fromAngles(120, 0), HALF_STANDARD, ASPECT, RECTILINEAR)).toBeNull();
  });

  it("sizes things the way three.js sizes a sprite: focal length over depth", () => {
    // A sprite `s` across at distance `d` and `θ` off-axis has depth d·cosθ,
    // and three.js draws it f·s/(d·cosθ) px across, f = halfWidth / tanH.
    const halfWidth = 800;
    const focal = halfWidth / Math.tan(HALF_STANDARD);
    for (const theta of [0, 10 * DEG, 25 * DEG, 33 * DEG]) {
      expect(lensPixelsPerRadian(theta, HALF_STANDARD, RECTILINEAR, halfWidth)).toBeCloseTo(focal / Math.cos(theta), 6);
    }
  });
});

describe("the lens at k = 2 (stereographic)", () => {
  it("puts the view axis at the centre of the frame", () => {
    expect(projectLens([0, 0, -1], HALF, ASPECT, STEREOGRAPHIC)).toEqual({ x: 0, y: 0 });
  });

  it("is round: the same angle off-axis lands the same physical distance away in every direction", () => {
    // Up is squeezed into ndc by the aspect ratio; undo that to compare px.
    const side = projectLens(fromAngles(40, 0), HALF, ASPECT, STEREOGRAPHIC)!;
    const up = projectLens(fromAngles(0, 40), HALF, ASPECT, STEREOGRAPHIC)!;
    expect(up.y / ASPECT).toBeCloseTo(side.x, 9);
  });

  it("can show what a perspective cannot, out past 90°", () => {
    const p = projectLens(fromAngles(120, 0), HALF, ASPECT, STEREOGRAPHIC);
    expect(p).not.toBeNull();
    expect(p!.x).toBeGreaterThan(1); // off the frame's edge, but somewhere
  });

  it("has nowhere to put the point straight behind it", () => {
    expect(projectLens([0, 0, 1], HALF, ASPECT, STEREOGRAPHIC)).toBeNull();
  });

  it("keeps small things their own shape at the edge of the frame", () => {
    // Why stereographic was chosen over equidistant: it is conformal. A small
    // step off-axis (radial) and a small step around the axis (tangential)
    // must land the same distance apart on screen, even at the frame's edge.
    const theta = 75 * DEG;
    const eps = 1e-5;
    const radial = lensRadius(theta + eps, HALF, STEREOGRAPHIC) - lensRadius(theta, HALF, STEREOGRAPHIC);
    const tangential = lensRadius(theta, HALF, STEREOGRAPHIC) * (eps / Math.sin(theta));
    expect(radial / tangential).toBeCloseTo(1, 4);
  });

  it("is not equidistant: the centre is drawn smaller than the edges", () => {
    const centre = lensPixelsPerRadian(0, HALF, STEREOGRAPHIC, 800);
    const edge = lensPixelsPerRadian(75 * DEG, HALF, STEREOGRAPHIC, 800);
    expect(edge).toBeGreaterThan(centre * 1.3);
  });
});

describe("every lens between the two", () => {
  const lenses = [RECTILINEAR, 1.25, 1.5, 1.75, STEREOGRAPHIC];

  it("fills the frame's width with exactly the horizontal field of view", () => {
    // What lets the standard view bend into the fisheye over a flight: the
    // frame's edges stay exactly where the field of view says, whatever k.
    for (const k of lenses) {
      for (const hfov of [67, 114, 161]) {
        const half = (hfov / 2) * DEG;
        const right = projectLens(fromAngles(hfov / 2, 0), half, ASPECT, k)!;
        const left = projectLens(fromAngles(-hfov / 2, 0), half, ASPECT, k)!;
        expect(right.x).toBeCloseTo(1, 9);
        expect(left.x).toBeCloseTo(-1, 9);
        expect(right.y).toBeCloseTo(0, 9);
      }
    }
  });

  it("round-trips every direction it can show through the screen and back", () => {
    for (const k of lenses) {
      for (const [yaw, pitch] of [
        [0, 0],
        [30, 10],
        [-70, -25],
        [80, 0],
        [5, 60],
      ]) {
        const d = fromAngles(yaw, pitch);
        const p = projectLens(d, HALF, ASPECT, k);
        if (!p) continue;
        const back = unprojectLens(p.x, p.y, HALF, ASPECT, k);
        for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(d[i], 9);
      }
    }
  });

  it("inverts its own radius", () => {
    for (const k of lenses) {
      for (const theta of [0.1, 0.7, 1.2, HALF]) expect(lensTheta(lensRadius(theta, HALF, k), HALF, k)).toBeCloseTo(theta, 12);
    }
  });

  it("sizes a marker by how far apart two nearby points land on screen, around the axis", () => {
    // Measured, not restated: step a direction a hair around the view axis and
    // see how far its projection moves, in px.
    const halfWidth = 800;
    for (const k of lenses) {
      for (const theta of [5 * DEG, 30 * DEG, 60 * DEG]) {
        const eps = 1e-6;
        const at = (phi: number): Direction => [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), -Math.cos(theta)];
        const a = projectLens(at(0), HALF, 1, k)!;
        const b = projectLens(at(eps), HALF, 1, k)!;
        const px = Math.hypot(b.x - a.x, b.y - a.y) * halfWidth;
        const radians = eps * Math.sin(theta);
        expect(lensPixelsPerRadian(theta, HALF, k, halfWidth)).toBeCloseTo(px / radians, 2);
      }
    }
  });
});
