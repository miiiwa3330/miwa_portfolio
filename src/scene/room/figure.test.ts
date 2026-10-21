import { describe, expect, it } from "vitest";
import { FIGURE, SHEET, STATURE, seatedHipsFromEye } from "./figure";
import { CHAIR_BACK_BEHIND_EYE, CHAIR_SEAT_TOP, EYE_HEIGHT, SEATED_EYE_HEIGHT, STANDARD_HFOV, zoomView } from "./layout";
import { SHIN, THIGH, bodyJoints } from "./self";
import { poseFromView } from "../camera/roomCamera";

describe("the figure, measured off the character sheet", () => {
  it("is 168 cm, with the sheet's head: about 5.8 heads tall", () => {
    expect(STATURE).toBe(1.68);
    const head = STATURE - FIGURE.chin;
    expect(STATURE / head).toBeGreaterThan(5.6);
    expect(STATURE / head).toBeLessThan(6.0);
  });

  it("puts the reader's eye — the camera — where the sheet puts the figure's: 1.49 m", () => {
    expect(EYE_HEIGHT).toBe(FIGURE.eye);
    // The sheet: eyes 316 of 356 px up from the ground.
    expect(FIGURE.eye).toBeCloseTo((1.68 * (SHEET.ground - 525)) / (SHEET.ground - 485), 9);
    expect(FIGURE.eye).toBeCloseTo(1.49, 2);
  });

  it("stands on its legs: knees soft but not bent, the leg a hair longer than the hips are high", () => {
    const slack = THIGH + SHIN - FIGURE.hip;
    expect(slack).toBeGreaterThan(0);
    expect(slack).toBeLessThan(0.03);
  });

  it("goes in order down the body: eye, chin, neck, shoulders, waist, hips, crotch", () => {
    const order = [FIGURE.eye, FIGURE.chin, FIGURE.neckBase, FIGURE.shoulder, FIGURE.waist, FIGURE.hip, FIGURE.crotch];
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeLessThan(order[i - 1]);
  });
});

describe("sitting at the PC, on a chair the figure fits", () => {
  const seated = bodyJoints(poseFromView(zoomView("desk"), { hfov: STANDARD_HFOV, lens: 1, share: 0, lift: 0 }));

  it("has a seat the lower legs reach: the knees at or over the cushion, the feet on the floor", () => {
    for (const knee of seated.knees) expect(knee[1]).toBeGreaterThan(CHAIR_SEAT_TOP - 0.01);
    for (const foot of seated.feet) expect(foot[1]).toBe(0);
    // An ordinary chair's height for a 168 cm figure, not a bar stool or a floor cushion.
    expect(CHAIR_SEAT_TOP).toBeGreaterThan(0.36);
    expect(CHAIR_SEAT_TOP).toBeLessThan(0.46);
  });

  it("leans in a little rather than hunching: the eye stays over the body", () => {
    const { back } = seatedHipsFromEye();
    expect(back).toBeLessThan(0.25);
    expect(seated.lean).toBeGreaterThan(0);
    expect(seated.lean).toBeLessThan((20 * Math.PI) / 180);
    // The chair's back stands behind the leaning body's back.
    expect(CHAIR_BACK_BEHIND_EYE).toBeGreaterThan(back + 0.08);
    expect(SEATED_EYE_HEIGHT).toBeLessThan(EYE_HEIGHT);
  });
});
