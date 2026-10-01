/**
 * The three.js layers the room uses, and which cameras see each.
 *
 * Everything ordinary is on layer 0, which every camera sees. The others are
 * for things only some cameras should draw:
 *
 * - **`SCREEN_HOLE_LAYER`** — the transparent cut-outs that let the HTML
 *   behind the canvas show through (the PC's screen, `RoomScene`). Only the
 *   reader's own camera draws them. The fisheye's cube camera must not: its
 *   picture is drawn opaque (`LENS_FRAGMENT_SHADER`), and a cut-out in it
 *   would come out black where the screen's lit face should be.
 */
export const SCREEN_HOLE_LAYER = 2;

/**
 * **`HEAD_LAYER`** — the reader's own head (`Self`). The reader's camera is
 * inside it, so neither that camera nor the fisheye's cube camera (which
 * stands at the same eye) may draw it; the security camera does, so the
 * owner on the right-hand monitor has a head.
 */
export const HEAD_LAYER = 1;
