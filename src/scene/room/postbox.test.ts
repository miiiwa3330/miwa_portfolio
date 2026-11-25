import { describe, expect, it } from "vitest";
import { PIECES } from "./layout";
import {
  LETTER_SET,
  POSTBOX_BODY,
  POSTBOX_LEG,
  POSTBOX_SLOTS,
  POSTBOX_TOP_Y,
  rotatedFootprintHalfExtents,
} from "./postbox";

describe("Japanese Type-13 postbox specifications", () => {
  it("fits cleanly inside the comms piece footprint", () => {
    const comms = PIECES.comms;
    expect(POSTBOX_BODY.width).toBeLessThanOrEqual(comms.width);
    expect(POSTBOX_BODY.depth).toBeLessThanOrEqual(comms.depth);
    expect(POSTBOX_LEG.baseWidth).toBeLessThanOrEqual(POSTBOX_BODY.width);
    expect(POSTBOX_LEG.baseDepth).toBeLessThanOrEqual(POSTBOX_BODY.depth);
    expect(POSTBOX_TOP_Y).toBeCloseTo(1.16, 6);
  });

  it("places both mail slots inside the front face without overlapping", () => {
    expect(POSTBOX_SLOTS).toHaveLength(2);
    const [left, right] = POSTBOX_SLOTS;
    expect(left.width).toBeCloseTo(0.255, 6);
    expect(left.height).toBeCloseTo(0.038, 6);
    expect(right.width).toBeCloseTo(0.255, 6);
    expect(right.height).toBeCloseTo(0.038, 6);

    for (const slot of POSTBOX_SLOTS) {
      expect(Math.abs(slot.x) + slot.width / 2).toBeLessThan(POSTBOX_BODY.width / 2);
      expect(slot.y + slot.height / 2).toBeLessThan(POSTBOX_TOP_Y);
      expect(slot.y - slot.height / 2).toBeGreaterThan(POSTBOX_LEG.height);
    }
    expect(left.x + left.width / 2).toBeLessThan(right.x - right.width / 2);
  });

  it("keeps every letter, envelope, and pencil element safely inside the flat roof surface", () => {
    const maxW = POSTBOX_BODY.width / 2 - POSTBOX_BODY.cornerRadius;
    const maxD = POSTBOX_BODY.depth / 2 - POSTBOX_BODY.cornerRadius;

    for (const item of [LETTER_SET.underPaper, LETTER_SET.topPaper, LETTER_SET.envelope]) {
      const [hx, hz] = rotatedFootprintHalfExtents(item.width, item.depth, item.yaw);
      expect(Math.abs(item.x) + hx).toBeLessThanOrEqual(maxW);
      expect(Math.abs(item.z) + hz).toBeLessThanOrEqual(maxD);
    }

    const [px, pz] = rotatedFootprintHalfExtents(
      LETTER_SET.pencil.length,
      LETTER_SET.pencil.radius * 2,
      LETTER_SET.pencil.yaw
    );
    expect(Math.abs(LETTER_SET.pencil.x) + px).toBeLessThanOrEqual(maxW);
    expect(Math.abs(LETTER_SET.pencil.z) + pz).toBeLessThanOrEqual(maxD);
  });
});
