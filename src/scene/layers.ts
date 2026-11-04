/**
 * The three.js layers the room uses, and which cameras see each.
 *
 * Everything ordinary is on layer 0, which every camera sees. The others are
 * for things only some cameras should draw:
 *
 * - **`SCREEN_HOLE_LAYER`** — the transparent cut-outs that let the HTML
 *   behind the canvas show through (the PC's screen, `RoomScene`). Only the
 *   reader's own camera draws them. The curve mirror's cube and the security
 *   camera must not: their pictures are opaque, and a cut-out in them would
 *   come out black where the screen's lit face should be.
 */
export const SCREEN_HOLE_LAYER = 2;

/**
 * **`HEAD_LAYER`** — the reader's own head (`Self`). The reader's camera is
 * inside it, so that camera may not draw it; the security camera and the curve
 * mirror's cube do, so the owner has a head on the right-hand monitor and in
 * the mirror.
 */
export const HEAD_LAYER = 1;
