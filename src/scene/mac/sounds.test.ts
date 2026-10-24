import { describe, expect, it } from "vitest";
import { MAC_SOUNDS, soundLength, type MacSound } from "./sounds";

const ALL = Object.keys(MAC_SOUNDS) as MacSound[];

describe("the Mac's sounds", () => {
  it("are short: a bounce or a click a few hundredths of a second, the longest under a second", () => {
    for (const sound of ALL) {
      expect(MAC_SOUNDS[sound].length).toBeGreaterThan(0);
      expect(soundLength(sound)).toBeLessThan(1000);
    }
    for (const sound of ["wall", "paddle", "brick", "open"] as const) expect(soundLength(sound)).toBeLessThanOrEqual(40);
  });

  it("are tones the ear hears well, or noise for the mine", () => {
    for (const sound of ALL) for (const note of MAC_SOUNDS[sound]) expect(note.hz === 0 || (note.hz >= 100 && note.hz <= 2000)).toBe(true);
    expect(MAC_SOUNDS.boom.every((n) => n.hz === 0)).toBe(true);
  });

  it("go down for a game over and a missed ball, and up for a win and a bite", () => {
    const falls = (s: MacSound) => MAC_SOUNDS[s].every((n, i, a) => i === 0 || n.hz < a[i - 1].hz);
    const rises = (s: MacSound) => MAC_SOUNDS[s].every((n, i, a) => i === 0 || n.hz > a[i - 1].hz);
    expect(falls("over")).toBe(true);
    expect(falls("miss")).toBe(true);
    expect(rises("win")).toBe(true);
    expect(rises("eat")).toBe(true);
  });

  it("sound each thing a game does differently from the others it is heard with", () => {
    const pitch = (s: MacSound) => MAC_SOUNDS[s][0].hz;
    expect(new Set([pitch("wall"), pitch("paddle"), pitch("brick")]).size).toBe(3);
    expect(pitch("open")).not.toBe(pitch("flag"));
  });
});
