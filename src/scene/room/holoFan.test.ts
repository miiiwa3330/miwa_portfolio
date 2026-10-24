import { describe, expect, it } from "vitest";
import { HOLO_FAN, STANDARD_HFOV, holoFanPlace, seatedEyeOnDesk } from "./layout";
import { BLADES, CLOCK, LED_RINGS, PICTURE_RINGS, bladeAngle, clockEmPx, clockGlyphs, clockReach, clockSway, clockText } from "./holoFan";

describe("clockText", () => {
  it("shows 24-hour HH:MM:SS, padded, by the reader's own clock", () => {
    // Off UTC, so reading the UTC clock instead of the local one shows.
    const zone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      expect(clockText(new Date(2026, 9, 25, 9, 5, 7))).toBe("09:05:07");
    } finally {
      process.env.TZ = zone;
    }
    expect(clockText(new Date(2026, 9, 25, 9, 5, 7))).toBe("09:05:07");
    expect(clockText(new Date(2026, 9, 25, 23, 59, 59))).toBe("23:59:59");
    expect(clockText(new Date(2026, 9, 26, 0, 0, 0))).toBe("00:00:00");
    expect(clockText(new Date(2026, 9, 25, 13, 40, 0))).toBe("13:40:00");
  });
});

describe("clockSway", () => {
  it("swings either way, no further than its amplitude, and comes round again", () => {
    const { amplitude, period } = CLOCK.sway;
    expect(clockSway(0)).toBeCloseTo(0, 12);
    expect(clockSway(period / 4)).toBeCloseTo(amplitude, 12);
    expect(clockSway((3 * period) / 4)).toBeCloseTo(-amplitude, 12);
    for (let t = 0; t < 30; t += 0.37) {
      expect(Math.abs(clockSway(t))).toBeLessThanOrEqual(amplitude + 1e-12);
      expect(clockSway(t + period)).toBeCloseTo(clockSway(t), 9);
    }
  });
});

describe("clockGlyphs", () => {
  const text = "12:34:56";

  it("lays the characters out left to right, centred on the fan's middle", () => {
    const glyphs = clockGlyphs(text, 0);
    expect(glyphs.map((g) => g.char).join("")).toBe(text);
    for (let i = 1; i < glyphs.length; i++) expect(glyphs[i].front.x).toBeGreaterThan(glyphs[i - 1].front.x);
    expect(glyphs[0].front.x).toBeCloseTo(-glyphs[glyphs.length - 1].front.x, 9);
  });

  it("shows the figures' tops even head-on: each back face sits above its front", () => {
    for (const g of clockGlyphs(text, 0)) expect(g.front.y - g.back.y).toBeGreaterThan(0.05);
  });

  it("shows their sides when turned: every back slips out to the same side, the other side when turned back", () => {
    const amplitude = CLOCK.sway.amplitude;
    for (const g of clockGlyphs(text, amplitude)) expect(g.back.x - g.front.x).toBeLessThan(-0.05);
    for (const g of clockGlyphs(text, -amplitude)) expect(g.back.x - g.front.x).toBeGreaterThan(0.05);
  });

  it("draws the end turned nearer larger, and squeezes the figures across as they turn", () => {
    const glyphs = clockGlyphs(text, CLOCK.sway.amplitude);
    expect(glyphs[0].front.sy).toBeGreaterThan(glyphs[glyphs.length - 1].front.sy * 1.1);
    const headOn = clockGlyphs(text, 0)[3].front;
    const turned = glyphs[3].front;
    expect(turned.sx / turned.sy).toBeLessThan((headOn.sx / headOn.sy) * 0.9);
  });
});

describe("the clock's size in the fan", () => {
  const radius = HOLO_FAN.px / 2;
  const turns = Array.from({ length: 41 }, (_, i) => CLOCK.sway.amplitude * (i / 20 - 1));

  it("keeps every corner inside the picture's circle over the whole sway, for any time", () => {
    for (const text of ["00:00:00", "12:34:56", "23:59:59"])
      for (const turn of turns) expect(clockReach(text, turn) * clockEmPx()).toBeLessThanOrEqual(radius * CLOCK.fill + 1e-9);
  });

  it("is as large as that lets it be", () => {
    const widest = Math.max(...turns.map((turn) => clockReach("12:34:56", turn) * clockEmPx()));
    expect(widest).toBeGreaterThan(radius * CLOCK.fill * 0.99);
    // About a sixth of the picture tall: readable from the seat.
    expect((2 * CLOCK.halfHeight * clockEmPx()) / HOLO_FAN.px).toBeGreaterThan(0.12);
  });

  it("is drawn in coarser rings than the real fan's, so they show from the seat, yet the figures stay readable", () => {
    expect(LED_RINGS).toBe(128);
    expect(PICTURE_RINGS).toBeLessThan(LED_RINGS / 2);
    // From the seat, on a 1440 px wide screen at the standard 67°: each ring at least 3 px.
    const eye = seatedEyeOnDesk();
    const fan = holoFanPlace().centre;
    const distance = Math.hypot(...[0, 1, 2].map((i) => fan[i] - eye[i]));
    const pxPerRadian = 720 / Math.tan((STANDARD_HFOV / 2) * (Math.PI / 180));
    expect((HOLO_FAN.sweep / 2 / PICTURE_RINGS / distance) * pxPerRadian).toBeGreaterThan(3);
    // A figure still stands at least 7 rings tall.
    const figure = (2 * CLOCK.halfHeight * clockEmPx()) / (HOLO_FAN.px / 2);
    expect(figure * PICTURE_RINGS).toBeGreaterThan(7);
  });
});

describe("the blades as they are seen", () => {
  it("go round anticlockwise, slowly enough to follow — not at the real 800 rpm", () => {
    // A small step forward turns the blade on a little, the same way each time.
    for (let t = 0; t < 5; t += 0.13) {
      const step = (bladeAngle(t + 0.01) - bladeAngle(t) + 2 * Math.PI) % (2 * Math.PI);
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(0.2);
    }
    // At 800 rpm a frame at 60 a second would catch the bar 80° on: noise, not a turn.
    const perFrame = (2 * Math.PI * BLADES.apparentRate) / 60;
    expect(perFrame).toBeLessThan(0.25);
    expect(perFrame).toBeGreaterThan(0.05);
  });

  it("keeps the angle in one turn", () => {
    for (const t of [0, 0.3, 7.9, 123.4, 1e5]) {
      expect(bladeAngle(t)).toBeGreaterThanOrEqual(0);
      expect(bladeAngle(t)).toBeLessThan(2 * Math.PI);
    }
  });
});
