/**
 * The PC's keyboard: a **HHKB Professional2** (PD-KB400WS, US layout, 60
 * keys, white), the user's choice (2026-10-22). Sizes are the maker's
 * (https://happyhackingkb.com/jp/products/discontinued/hhkb_protypes/):
 * 294 × 110 × 40 mm to the top of the keys, 19.05 mm pitch, 3.8 mm travel,
 * "cylindrical step sculpture" — every row's tops lean towards the middle.
 * The layout, colours and legends are read off `reference/4/キーボード１.png`.
 *
 * The keyboard's own frame: origin on the desk under the middle of the case,
 * +X to the right, +Y up, +Z towards the reader. The keys stand on a plate
 * tilted by `PLATE_TILT_DEG` (front low); a point on the plate is given in the
 * plate's frame and turned into the keyboard's by `plateToBoard`.
 */

export const HHKB = {
  width: 0.294,
  depth: 0.11,
  /** To the top of the highest key. */
  height: 0.04,
  pitch: 0.01905,
  travel: 0.0038,
} as const;

/**
 * **Provisional (仮)** shape values, not on the maker's page: the plate's
 * tilt (the case has three tilt settings, none published), and the key caps'
 * profile (Topre-style caps: about 18 mm at the foot, a 12–13 mm top).
 */
export const PLATE_TILT_DEG = 4;
export const CAP = {
  /** Between two neighbouring caps' feet. */
  footGap: 0.00105,
  /** How far the top is set in from the foot: each side, the back, the front. */
  taperSide: 0.0028,
  taperBack: 0.003,
  taperFront: 0.0022,
  /** How deep the cylindrical dish of a top is (the space bar's is shallower). */
  dish: 0.0006,
  dishWide: 0.0002,
} as const;

/**
 * The step sculpture, back row first: each row's cap height at the middle of
 * its top above the plate, and the top's lean (degrees, positive rising
 * towards the back, i.e. facing the reader). The rows above the home row face
 * the reader, the rows below it face away — "all towards the middle".
 * **Provisional (仮)** values; only their sum with the tilt is pinned, by the
 * 40 mm height (`plateBase`).
 */
export const ROW_PROFILE: readonly { height: number; lean: number }[] = [
  { height: 0.011, lean: 10 },
  { height: 0.0098, lean: 5 },
  { height: 0.0088, lean: 0 },
  { height: 0.0092, lean: -4 },
  { height: 0.0092, lean: -4 },
];

/** The case's rim round the keys: the sides and back as the photo shows them, the front lip the rest of the depth. */
const KEY_BLOCK_UNITS = 15;
export const KEY_BLOCK = {
  width: KEY_BLOCK_UNITS * HHKB.pitch,
  depth: 5 * HHKB.pitch,
  /** Back rim, taken equal to the side rims ((294 − 285.75) / 2 mm), as the photo's top corners show. */
  back: (HHKB.width - KEY_BLOCK_UNITS * HHKB.pitch) / 2,
} as const;

export type Legend = {
  /** The key's own label: a letter, a digit, a word. */
  main: string;
  /** Printed above `main`: the shifted character. */
  shift?: string;
  /** The Fn layer's label, printed small at the front right. */
  fn?: string;
};

type Spec = { id: string; u?: number; mod?: boolean; legend: Legend; codes?: string[] };
type Cell = Spec | { gap: number };

const letter = (c: string, fn?: string): Spec => ({ id: c.toLowerCase(), legend: { main: c, fn }, codes: [`Key${c}`] });
const pair = (id: string, shift: string, main: string, code: string, fn?: string): Spec => ({ id, legend: { main, shift, fn }, codes: [code] });

