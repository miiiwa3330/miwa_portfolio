import type { Key, Legend } from "./keyboard";
import type { CapShape } from "./keycaps";

/**
 * The Macintosh's keyboard: the **M0110** that came with the Macintosh 128K
 * (`reference/4/マッキントッシュ1〜3`, 2026-10-22) — 58 keys, no arrows, no
 * numeric keypad, gray caps with a tan space bar on a beige case with a wide
 * front lip.
 *
 * The layout is read off マッキントッシュ2.webp: every row is 15 units at
 * the standard 19.05 mm pitch. The bottom row starts 1.25 units in (under the
 * left Shift's middle), then Option 1.25, ⌘ 1.5, the space bar 7.5, Enter
 * 1.75, Option 1.75 — measured against the row above it in the photo, whose
 * keys are a known width. **仮**: the rims and the lip (the photo is at an
 * angle), the plate's tilt and height, the caps' profile.
 *
 * The keyboard's own frame, as the HHKB's (`room/keyboard.ts`): origin on
 * the desk under the middle of the case, +X right, +Y up, +Z towards the
 * reader; the keys stand on a plate tilted front-low.
 */

const PITCH = 0.01905;
const UNITS = 15;
const SIDE = 0.012;
const BACK = 0.012;
const LIP = 0.035;

export const M0110 = {
  pitch: PITCH,
  width: UNITS * PITCH + 2 * SIDE,
  depth: 5 * PITCH + BACK + LIP,
  /** The key block: its size, and how far it is from the case's back edge. */
  block: { width: UNITS * PITCH, depth: 5 * PITCH, back: BACK },
  /** How far a key goes down. */
  travel: 0.004,
} as const;

/** **仮** shape values: the plate's tilt and its middle's height over the desk, the caps' taper and dish, and their corners. */
export const M0110_TILT_DEG = 6;
const PLATE_BASE = 0.019;
const CAP = {
  footGap: 0.0012,
  taperSide: 0.0026,
  taperBack: 0.0034,
  taperFront: 0.002,
  dish: 0.0008,
  dishWide: 0.0003,
  footRadius: 0.0012,
  topRadius: 0.0022,
  topRound: 0.0008,
} as const;
/** The sculpted rows, back row first: each row's height at the middle of its top over the plate, and the top's lean (degrees, positive facing the reader). */
const ROW_PROFILE: readonly { height: number; lean: number }[] = [
  { height: 0.0126, lean: 9 },
  { height: 0.0114, lean: 4 },
  { height: 0.0106, lean: 0 },
  { height: 0.0109, lean: -4 },
  { height: 0.0112, lean: -6 },
];

type Spec = { id: string; u?: number; tan?: boolean; legend: Legend; codes?: string[] };
type Cell = Spec | { gap: number };

const letter = (c: string): Spec => ({ id: c.toLowerCase(), legend: { main: c }, codes: [`Key${c}`] });
const pair = (id: string, shift: string, main: string, code: string): Spec => ({ id, legend: { main, shift }, codes: [code] });
const word = (id: string, main: string, u: number, codes: string[]): Spec => ({ id, u, legend: { main }, codes });

/** The board as the photo shows it, back row first. */
const ROWS: Cell[][] = [
  [
    pair("backquote", "~", "`", "Backquote"),
    pair("1", "!", "1", "Digit1"),
    pair("2", "@", "2", "Digit2"),
    pair("3", "#", "3", "Digit3"),
    pair("4", "$", "4", "Digit4"),
    pair("5", "%", "5", "Digit5"),
    pair("6", "^", "6", "Digit6"),
    pair("7", "&", "7", "Digit7"),
    pair("8", "*", "8", "Digit8"),
    pair("9", "(", "9", "Digit9"),
    pair("0", ")", "0", "Digit0"),
    pair("minus", "_", "-", "Minus"),
    pair("equal", "+", "=", "Equal"),
    word("backspace", "Backspace", 2, ["Backspace", "Delete"]),
  ],
  [
    word("tab", "Tab", 1.5, ["Tab"]),
    ..."QWERTYUIOP".split("").map(letter),
    pair("bracketleft", "{", "[", "BracketLeft"),
    pair("bracketright", "}", "]", "BracketRight"),
    { id: "backslash", u: 1.5, legend: { main: "\\", shift: "|" }, codes: ["Backslash", "IntlYen"] },
  ],
  [
    word("capslock", "Caps Lock", 1.75, ["CapsLock"]),
    ..."ASDFGHJKL".split("").map(letter),
    pair("semicolon", ":", ";", "Semicolon"),
    pair("quote", '"', "'", "Quote"),
    word("return", "Return", 2.25, ["Enter"]),
  ],
  [
    word("shiftleft", "Shift", 2.25, ["ShiftLeft"]),
    ..."ZXCVBNM".split("").map(letter),
    pair("comma", "<", ",", "Comma"),
    pair("period", ">", ".", "Period"),
    pair("slash", "?", "/", "Slash"),
    word("shiftright", "Shift", 2.75, ["ShiftRight", "IntlRo"]),
  ],
  [
    { gap: 1.25 },
    word("optionleft", "Option", 1.25, ["AltLeft"]),
    { id: "command", u: 1.5, legend: { main: "⌘" }, codes: ["MetaLeft", "MetaRight", "ControlLeft", "ControlRight"] },
    { id: "space", u: 7.5, tan: true, legend: { main: "" }, codes: ["Space"] },
    word("enter", "Enter", 1.75, ["NumpadEnter"]),
    word("optionright", "Option", 1.75, ["AltRight"]),
  ],
];

