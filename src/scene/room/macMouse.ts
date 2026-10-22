import { MAC, MAC_MOUSE, macToDesk } from "./layout";
import { MAC_BACK } from "./macCase";

/**
 * The Macintosh's mouse: the **M0100** that came with the 128K
 * (`reference/4/マッキントッシュ1.png`, 2026-10-22; its shape from
 * マッキントッシュ9.png, 6.png and 8.png, 2026-10-23). Its size, from museum
 * records (they differ by a few millimetres): 60 mm wide and 38 mm tall (The
 * Henry Ford, 292299), 108 mm long (Computer History Museum, 102741060).
 *
 * **Its shape is a low box under a flat top with sloping sides** — not a
 * rounded box: the walls stand straight up most of the way, then slope in
 * to a flat top; steeply at the sides and the front, long and low at the
 * back, where the palm rests. One square button at the top's front, a
 * little in from its front edge; the maker's mark sunk in a square at the
 * top's back left (replaced with Miiiwa's).
 *
 * Measured, with the footprint's 60 mm across as the scale:
 * - **Across, in photo 9** (from above; the mouse is square to the camera
 *   across, so widths there read true — the sunk square's two sides come out
 *   115 and 120 px): at the button's line, the mouse is 790 px, its top
 *   625 px (so the side slopes are 6.3 mm each), the button 470 px (36 mm)
 *   with 77 px of the top either side; at the mark's line the top is 5.6%
 *   wider in the photo (nearer the camera), which makes the mark 8.4 mm, its
 *   middle 10.4 mm in from the top's left edge.
 * - **Along, in photo 9**: the button 285 px long and the strip in front of
 *   it 65 px (21 mm and 5 mm, the button's and the mark's sides as the
 *   scale), the mark's middle 41 mm behind the button's.
 * - **Up, in photo 6** (from the side and a little above, 16° — the top's
 *   47 mm reads 24 px, the walls 52 px, the side slope 19 px): the walls
 *   stand 29 mm, the side slope rises the last 9 mm.
 * - **The back's slope**: 28 mm long in photo 6 (a quarter of the length)
 *   and about 32 mm from photo 9's top and button (the top 2.07 times the
 *   button's length behind it, which the nearer back overstates): 30 mm.
 *
 * The mouse's own frame, as the EX-G's (`room/mouse.ts`): origin on the
 * desk under its middle, +X right, +Y up, +Z towards the reader — so the
 * button is at −Z.
 */

export const M0100 = { width: 0.06, length: 0.108, height: 0.038 } as const;

/**
 * The body: the footprint's corners; the parting line between the two shells
 * (low round the sides, 4.png and 6.png); how high the walls stand before
 * the top slopes in; how far in the flat top is from the sides, the front
 * and the back, and its corners. **仮**: the corners' radii.
 */
export const M0100_SHAPE = {
  corner: 0.008,
  parting: { from: 0.0065, to: 0.0077 },
  shoulder: 0.029,
  inset: { side: 0.0063, front: 0.0063, back: 0.03 },
  topCorner: 0.004,
} as const;

/** The flat top: its middle along the mouse, its width and its length. */
export const M0100_TOP = {
  z: (M0100_SHAPE.inset.front - M0100_SHAPE.inset.back) / 2,
  width: M0100.width - 2 * M0100_SHAPE.inset.side,
  length: M0100.length - M0100_SHAPE.inset.front - M0100_SHAPE.inset.back,
} as const;

/** The button's length, and the strip of the top in front of it. */
const BUTTON_LENGTH = 0.021;
const FRONT_STRIP = 0.005;

/** The button: its middle (from the mouse's middle, towards the front), its size, and how far it goes down. */
export const M0100_BUTTON = {
  z: -M0100.length / 2 + M0100_SHAPE.inset.front + FRONT_STRIP + BUTTON_LENGTH / 2,
  width: 0.036,
  length: BUTTON_LENGTH,
  travel: 0.0015,
} as const;

/** The sunk mark at the top's back left: its middle, 10.4 mm in from the top's left edge and 41 mm behind the button's; its side. */
export const M0100_MARK = {
  x: -M0100_TOP.width / 2 + 0.0104,
  z: M0100_BUTTON.z + 0.041,
  size: 0.0084,
} as const;

/** Whether a point on the mouse's top (its own frame, x and z) is on the button. */
export function onMacButton(x: number, z: number): boolean {
  return Math.abs(x) <= M0100_BUTTON.width / 2 && Math.abs(z - M0100_BUTTON.z) <= M0100_BUTTON.length / 2;
}

/**
 * Where the mouse may slide (**仮**, 6 × 4 cm round where it rests: clear of
 * the Mac's keyboard and the HHKB), mapped onto the Mac's 512 × 342 screen —
 * the same one-to-one mapping as the EX-G's (`travelMapping`).
 */
export const M0100_TRAVEL = { width: 0.06, depth: (0.06 * 342) / 512 } as const;

/**
 * The cord, in the desk's frame (2026-10-23, the user: 「動的なケーブルにし
 * て」): out of the mouse's front wherever it has slid to (`at`, from where
 * it rests), forward along the desk, round behind the Mac's keyboard and up
 * into the Mac's mouse port (the first on its back, `MAC_BACK.ports`). The
 * stretch out of the mouse moves with it; the run along the desk follows
 * `trail` (where the mouse was a moment ago, so the cord drags after it);
 * the end at the port stays put. Points for a smooth curve through them.
 */
export function macMouseCord(at: readonly [number, number], trail: readonly [number, number]): [number, number, number][] {
  const port = macToDesk([MAC_BACK.ports.at[0], MAC_BACK.ports.y, -MAC.depth / 2]);
  const x = MAC_MOUSE.x + at[0];
  const z = MAC_MOUSE.z + at[1];
  const y = MAC_MOUSE.y;
  return [
    [x, y + 0.012, z - M0100.length / 2],
    [x, y + 0.003, z - M0100.length / 2 - 0.04],
    // On the desk behind the Mac's keyboard, dragged half as far as the mouse went.
    [MAC_MOUSE.x - 0.02 + trail[0] / 2, y + 0.003, MAC_MOUSE.z - 0.25 + trail[1] / 2],
    [port[0] + 0.05, y + 0.003, port[2] - 0.05],
    [port[0], port[1], port[2] - 0.02],
    port,
  ];
}