/** The board as the photo shows it, back row first. Gray (`mod`) keys are the ones the photo shows gray. */
const ROWS: Cell[][] = [
  [
    { id: "esc", mod: true, legend: { main: "Esc", fn: "Power" }, codes: ["Escape"] },
    pair("1", "!", "1", "Digit1", "F1"),
    pair("2", "@", "2", "Digit2", "F2"),
    pair("3", "#", "3", "Digit3", "F3"),
    pair("4", "$", "4", "Digit4", "F4"),
    pair("5", "%", "5", "Digit5", "F5"),
    pair("6", "^", "6", "Digit6", "F6"),
    pair("7", "&", "7", "Digit7", "F7"),
    pair("8", "*", "8", "Digit8", "F8"),
    pair("9", "(", "9", "Digit9", "F9"),
    pair("0", ")", "0", "Digit0", "F10"),
    pair("minus", "_", "-", "Minus", "F11"),
    pair("equal", "+", "=", "Equal", "F12"),
    { id: "backslash", legend: { main: "\\", shift: "|", fn: "Ins" }, codes: ["Backslash", "IntlYen"] },
    pair("backquote", "~", "`", "Backquote", "Del"),
  ],
  [
    { id: "tab", u: 1.5, mod: true, legend: { main: "Tab", fn: "Caps" }, codes: ["Tab"] },
    letter("Q"),
    letter("W"),
    letter("E"),
    letter("R"),
    letter("T"),
    letter("Y"),
    letter("U"),
    letter("I", "PSc"),
    letter("O", "ScrLk"),
    letter("P", "Pus"),
    pair("bracketleft", "{", "[", "BracketLeft", "↑"),
    pair("bracketright", "}", "]", "BracketRight"),
    { id: "delete", u: 1.5, mod: true, legend: { main: "Delete", fn: "BS" }, codes: ["Backspace"] },
  ],
  [
    { id: "control", u: 1.75, mod: true, legend: { main: "Control" }, codes: ["ControlLeft", "ControlRight", "CapsLock"] },
    letter("A", "Vol_Dn"),
    letter("S", "Vol_Up"),
    letter("D", "Mute"),
    letter("F", "Eject"),
    letter("G"),
    letter("H", "*"),
    letter("J", "/"),
    letter("K", "Home"),
    letter("L", "PgUp"),
    pair("semicolon", ":", ";", "Semicolon", "←"),
    pair("quote", '"', "'", "Quote", "→"),
    { id: "return", u: 2.25, mod: true, legend: { main: "Return", fn: "Enter" }, codes: ["Enter", "NumpadEnter"] },
  ],
  [
    { id: "shiftleft", u: 2.25, mod: true, legend: { main: "Shift" }, codes: ["ShiftLeft"] },
    letter("Z"),
    letter("X"),
    letter("C"),
    letter("V"),
    letter("B"),
    letter("N", "+"),
    letter("M", "−"),
    pair("comma", "<", ",", "Comma", "End"),
    pair("period", ">", ".", "Period", "PgDn"),
    pair("slash", "?", "/", "Slash", "↓"),
    { id: "shiftright", u: 1.75, mod: true, legend: { main: "Shift" }, codes: ["ShiftRight", "IntlRo"] },
    { id: "fn", mod: true, legend: { main: "Fn" } },
  ],
  [
    { gap: 1.5 },
    { id: "altleft", mod: true, legend: { main: "Alt", shift: "Opt" }, codes: ["AltLeft"] },
    { id: "metaleft", u: 1.5, mod: true, legend: { main: "◇", fn: "⌘" }, codes: ["MetaLeft", "Lang2"] },
    { id: "space", u: 6, legend: { main: "" }, codes: ["Space"] },
    { id: "metaright", u: 1.5, mod: true, legend: { main: "◇", fn: "⌘" }, codes: ["MetaRight", "Lang1"] },
    { id: "altright", mod: true, legend: { main: "Alt", shift: "Opt" }, codes: ["AltRight"] },
    // Wider than the left blank: the photo's logo sits here, under the right Shift and Fn.
    { gap: 2.5 },
  ],
];

/**
 * Keys a full keyboard has and the HHKB reaches with Fn: pressing one of
 * these on the reader's own keyboard presses Fn and the key that carries it
 * (the legends printed at the front of the caps).
 */
const FN_LAYER: Record<string, string> = {
  ArrowUp: "bracketleft",
  ArrowDown: "slash",
  ArrowLeft: "semicolon",
  ArrowRight: "quote",
  F1: "1",
  F2: "2",
  F3: "3",
  F4: "4",
  F5: "5",
  F6: "6",
  F7: "7",
  F8: "8",
  F9: "9",
  F10: "0",
  F11: "minus",
  F12: "equal",
  Insert: "backslash",
  Delete: "backquote",
  Home: "k",
  End: "comma",
  PageUp: "l",
  PageDown: "period",
  PrintScreen: "i",
  ScrollLock: "o",
  Pause: "p",
};

export type Key = {
  index: number;
  id: string;
  /** 0 is the back row. */
  row: number;
  units: number;
  mod: boolean;
  legend: Legend;
  /** Middle of the key's foot on the plate, in the plate's frame (x across, z towards the reader). */
  x: number;
  z: number;
};

/** Every key, in reading order. Built from `ROWS`, so a key's place is a fact of the table, not a typed coordinate. */
export function keyboardKeys(): Key[] {
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
        mod: !!cell.mod,
        legend: cell.legend,
        x: (u + units / 2 - KEY_BLOCK_UNITS / 2) * HHKB.pitch,
        z: -HHKB.depth / 2 + KEY_BLOCK.back + (r + 0.5) * HHKB.pitch,
      });
      u += units;
    }
  });
  return keys;
}

