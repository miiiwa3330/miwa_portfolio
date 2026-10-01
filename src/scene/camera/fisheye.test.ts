import { describe, expect, it } from "vitest";
import { projectStereographic, stereographicRadius, stereographicTheta, unprojectStereographic } from "./fisheye";
import type { Direction } from "../planet/geometry";

const DEG = Math.PI / 180;
const HALF = (161 / 2) * DEG;
const ASPECT = 16 / 9;

const fromAngles = (yawDeg: number, pitchDeg: number): Direction => {
  const c = Math.cos(pitchDeg * DEG);
  return [Math.sin(yawDeg * DEG) * c, Math.sin(pitchDeg * DEG), -Math.cos(yawDeg * DEG) * c];
};

describe("stereographic lens", () => {
  it("puts the view axis at the centre of the frame", () => {
    expect(projectStereographic([0, 0, -1], HALF, ASPECT)).toEqual({ x: 0, y: 0 });
  });

  it("fills the frame's width with exactly the horizontal field of view", () => {
    const right = projectStereographic(fromAngles(161 / 2, 0), HALF, ASPECT)!;
    const left = projectStereographic(fromAngles(-161 / 2, 0), HALF, ASPECT)!;
    expect(right.x).toBeCloseTo(1, 9);
    expect(left.x).toBeCloseTo(-1, 9);
    expect(right.y).toBeCloseTo(0, 9);
  });

  it("is round: the same angle off-axis lands the same physical distance away in every direction", () => {
    // Up is squeezed into ndc by the aspect ratio; undo that to compare px.
    const side = projectStereographic(fromAngles(40, 0), HALF, ASPECT)!;
    const up = projectStereographic(fromAngles(0, 40), HALF, ASPECT)!;
    expect(up.y / ASPECT).toBeCloseTo(side.x, 9);
  });

  it("round-trips every direction in front of the lens through the screen and back", () => {
    for (const [yaw, pitch] of [
      [0, 0],
      [30, 10],
      [-70, -25],
      [80, 0],
      [5, 60],
      [-150, 5],
    ]) {
      const d = fromAngles(yaw, pitch);
      const p = projectStereographic(d, HALF, ASPECT)!;
      const back = unprojectStereographic(p.x, p.y, HALF, ASPECT);
      for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(d[i], 9);
    }
  });

  it("has nowhere to put the point straight behind it", () => {
    expect(projectStereographic([0, 0, 1], HALF, ASPECT)).toBeNull();
  });

  it("keeps small things their own shape at the edge of the frame", () => {
    // Why stereographic was chosen over equidistant: it is conformal. A small
    // step off-axis (radial) and a small step around the axis (tangential)
    // must land the same distance apart on screen, even at the frame's edge.
    const theta = 75 * DEG;
    const eps = 1e-5;
    const radial = stereographicRadius(theta + eps, HALF) - stereographicRadius(theta, HALF);
    const tangential = stereographicRadius(theta, HALF) * (eps / Math.sin(theta));
    expect(radial / tangential).toBeCloseTo(1, 4);
  });

  it("inverts its own radius", () => {
    for (const theta of [0.1, 0.7, 1.2, HALF, 2.5]) expect(stereographicTheta(stereographicRadius(theta, HALF), HALF)).toBeCloseTo(theta, 12);
  });
});
