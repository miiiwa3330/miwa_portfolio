import { describe, expect, it } from "vitest";
import { KEYBOARD } from "./layout";
import { KEY_GAP, KEY_PITCH, KEYS_SHIFT_Z, keyboardExtent, keyboardKeys } from "./keyboard";

const keys = keyboardKeys();

describe("the keyboard's keys", () => {
  it("is a full-size board: well over a hundred keys is wrong, under eighty is a toy", () => {
    expect(keys.length).toBeGreaterThanOrEqual(100);
    expect(keys.length).toBeLessThanOrEqual(110);
  });

  it("sits inside the board with a margin on every side", () => {
    const margin = 0.008;
    for (const key of keys) {
      expect(key.x - key.w / 2).toBeGreaterThanOrEqual(-KEYBOARD.width / 2 + margin);
      expect(key.x + key.w / 2).toBeLessThanOrEqual(KEYBOARD.width / 2 - margin);
      expect(key.z - key.d / 2).toBeGreaterThanOrEqual(-KEYBOARD.depth / 2 + margin);
      expect(key.z + key.d / 2).toBeLessThanOrEqual(KEYBOARD.depth / 2 - margin);
    }
  });

  it("leaves more room in front for the wrists than behind", () => {
    const front = KEYBOARD.depth / 2 - Math.max(...keys.map((key) => key.z + key.d / 2));
    const back = Math.min(...keys.map((key) => key.z - key.d / 2)) + KEYBOARD.depth / 2;
    expect(front).toBeGreaterThan(back);
    expect(KEYS_SHIFT_Z).toBeLessThan(0);
  });

  it("has no two keys overlapping", () => {
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        const dx = Math.abs(keys[a].x - keys[b].x) - (keys[a].w + keys[b].w) / 2;
        const dz = Math.abs(keys[a].z - keys[b].z) - (keys[a].d + keys[b].d) / 2;
        // Overlap needs both axes to be inside the other's span.
        expect(dx >= -1e-9 || dz >= -1e-9, `keys ${a} and ${b} overlap`).toBe(true);
      }
    }
  });

  it("lines the rows up on the key pitch", () => {
    const rows = new Set(keys.map((key) => Math.round((key.z - KEYS_SHIFT_Z) * 1e6)));
    expect(rows.size).toBe(6);
    for (const key of keys) expect(key.d).toBeCloseTo(KEY_PITCH - KEY_GAP, 9);
  });

  it("makes the space bar the widest key, in the bottom row, where a real board has it (6.875u from the left)", () => {
    const widest = keys.reduce((best, key) => (key.w > best.w ? key : best));
    expect(widest.z).toBe(Math.max(...keys.map((key) => key.z)));
    expect(widest.w).toBeCloseTo(6.25 * KEY_PITCH - KEY_GAP, 9);
    expect(Math.abs(widest.x - (-keyboardExtent().width / 2 + 6.875 * KEY_PITCH))).toBeLessThan(1e-9);
  });

  it("marks only a few keys as accents", () => {
    const accents = keys.filter((key) => key.accent).length;
    expect(accents).toBeGreaterThan(0);
    expect(accents).toBeLessThanOrEqual(6);
  });
});
