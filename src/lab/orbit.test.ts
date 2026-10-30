import { describe, expect, it } from "vitest";
import { eyeFrom, numberParam, viewFrom, viewParams } from "./orbit";

const target = [1, 2, -3] as const;

describe("the lab's orbit view", () => {
  it("puts the eye on the target's +Z side at az 0, level at el 0", () => {
    const eye = eyeFrom(target, { az: 0, el: 0, d: 2 });
    expect(eye[0]).toBeCloseTo(1, 9);
    expect(eye[1]).toBeCloseTo(2, 9);
    expect(eye[2]).toBeCloseTo(-1, 9);
  });

  it("moves the eye to the target's +X side at az 90, and straight up at el 90", () => {
    const side = eyeFrom(target, { az: 90, el: 0, d: 1 });
    expect(side[0]).toBeCloseTo(2, 9);
    expect(side[2]).toBeCloseTo(-3, 9);
    const above = eyeFrom(target, { az: 0, el: 90, d: 1 });
    expect(above[1]).toBeCloseTo(3, 9);
    expect(above[0]).toBeCloseTo(1, 9);
  });

  it("keeps the eye d metres from the target at any angle", () => {
    for (const az of [-170, -45, 0, 33, 120]) {
      for (const el of [-60, 0, 25, 80]) {
        const eye = eyeFrom(target, { az, el, d: 1.7 });
        expect(Math.hypot(eye[0] - 1, eye[1] - 2, eye[2] + 3)).toBeCloseTo(1.7, 9);
      }
    }
  });

  it("gives back the view an eye was made from", () => {
    for (const view of [
      { az: 0, el: 0, d: 1 },
      { az: -135, el: 20, d: 0.4 },
      { az: 170, el: -30, d: 3 },
      { az: 60, el: 75, d: 0.9 },
    ]) {
      const back = viewFrom(target, eyeFrom(target, view));
      expect(back.az).toBeCloseTo(view.az, 6);
      expect(back.el).toBeCloseTo(view.el, 6);
      expect(back.d).toBeCloseTo(view.d, 9);
    }
  });

  it("survives an eye exactly on the target", () => {
    expect(viewFrom(target, target)).toEqual({ az: 0, el: 0, d: 0 });
  });

  it("reads a URL number, and falls back on anything that is not one", () => {
    expect(numberParam("12.5", 3)).toBe(12.5);
    expect(numberParam("-40", 3)).toBe(-40);
    expect(numberParam(null, 3)).toBe(3);
    expect(numberParam("", 3)).toBe(3);
    expect(numberParam("  ", 3)).toBe(3);
    expect(numberParam("abc", 3)).toBe(3);
    expect(numberParam("Infinity", 3)).toBe(3);
  });

  it("writes a view in a short form that reads back to the same picture", () => {
    const params = viewParams({ az: 33.3333, el: -12.3456, d: 0.87654 });
    expect(params).toEqual({ az: "33.3", el: "-12.3", d: "0.877" });
    expect(numberParam(params.d, 0)).toBeCloseTo(0.877, 9);
  });
});
