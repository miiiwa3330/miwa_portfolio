import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAP,
  HHKB,
  KEY_BLOCK,
  KEY_COUNT,
  PRESS_DIRECTION,
  capTop,
  capTopHeight,
  roundedRectOutline,
  KEY_SAMPLES,
  keySample,
  keySampleGroup,
  keySampleUrl,
  keyWear,
  trayOutline,
  keyIndex,
  keyboardKeys,
  keysForCode,
  planeHeightAt,
  plateBase,
  plateToBoard,
  rowUnits,
} from "./keyboard";

const keys = keyboardKeys();
const byId = (id: string) => keys[keyIndex(id)];

describe("the HHKB's layout", () => {
  it("has the maker's 60 keys", () => {
    expect(keys.length).toBe(60);
    expect(KEY_COUNT).toBe(60);
  });

  it("runs every row 15 units wide, gaps included", () => {
    expect(rowUnits()).toEqual([15, 15, 15, 15, 15]);
  });

  it("makes gray exactly the twelve keys the photo shows gray", () => {
    const gray = keys.filter((k) => k.mod).map((k) => k.id).sort();
    expect(gray).toEqual(
      ["esc", "tab", "delete", "control", "return", "shiftleft", "shiftright", "fn", "altleft", "metaleft", "metaright", "altright"].sort()
    );
  });

  it("puts Control where Caps Lock usually is, Delete over Return, and Fn at the right of the right Shift", () => {
    expect(byId("control").row).toBe(2);
    expect(byId("control").x).toBeLessThan(byId("a").x);
    expect(byId("delete").row).toBe(1);
    expect(byId("delete").x).toBeGreaterThan(byId("bracketright").x);
    expect(byId("fn").row).toBe(3);
    expect(byId("fn").x).toBeGreaterThan(byId("shiftright").x);
  });

  it("leaves the bottom row's right blank wider than its left, as the photo's logo needs", () => {
    const space = byId("space");
    const left = byId("altleft").x - byId("altleft").units / 2 * HHKB.pitch + KEY_BLOCK.width / 2;
    const right = KEY_BLOCK.width / 2 - (byId("altright").x + (byId("altright").units / 2) * HHKB.pitch);
    expect(left).toBeCloseTo(1.5 * HHKB.pitch, 9);
    expect(right).toBeCloseTo(2.5 * HHKB.pitch, 9);
    expect(space.units).toBe(6);
  });

  it("keeps every key inside the case, with the side rims equal to the back rim", () => {
    for (const key of keys) {
      const half = (key.units * HHKB.pitch) / 2;
      expect(key.x - half).toBeGreaterThanOrEqual(-HHKB.width / 2 + KEY_BLOCK.back - 1e-9);
      expect(key.x + half).toBeLessThanOrEqual(HHKB.width / 2 - KEY_BLOCK.back + 1e-9);
      expect(key.z - HHKB.pitch / 2).toBeGreaterThanOrEqual(-HHKB.depth / 2 + KEY_BLOCK.back - 1e-9);
      expect(key.z + HHKB.pitch / 2).toBeLessThanOrEqual(HHKB.depth / 2);
    }
    expect(KEY_BLOCK.back).toBeCloseTo((0.294 - 15 * 0.01905) / 2, 12);
  });

  it("has no two keys overlapping", () => {
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        if (keys[a].row !== keys[b].row) continue;
        const gap = Math.abs(keys[a].x - keys[b].x) - ((keys[a].units + keys[b].units) / 2) * HHKB.pitch;
        expect(gap, `${keys[a].id} / ${keys[b].id}`).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it("prints a legend on every key but the space bar", () => {
    for (const key of keys) if (key.id !== "space") expect(key.legend.main.length, key.id).toBeGreaterThan(0);
  });
});

describe("the reader's own keys", () => {
  it("press the key in the same place", () => {
    expect(keysForCode("KeyA")).toEqual([keyIndex("a")]);
    expect(keysForCode("Digit7")).toEqual([keyIndex("7")]);
    expect(keysForCode("Space")).toEqual([keyIndex("space")]);
    expect(keysForCode("Enter")).toEqual([keyIndex("return")]);
    expect(keysForCode("Backspace")).toEqual([keyIndex("delete")]);
    expect(keysForCode("CapsLock")).toEqual([keyIndex("control")]);
    expect(keysForCode("ShiftRight")).toEqual([keyIndex("shiftright")]);
    expect(keysForCode("MetaLeft")).toEqual([keyIndex("metaleft")]);
  });

  it("reach a key the HHKB lacks through Fn, as its legends print", () => {
    expect(keysForCode("ArrowUp")).toEqual([keyIndex("fn"), keyIndex("bracketleft")]);
    expect(keysForCode("ArrowLeft")).toEqual([keyIndex("fn"), keyIndex("semicolon")]);
    expect(keysForCode("ArrowRight")).toEqual([keyIndex("fn"), keyIndex("quote")]);
    expect(keysForCode("ArrowDown")).toEqual([keyIndex("fn"), keyIndex("slash")]);
    expect(keysForCode("F1")).toEqual([keyIndex("fn"), keyIndex("1")]);
    expect(keysForCode("F12")).toEqual([keyIndex("fn"), keyIndex("equal")]);
    expect(keysForCode("Delete")).toEqual([keyIndex("fn"), keyIndex("backquote")]);
  });

  it("map a Japanese keyboard's own keys to the nearest place", () => {
    expect(keysForCode("IntlYen")).toEqual([keyIndex("backslash")]);
    expect(keysForCode("Lang2")).toEqual([keyIndex("metaleft")]);
    expect(keysForCode("Lang1")).toEqual([keyIndex("metaright")]);
  });

  it("press nothing for a code the board has no key for", () => {
    expect(keysForCode("NumpadMultiply")).toEqual([]);
    expect(keysForCode("")).toEqual([]);
  });

  it("can be pressed every one of them from the reader's keyboard, except Fn which no browser reports", () => {
    const reachable = new Set<number>();
    const codes = [
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => `Key${c}`),
      ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
      "Escape", "Minus", "Equal", "Backslash", "Backquote", "Tab", "BracketLeft", "BracketRight", "Backspace",
      "ControlLeft", "Semicolon", "Quote", "Enter", "ShiftLeft", "Comma", "Period", "Slash", "ShiftRight",
      "AltLeft", "MetaLeft", "Space", "MetaRight", "AltRight", "ArrowUp",
    ];
    for (const code of codes) for (const i of keysForCode(code)) reachable.add(i);
    expect(reachable.size).toBe(60);
  });
});

describe("the HHKB's shape", () => {
  const tops = keys.flatMap((key) => {
    const top = capTop(key);
    return [-0.5, 0, 0.5].flatMap((u) =>
      [-0.5, 0.5].map((v) => plateToBoard([key.x + u * top.width, capTopHeight(key, u, v), key.z + top.dz + v * top.depth]))
    );
  });

  it("stands exactly the maker's 40 mm to the top of the highest key", () => {
    expect(Math.max(...tops.map((p) => p[1]))).toBeCloseTo(HHKB.height, 9);
  });

  it("is highest at the back: the number row's tops stand over the bottom row's", () => {
    const rowTop = (row: number) => Math.max(...keys.filter((k) => k.row === row).map((k) => plateToBoard([k.x, capTopHeight(k, 0, 0), k.z])[1]));
    for (let row = 1; row < 5; row++) expect(rowTop(row - 1)).toBeGreaterThan(rowTop(row));
  });

  it("leans the rows' tops towards the home row (cylindrical step sculpture)", () => {
    const lean = (id: string) => {
      const key = byId(id);
      return capTopHeight(key, 0, -0.5) - capTopHeight(key, 0, 0.5); // back minus front, on the plate
    };
    expect(lean("q")).toBeGreaterThan(0); // above home: rises to the back, faces the reader
    expect(lean("a")).toBeCloseTo(0, 9); // home row: level on the plate
    expect(lean("z")).toBeLessThan(0); // below home: rises to the front
  });

  it("dishes every top: lower in the middle than at its sides", () => {
    for (const key of keys) expect(capTopHeight(key, 0, 0), key.id).toBeLessThan(capTopHeight(key, 0.5, 0));
  });

  it("sets each top in from its foot, so the caps taper", () => {
    for (const key of keys) {
      const top = capTop(key);
      expect(top.width).toBeCloseTo(key.units * HHKB.pitch - CAP.footGap - 2 * CAP.taperSide, 12);
      expect(top.depth).toBeLessThan(HHKB.pitch - CAP.footGap);
    }
  });

  it("keeps the plate above the desk and the key tops under the seated hands (0.82 m on a 0.775 m desk)", () => {
    expect(planeHeightAt(HHKB.depth / 2, 0)).toBeGreaterThan(0);
    expect(plateBase + 0.775).toBeLessThan(0.82);
    expect(HHKB.height + 0.775).toBeLessThan(0.82);
  });

  it("travels the maker's 3.8 mm down the plate's normal, which leans towards the reader", () => {
    expect(HHKB.travel).toBe(0.0038);
    expect(Math.hypot(...PRESS_DIRECTION)).toBeCloseTo(1, 12);
    expect(PRESS_DIRECTION[1]).toBeLessThan(0);
    expect(PRESS_DIRECTION[2]).toBeLessThan(0);
  });

  it("puts a plane parallel to the plate where the tilt says", () => {
    // A point 3 mm over the plate, wherever it is along the plate, lies on the plane 3 mm over it.
    for (const along of [-0.05, 0, 0.04]) {
      const p = plateToBoard([0, 0.003, along]);
      expect(planeHeightAt(p[2], 0.003)).toBeCloseTo(p[1], 12);
    }
  });
});

describe("wear", () => {
  it("is the English letter frequency for letters, with e the most worn and z the least", () => {
    expect(keyWear(byId("e"))).toBe(1);
    const order = "etaoinshrdlcumwfgypbvkjxqz".split("").map((c) => keyWear(byId(c)));
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeLessThanOrEqual(order[i - 1]);
    expect(keyWear(byId("z"))).toBeCloseTo(0.07 / 12.7, 9);
  });

  it("gives every key some wear between 0 and 1, the space bar the most", () => {
    for (const key of keys) {
      expect(keyWear(key), key.id).toBeGreaterThan(0);
      expect(keyWear(key), key.id).toBeLessThanOrEqual(1);
    }
    expect(keyWear(byId("space"))).toBe(1);
  });
});

describe("the keys' recorded sound", () => {
  it("plays the low-bodied presses on the wide keys and the others on the rest", () => {
    for (const id of ["space", "return", "shiftleft", "shiftright", "control"]) expect(keySampleGroup(byId(id)), id).toBe("heavy");
    for (const id of ["a", "q", "1", "tab", "delete", "esc", "fn", "metaleft"]) expect(keySampleGroup(byId(id)), id).toBe("letter");
  });

  it("does not repeat a clip on the same key pressed twice running", () => {
    for (const key of keys) {
      for (let strike = 0; strike < 20; strike++) expect(keySample(key, strike + 1).n, key.id).not.toBe(keySample(key, strike).n);
    }
  });

  it("uses every clip of a group, and only clips that exist", () => {
    for (const group of ["letter", "heavy"] as const) {
      const key = keys.find((k) => keySampleGroup(k) === group)!;
      const used = new Set(Array.from({ length: 40 }, (_, i) => keySample(key, i).n));
      expect([...used].sort((a, b) => a - b)).toEqual(Array.from({ length: KEY_SAMPLES[group] }, (_, i) => i + 1));
    }
  });

  it("serves every clip it can ask for, both ways, from public/", () => {
    for (const group of ["letter", "heavy"] as const) {
      for (let n = 1; n <= KEY_SAMPLES[group]; n++) {
        for (const part of ["down", "up"] as const) {
          const url = keySampleUrl({ group, n }, part);
          expect(existsSync(join(process.cwd(), "public", url)), url).toBe(true);
        }
      }
    }
    expect(keySampleUrl({ group: "letter", n: 3 }, "up")).toBe("/sounds/keyboard/letter-03-up.mp3");
  });

  it("serves no clip it never asks for", () => {
    const asked = new Set<string>();
    for (const group of ["letter", "heavy"] as const) for (let n = 1; n <= KEY_SAMPLES[group]; n++) for (const part of ["down", "up"] as const) asked.add(keySampleUrl({ group, n }, part).split("/").pop()!);
    const served = readdirSync(join(process.cwd(), "public", "sounds", "keyboard")).filter((f) => f.endsWith(".mp3"));
    expect(served.sort()).toEqual([...asked].sort());
  });
});

describe("the tray's outline", () => {
  const tray = trayOutline();
  const inside = (poly: readonly [number, number][], x: number, z: number) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i];
      const [xj, zj] = poly[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const board = (x: number, z: number) => {
    const p = plateToBoard([x, 0, z]);
    return [p[0], p[2]] as const;
  };

  it("holds every key's foot", () => {
    for (const key of keys) {
      const half = (key.units * HHKB.pitch - CAP.footGap) / 2;
      const depth = (HHKB.pitch - CAP.footGap) / 2;
      for (const [dx, dz] of [[-half, -depth], [half, -depth], [half, depth], [-half, depth]]) {
        expect(inside(tray, ...board(key.x + dx, key.z + dz)), key.id).toBe(true);
      }
    }
  });

  it("leaves out the bottom row's two blanks, which the case fills", () => {
    const bottom = byId("space").z;
    expect(inside(tray, ...board(-KEY_BLOCK.width / 2 + 0.75 * HHKB.pitch, bottom))).toBe(false);
    expect(inside(tray, ...board(KEY_BLOCK.width / 2 - 1.25 * HHKB.pitch, bottom))).toBe(false);
  });
});

describe("a rounded outline", () => {
  const outline = roundedRectOutline(0.294, 0.11, 0.006, 4);

  it("goes round all four corners, each in arcSteps segments", () => {
    expect(outline.length).toBe(4 * 5);
  });

  it("stays on the rectangle's bounds, touching each side", () => {
    const xs = outline.map((p) => p.x);
    const zs = outline.map((p) => p.z);
    expect(Math.min(...xs)).toBeCloseTo(-0.147, 12);
    expect(Math.max(...xs)).toBeCloseTo(0.147, 12);
    expect(Math.min(...zs)).toBeCloseTo(-0.055, 12);
    expect(Math.max(...zs)).toBeCloseTo(0.055, 12);
  });

  it("points every normal outwards, at unit length", () => {
    for (const p of outline) {
      expect(Math.hypot(p.nx, p.nz)).toBeCloseTo(1, 12);
      expect(p.x * p.nx + p.z * p.nz).toBeGreaterThan(0);
    }
  });

  it("lines up with the outline one radius-step smaller: point for point, along the normal", () => {
    const by = 0.0015;
    const inner = roundedRectOutline(0.294 - 2 * by, 0.11 - 2 * by, 0.006 - by, 4);
    outline.forEach((p, i) => {
      expect(inner[i].x).toBeCloseTo(p.x - by * p.nx, 12);
      expect(inner[i].z).toBeCloseTo(p.z - by * p.nz, 12);
    });
  });
});

