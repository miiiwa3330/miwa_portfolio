import { describe, expect, it } from "vitest";
import { CURVE_MIRROR, curveMirror, mirrorCapAngle, mirrorRimDepth } from "./mirror";
import { BOARD_FRAME, EYE_HEIGHT, PIECES, ROOM_RADIUS, SUBJECTS, WALL_HEIGHT, pieceToWorld, standardView } from "./layout";
import { freeFraming, poseFromView, projectToScreen, toCameraSpace, zoomFraming } from "../camera/roomCamera";

const { mount, centre, normal } = curveMirror();
const sub = (a: readonly number[], b: readonly number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (v: number[]) => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const angle = (a: number[], b: readonly number[]) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

/** The board's top right corner, seen from the centre (+X is right in the board's frame). */
const boardCorner = pieceToWorld(PIECES.board, [
  BOARD_FRAME.width / 2,
  SUBJECTS.experience.local[1] + BOARD_FRAME.height / 2,
  PIECES.board.depth / 2,
]);

describe("the curve mirror", () => {
  it("hangs above and to the right of the board's top right corner, seen from the centre", () => {
    for (const framing of [freeFraming("standard", false), zoomFraming("experience", false)]) {
      const pose = poseFromView(standardView("experience"), framing);
      const corner = projectToScreen(toCameraSpace(pose, boardCorner), pose, 1600, 900)!;
      const glass = projectToScreen(toCameraSpace(pose, centre), pose, 1600, 900)!;
      expect(glass.x).toBeGreaterThan(corner.x);
      expect(glass.y).toBeLessThan(corner.y);
    }
  });

  it("is in the fisheye's picture, rim and all, from the board's stop — on a desktop and a phone", () => {
    // Facing the board in the standard view it is out of the frame: high
    // (the frame's top is 20° up; the glass is 22° up) and past the right
    // edge, where the card's shift puts the board's own corner. The reader
    // looks up at it, or widens the view.
    const side = unit([normal[2], 0, -normal[0]]);
    const up = [
      side[1] * normal[2] - side[2] * normal[1],
      side[2] * normal[0] - side[0] * normal[2],
      side[0] * normal[1] - side[1] * normal[0],
    ];
    const r = CURVE_MIRROR.radius;
    const rim = [side, up].flatMap((axis) => [1, -1].map((k) => centre.map((c, n) => c + axis[n] * r * k) as [number, number, number]));
    for (const [handheld, width, height] of [
      [false, 1600, 900],
      [true, 390, 844],
    ] as const) {
      const pose = poseFromView(standardView("experience"), freeFraming("fisheye", handheld));
      for (const point of rim) {
        const p = projectToScreen(toCameraSpace(pose, point), pose, width, height)!;
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(height);
      }
    }
  });

  it("shows the reader at the centre whole, head to feet", () => {
    // A convex glass shows a point to an eye where its surface faces half-way
    // between the two: that has to be somewhere on the cap.
    const eye = [0, EYE_HEIGHT, 0];
    const toEye = unit(sub(eye, centre));
    for (const point of [eye, [0, 0, 0]]) {
      const toPoint = unit(sub(point, centre));
      const between = unit(toEye.map((e, n) => e + toPoint[n]));
      expect(angle(between, normal)).toBeLessThan(mirrorCapAngle() * 0.8);
    }
  });

  it("is off the wall on its bracket, inside the room", () => {
    expect(Math.hypot(mount[0], mount[2])).toBeCloseTo(ROOM_RADIUS, 6);
    expect(Math.hypot(centre[0], centre[2])).toBeLessThan(ROOM_RADIUS - 0.25);
  });

  it("keeps all of itself in front of the wall, its tilted top and its back included", () => {
    const side = unit([normal[2], 0, -normal[0]]);
    const up = [
      side[1] * normal[2] - side[2] * normal[1],
      side[2] * normal[0] - side[0] * normal[2],
      side[0] * normal[1] - side[1] * normal[0],
    ];
    const depth = mirrorRimDepth() + CURVE_MIRROR.back;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      // Round the back's edge, where the mirror reaches furthest back.
      const p = centre.map(
        (c, n) => c + (side[n] * Math.cos(a) + up[n] * Math.sin(a)) * (CURVE_MIRROR.radius + 0.01) - normal[n] * depth
      );
      expect(Math.hypot(p[0], p[2])).toBeLessThan(ROOM_RADIUS - 0.02);
    }
  });

  it("stays under the neon strip round the top of the wall, hood and all", () => {
    // The strip runs at WALL_HEIGHT - 0.42 (`RoomScene`'s `Shell`); the hood stands 2–3 cm over the rim.
    expect(centre[1] + CURVE_MIRROR.radius + 0.03).toBeLessThan(WALL_HEIGHT - 0.42 - 0.02);
  });

  it("is a gentle bulge, not a ball: the cap stays well short of a hemisphere", () => {
    expect(mirrorCapAngle()).toBeGreaterThan((20 * Math.PI) / 180);
    expect(mirrorCapAngle()).toBeLessThan((40 * Math.PI) / 180);
  });
});
