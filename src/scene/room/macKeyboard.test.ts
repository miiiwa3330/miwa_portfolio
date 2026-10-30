import { describe, expect, it } from "vitest";
import { M0110, MAC_CAPS, MAC_KEY_COUNT, macKeyForCode, macKeyboardKeys, macPlaneHeightAt, macRowUnits } from "./macKeyboard";

const KEYS = macKeyboardKeys();

describe("the M0110's layout", () => {
  it("has the 58 keys of the Macintosh 128K's keyboard, and no arrows", () => {
    expect(MAC_KEY_COUNT).toBe(58);
    expect(KEYS).toHaveLength(58);
    for (const code of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "F1", "Escape"]) expect(macKeyForCode(code)).toBeUndefined();
  });

  it("runs every row to the same 15 units", () => {
    for (const units of macRowUnits()) expect(units).toBeCloseTo(15, 12);
  });

  it("lays the bottom row out as the photo does: a blank, Option, ⌘, a 7.5-unit space bar, Enter, Option", () => {
    const bottom = KEYS.filter((k) => k.row === 4);
    expect(bottom.map((k) => k.id)).toEqual(["optionleft", "command", "space", "enter", "optionright"]);
    expect(bottom.map((k) => k.units)).toEqual([1.25, 1.5, 7.5, 1.75, 1.75]);
    // The blank: the left Option starts 1.25 units in, under the left Shift's middle.
    const option = bottom[0];
    expect(option.x - (option.units / 2) * M0110.pitch).toBeCloseTo(-M0110.block.width / 2 + 1.25 * M0110.pitch, 12);
  });

  it("tints only the space bar tan", () => {
    expect(KEYS.filter((k) => k.mod).map((k) => k.id)).toEqual(["space"]);
  });

  it("puts the key in the same place under the reader's keys", () => {
    expect(KEYS[macKeyForCode("KeyQ")!].id).toBe("q");
    expect(KEYS[macKeyForCode("Enter")!].id).toBe("return");
    expect(KEYS[macKeyForCode("MetaLeft")!].id).toBe("command");
  });

  it("keeps every cap inside the case and clear of its neighbours", () => {
    const halfW = M0110.width / 2;
    const halfD = M0110.depth / 2;
    for (const key of KEYS) {
      const foot = MAC_CAPS.capFoot(key);
      expect(Math.abs(key.x) + foot.width / 2).toBeLessThan(halfW);
      expect(Math.abs(key.z) + foot.depth / 2).toBeLessThan(halfD);
    }
    for (const a of KEYS)
      for (const b of KEYS) {
        if (a === b || a.row !== b.row) continue;
        const gap = Math.abs(a.x - b.x) - (MAC_CAPS.capFoot(a).width + MAC_CAPS.capFoot(b).width) / 2;
        expect(gap).toBeGreaterThan(0);
      }
  });

  it("tilts the plate front-low, and every cap stands over the case's floor", () => {
    expect(macPlaneHeightAt(M0110.depth / 2, 0)).toBeLessThan(macPlaneHeightAt(-M0110.depth / 2, 0));
    for (const key of KEYS) {
      const top = MAC_CAPS.capTop(key);
      const p = MAC_CAPS.toBoard([key.x, MAC_CAPS.capTopHeight(key, 0, 0), key.z + top.dz]);
      expect(p[1]).toBeGreaterThan(macPlaneHeightAt(p[2], 0.004));
      expect(p[1]).toBeLessThan(0.05);
    }
  });
});
