/**
 * The keys of the PC's keyboard, in the keyboard's own frame: its centre is
 * the origin on the board's top, +X to the right, +Z towards the reader.
 * A full-size layout — function row, main block, arrows, number pad — laid
 * out in key units (1u = `KEY_PITCH`), so the rows line up like a real board.
 * `KEYBOARD.width`/`depth` (`room/layout.ts`) stay the board's outline; the
 * keys sit inside it, pushed towards the back so the front has room for the
 * wrists to rest.
 */

/** One key's width/depth step in metres: 19 mm, the real keyboard standard. */
export const KEY_PITCH = 0.019;
/** The gap between neighbouring keycaps. */
export const KEY_GAP = 0.0025;

export type Key = {
  /** Centre, in the keyboard's frame. */
  x: number;
  z: number;
  /** Keycap footprint (gap already taken off). */
  w: number;
  d: number;
  /** A key the reader's eye should find: Esc, Enter, the arrows' middle. */
  accent: boolean;
};

type Cell = { u: number; accent?: boolean };

const k = (u = 1, accent = false): Cell => ({ u, accent });
const gap = (u: number): Cell => ({ u: -u });
const run = (n: number): Cell[] => Array.from({ length: n }, () => k());

/** Each row is a left-to-right run of keys and gaps (a gap is a negative width). Rows are 1u apart. */
const ROWS: Cell[][] = [
  // Function row.
  [k(1, true), gap(1), ...run(4), gap(0.5), ...run(4), gap(0.5), ...run(4), gap(0.25), ...run(3)],
  // Number row, Insert block, number pad.
  [...run(13), k(2), gap(0.25), ...run(3), gap(0.25), ...run(4)],
  [k(1.5), ...run(12), k(1.5), gap(0.25), ...run(3), gap(0.25), ...run(3), k(1)],
  [k(1.75), ...run(11), k(2.25, true), gap(0.25), gap(3), gap(0.25), ...run(3)],
  [k(2.25), ...run(10), k(2.75), gap(0.25), gap(1), k(1), gap(1), gap(0.25), ...run(3), k(1, true)],
  [k(1.25), k(1.25), k(1.25), k(6.25), k(1.25), k(1.25), k(1.25), k(1.25), gap(0.25), ...run(3), gap(0.25), k(2), k(1)],
];

/** How far back the key block is pushed from the board's middle, leaving a wrist rest in front. */
export const KEYS_SHIFT_Z = -0.012;

/** The block of rows has a half-unit gap under the function row, as on a real board. */
const FUNCTION_ROW_GAP = 0.5;

/** How wide a row runs, in units (gaps included). */
function rowUnits(row: Cell[]): number {
  return row.reduce((sum, cell) => sum + Math.abs(cell.u), 0);
}

/**
 * Every keycap, centred on the board. Built from `ROWS`, so a key's place
 * is a fact of the table above rather than a hand-typed coordinate.
 */
export function keyboardKeys(): Key[] {
  const widest = Math.max(...ROWS.map(rowUnits));
  const totalDepth = ROWS.length + FUNCTION_ROW_GAP;
  const keys: Key[] = [];
  ROWS.forEach((row, r) => {
    const rowTop = (r + (r > 0 ? FUNCTION_ROW_GAP : 0)) * KEY_PITCH;
    let u = 0;
    for (const cell of row) {
      const width = Math.abs(cell.u);
      if (cell.u > 0) {
        keys.push({
          x: ((u + width / 2) - widest / 2) * KEY_PITCH,
          z: rowTop + KEY_PITCH / 2 - (totalDepth * KEY_PITCH) / 2 + KEYS_SHIFT_Z,
          w: width * KEY_PITCH - KEY_GAP,
          d: KEY_PITCH - KEY_GAP,
          accent: !!cell.accent,
        });
      }
      u += width;
    }
  });
  return keys;
}

/** The keys' overall outline, for checking they sit inside the board (`KEYBOARD` in `room/layout.ts`). */
export function keyboardExtent(): { width: number; depth: number } {
  const widest = Math.max(...ROWS.map(rowUnits));
  return { width: widest * KEY_PITCH, depth: (ROWS.length + FUNCTION_ROW_GAP) * KEY_PITCH };
}
