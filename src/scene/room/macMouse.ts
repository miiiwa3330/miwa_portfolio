/**
 * The Macintosh's mouse: the **M0100** that came with the 128K
 * (`reference/4/マッキントッシュ1.png`, 2026-10-22) — a beige box with
 * rounded corners and one wide button across the front of its top, the cord
 * out of its front. Its size, from museum records (they differ by a few
 * millimetres): 60 mm wide and 38 mm tall (The Henry Ford, 292299), 108 mm
 * long (Computer History Museum, 102741060). The button's size and place are
 * read off the photo: about two thirds of the width, a quarter of the length,
 * a little in from the front (**仮**, a small photo).
 *
 * The mouse's own frame, as the EX-G's (`room/mouse.ts`): origin on the
 * desk under its middle, +X right, +Y up, +Z towards the reader — so the
 * button is at −Z.
 */

export const M0100 = { width: 0.06, length: 0.108, height: 0.038 } as const;

/** The button: its middle (from the mouse's middle, towards the front), its size, and how far it goes down. */
export const M0100_BUTTON = { z: -0.03, width: 0.038, length: 0.028, travel: 0.0015 } as const;

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
