import { PIECES, PIECE_KEYS, ROOM_RADIUS, horizontalAt, pieceCentreDistance } from "./layout";

/**
 * Where the reader can stand: inside the wall and out of the furniture —
 * for walking about the room on the keys (`camera/freeWalk.ts`).
 *
 * The body is a disc `BODY_RADIUS` round. Each piece's footprint is grown by
 * that much and a place inside it is pushed out the shorter way, through the
 * front or a side: walking into the desk at an angle slides along its front
 * rather than stopping dead. The chair rolls about and is left out.
 */

/** **Provisional (仮).** Half the body's width, shoulders and all (the T-shirt is 32 cm across). */
export const BODY_RADIUS = 0.22;

function outOfPieces(x: number, z: number): [number, number] {
  for (const key of PIECE_KEYS) {
    const piece = PIECES[key];
    const [fx, fz] = horizontalAt(piece.angle);
    // Into the piece's frame: +X its right, +Z towards the centre (`pieceToWorld`).
    const lx = x * -fz + z * fx;
    const lz = pieceCentreDistance(piece) - (x * fx + z * fz);
    const halfWidth = piece.width / 2 + BODY_RADIUS;
    const front = piece.depth / 2 + BODY_RADIUS;
    if (Math.abs(lx) >= halfWidth || lz >= front) continue;
    let nx = lx;
    let nz = lz;
    if (front - lz <= halfWidth - Math.abs(lx)) nz = front;
    else nx = Math.sign(lx || 1) * halfWidth;
    const out = pieceCentreDistance(piece) - nz;
    x = fx * out + -fz * nx;
    z = fz * out + fx * nx;
  }
  return [x, z];
}

/** The nearest place to [x, z] the reader can stand. */
export function keepOnFloor(x: number, z: number): [number, number] {
  // Twice: pushed out of one piece near a corner can land in its neighbour.
  [x, z] = outOfPieces(x, z);
  [x, z] = outOfPieces(x, z);
  const reach = ROOM_RADIUS - BODY_RADIUS;
  const r = Math.hypot(x, z);
  return r > reach ? [(x / r) * reach, (z / r) * reach] : [x, z];
}
