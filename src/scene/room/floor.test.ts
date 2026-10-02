import { describe, expect, it } from "vitest";
import { BODY_RADIUS, keepOnFloor } from "./floor";
import { PIECES, PIECE_KEYS, ROOM_RADIUS, horizontalAt, pieceCentreDistance } from "./layout";

/** A place in a piece's own frame (+X its right, +Z towards the centre) and back. */
function inPiece(key: keyof typeof PIECES, x: number, z: number): [number, number] {
  const piece = PIECES[key];
  const [fx, fz] = horizontalAt(piece.angle);
  return [x * -fz + z * fx, pieceCentreDistance(piece) - (x * fx + z * fz)];
}

describe("keepOnFloor", () => {
  it("leaves the open floor alone", () => {
    for (const [x, z] of [
      [0, 0],
      [0.8, -0.5],
      [-1.2, 0.4],
    ]) {
      expect(keepOnFloor(x, z)).toEqual([x, z]);
    }
  });

  it("keeps the body inside the wall, everywhere round", () => {
    for (let a = 0; a < 360; a += 7) {
      const [hx, hz] = horizontalAt(a);
      const [x, z] = keepOnFloor(hx * 5, hz * 5);
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(ROOM_RADIUS - BODY_RADIUS + 1e-9);
    }
  });

  it("keeps the body out of every piece of furniture, a body's width off its front", () => {
    for (const key of PIECE_KEYS) {
      const piece = PIECES[key];
      const [fx, fz] = horizontalAt(piece.angle);
      // Straight at the piece's middle, from the centre: stopped at its front.
      const [x, z] = keepOnFloor(fx * pieceCentreDistance(piece), fz * pieceCentreDistance(piece));
      const [lx, lz] = inPiece(key, x, z);
      expect(Math.abs(lx)).toBeLessThan(1e-9);
      expect(lz).toBeCloseTo(piece.depth / 2 + BODY_RADIUS, 9);
    }
  });

  it("slides along a front rather than stopping dead: the sideways part of the step survives", () => {
    // Into the desk's front a little to the right of its middle.
    const piece = PIECES.desk;
    const [fx, fz] = horizontalAt(piece.angle);
    const out = pieceCentreDistance(piece) - piece.depth / 2 - BODY_RADIUS + 0.05;
    const [x, z] = keepOnFloor(fx * out + -fz * 0.4, fz * out + fx * 0.4);
    const [lx] = inPiece("desk", x, z);
    expect(lx).toBeCloseTo(0.4, 9);
  });
});