/** How wide each row runs, in key units, gaps included. */
export function rowUnits(): number[] {
  return ROWS.map((row) => row.reduce((sum, cell) => sum + ("gap" in cell ? cell.gap : (cell.u ?? 1)), 0));
}

const KEY_INDEX = new Map(keyboardKeys().map((key) => [key.id, key.index]));
const CODE_TO_KEY = new Map<string, number>();
for (const row of ROWS) for (const cell of row) if (!("gap" in cell)) for (const code of cell.codes ?? []) CODE_TO_KEY.set(code, KEY_INDEX.get(cell.id)!);

/** The number of keys (the length of the press array the shader reads). */
export const KEY_COUNT = KEY_INDEX.size;

/** The index of a key by its id. */
export function keyIndex(id: string): number {
  const index = KEY_INDEX.get(id);
  if (index === undefined) throw new Error(`no key ${id}`);
  return index;
}

/**
 * Which caps go down for a key on the reader's own keyboard (`KeyboardEvent.code`):
 * the key in the same place, or Fn with the key that carries the code on its
 * Fn layer (an arrow, F1–F12, Home, …). None for a code the board has no key for.
 */
export function keysForCode(code: string): number[] {
  const direct = CODE_TO_KEY.get(code);
  if (direct !== undefined) return [direct];
  const layered = FN_LAYER[code];
  if (layered !== undefined) return [keyIndex("fn"), keyIndex(layered)];
  return [];
}

/** A key's foot, in the plate's frame. */
export function capFoot(key: Key): { width: number; depth: number } {
  return { width: key.units * HHKB.pitch - CAP.footGap, depth: HHKB.pitch - CAP.footGap };
}

/** A key's top, in the plate's frame: its size, and the middle of it (z) relative to the foot's middle. */
export function capTop(key: Key): { width: number; depth: number; dz: number } {
  const foot = capFoot(key);
  const back = -foot.depth / 2 + CAP.taperBack;
  const front = foot.depth / 2 - CAP.taperFront;
  return { width: foot.width - 2 * CAP.taperSide, depth: front - back, dz: (back + front) / 2 };
}

/**
 * The height of a key's top above the plate at a point of the top (`u` across
 * from −½ to ½, `v` from the back −½ to the front ½): the row's height, its
 * lean, and the cylindrical dish.
 */
export function capTopHeight(key: Key, u: number, v: number): number {
  const { height, lean } = ROW_PROFILE[key.row];
  const top = capTop(key);
  const dish = key.units > 2.5 ? CAP.dishWide : CAP.dish;
  return height - Math.tan((lean * Math.PI) / 180) * v * top.depth - dish * (1 - 4 * u * u);
}

const TILT = (PLATE_TILT_DEG * Math.PI) / 180;

/** Plate's frame → keyboard's frame, with the plate's middle `base` above the desk. */
function tilt(p: readonly [number, number, number], base: number): [number, number, number] {
  const [x, y, z] = p;
  return [x, base + y * Math.cos(TILT) - z * Math.sin(TILT), y * Math.sin(TILT) + z * Math.cos(TILT)];
}

/**
 * How high the plate's middle stands over the desk: whatever puts the highest
 * point of any key top at the maker's 40 mm.
 */
export const plateBase: number = (() => {
  let highest = -Infinity;
  for (const key of keyboardKeys()) {
    const top = capTop(key);
    for (const u of [-0.5, 0, 0.5]) {
      for (const v of [-0.5, 0.5]) {
        const p = tilt([key.x + u * top.width, capTopHeight(key, u, v), key.z + top.dz + v * top.depth], 0);
        highest = Math.max(highest, p[1]);
      }
    }
  }
  return HHKB.height - highest;
})();

/** A point in the plate's frame, in the keyboard's. */
export function plateToBoard(p: readonly [number, number, number]): [number, number, number] {
  return tilt(p, plateBase);
}

/** Which way a key travels when pressed, in the keyboard's frame: down the plate's normal. */
export const PRESS_DIRECTION: readonly [number, number, number] = [0, -Math.cos(TILT), -Math.sin(TILT)];

/**
 * The height over the desk, at keyboard-frame depth `z`, of the plane lying
 * `offset` above the plate (negative below) — the case's rim and the tray's floor.
 */
export function planeHeightAt(z: number, offset: number): number {
  return plateBase + offset / Math.cos(TILT) - z * Math.tan(TILT);
}