/** Every key, in reading order; `mod` marks the tan space bar (the only cap not gray). */
export function macKeyboardKeys(): Key[] {
  const keys: Key[] = [];
  ROWS.forEach((row, r) => {
    let u = 0;
    for (const cell of row) {
      if ("gap" in cell) {
        u += cell.gap;
        continue;
      }
      const units = cell.u ?? 1;
      keys.push({
        index: keys.length,
        id: cell.id,
        row: r,
        units,
        mod: !!cell.tan,
        legend: cell.legend,
        x: (u + units / 2 - UNITS / 2) * PITCH,
        z: -M0110.depth / 2 + BACK + (r + 0.5) * PITCH,
      });
      u += units;
    }
  });
  return keys;
}

/** How wide each row runs, in key units, gaps included. */
export function macRowUnits(): number[] {
  return ROWS.map((row) => row.reduce((sum, cell) => sum + ("gap" in cell ? cell.gap : (cell.u ?? 1)), 0));
}

const KEY_INDEX = new Map(macKeyboardKeys().map((key) => [key.id, key.index]));
const CODE_TO_KEY = new Map<string, number>();
for (const row of ROWS) for (const cell of row) if (!("gap" in cell)) for (const code of cell.codes ?? []) CODE_TO_KEY.set(code, KEY_INDEX.get(cell.id)!);

export const MAC_KEY_COUNT = KEY_INDEX.size;

/** The key in the same place as a key on the reader's own keyboard (`KeyboardEvent.code`), or none: the M0110 has no arrows, no F-keys. */
export function macKeyForCode(code: string): number | undefined {
  return CODE_TO_KEY.get(code);
}

const TILT = (M0110_TILT_DEG * Math.PI) / 180;

function capFoot(key: Key): { width: number; depth: number } {
  return { width: key.units * PITCH - CAP.footGap, depth: PITCH - CAP.footGap };
}

function capTop(key: Key): { width: number; depth: number; dz: number } {
  const foot = capFoot(key);
  const back = -foot.depth / 2 + CAP.taperBack;
  const front = foot.depth / 2 - CAP.taperFront;
  return { width: foot.width - 2 * CAP.taperSide, depth: front - back, dz: (back + front) / 2 };
}

function capTopHeight(key: Key, u: number, v: number): number {
  const { height, lean } = ROW_PROFILE[key.row];
  const top = capTop(key);
  const dish = key.units > 2.5 ? CAP.dishWide : CAP.dish;
  return height - Math.tan((lean * Math.PI) / 180) * v * top.depth - dish * (1 - 4 * u * u);
}

/** A point in the plate's frame, in the keyboard's. */
export function macPlateToBoard(p: readonly [number, number, number]): [number, number, number] {
  const [x, y, z] = p;
  return [x, PLATE_BASE + y * Math.cos(TILT) - z * Math.sin(TILT), y * Math.sin(TILT) + z * Math.cos(TILT)];
}

/** The height over the desk, at keyboard-frame depth `z`, of the plane lying `offset` above the plate — the case's rim and its floor. */
export function macPlaneHeightAt(z: number, offset: number): number {
  return PLATE_BASE + offset / Math.cos(TILT) - z * Math.tan(TILT);
}

/** Which way a key travels when pressed, in the keyboard's frame: down the plate's normal. */
export const MAC_PRESS_DIRECTION: readonly [number, number, number] = [0, -Math.cos(TILT), -Math.sin(TILT)];

export const MAC_CAPS: CapShape = {
  capFoot,
  capTop,
  capTopHeight,
  toBoard: macPlateToBoard,
  footRadius: CAP.footRadius,
  topRadius: CAP.topRadius,
  topRound: CAP.topRound,
};
