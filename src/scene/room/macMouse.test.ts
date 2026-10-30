import { describe, expect, it } from "vitest";
import { M0100, M0100_BUTTON, M0100_CORD, M0100_MARK, M0100_SHAPE, M0100_TOP, M0100_TRAVEL, macMouseCord, macMouseCordGuide, onMacButton } from "./macMouse";
import { DESK_MAT, DESK_TOP_Y, MAC, MAC_MOUSE, macToDesk } from "./layout";
import { MAC_BACK } from "./macCase";

const S = M0100_SHAPE;
/** The flat top's edges, in the mouse's frame (front is −Z). */
const top = {
  left: -M0100_TOP.width / 2,
  right: M0100_TOP.width / 2,
  front: M0100_TOP.z - M0100_TOP.length / 2,
  back: M0100_TOP.z + M0100_TOP.length / 2,
};

describe("the M0100's shape (photos 9 and 6)", () => {
  it("stands its walls most of the way up and slopes in the rest to a flat top inside its footprint", () => {
    expect(S.parting.to).toBeLessThan(S.shoulder);
    expect(S.shoulder).toBeLessThan(M0100.height);
    expect(top.left).toBeGreaterThan(-M0100.width / 2);
    expect(top.front).toBeGreaterThan(-M0100.length / 2);
    expect(top.back).toBeLessThan(M0100.length / 2);
  });

  it("slopes steeply at the sides and the front, and long and low at the back, where the palm rests", () => {
    const rise = M0100.height - S.shoulder;
    expect(rise / S.inset.side).toBeGreaterThan(1);
    expect(rise / S.inset.front).toBeGreaterThan(1);
    expect(rise / S.inset.back).toBeLessThan(0.5);
    // The top's middle is forward of the mouse's.
    expect(M0100_TOP.z).toBeLessThan(-0.005);
  });

  it("sets the button on the flat top at its front: a strip of the top before it, and some either side", () => {
    const front = M0100_BUTTON.z - M0100_BUTTON.length / 2;
    const back = M0100_BUTTON.z + M0100_BUTTON.length / 2;
    expect(front - top.front).toBeGreaterThan(0.004);
    expect(front - top.front).toBeLessThan(0.006);
    expect(top.right - M0100_BUTTON.width / 2).toBeGreaterThan(0.004);
    expect(back).toBeLessThan(top.back);
    // Wider than long, about two thirds of the top's width.
    expect(M0100_BUTTON.width).toBeGreaterThan(1.5 * M0100_BUTTON.length);
    expect(M0100_BUTTON.width / M0100_TOP.width).toBeGreaterThan(0.7);
    expect(M0100_BUTTON.width / M0100_TOP.width).toBeLessThan(0.8);
  });

  it("sinks the mark in the top's back left, clear of the button", () => {
    const half = M0100_MARK.size / 2;
    expect(M0100_MARK.x - half).toBeGreaterThan(top.left);
    expect(M0100_MARK.x + half).toBeLessThan(0);
    expect(M0100_MARK.z + half).toBeLessThan(top.back);
    expect(M0100_MARK.z - half).toBeGreaterThan(M0100_BUTTON.z + M0100_BUTTON.length / 2);
  });

  it("presses the button only on the button", () => {
    expect(onMacButton(0, M0100_BUTTON.z)).toBe(true);
    expect(onMacButton(M0100_BUTTON.width / 2 - 0.001, M0100_BUTTON.z + M0100_BUTTON.length / 2 - 0.001)).toBe(true);
    expect(onMacButton(M0100_BUTTON.width / 2 + 0.001, M0100_BUTTON.z)).toBe(false);
    expect(onMacButton(0, M0100_BUTTON.z + M0100_BUTTON.length / 2 + 0.001)).toBe(false);
    expect(onMacButton(M0100_MARK.x, M0100_MARK.z)).toBe(false);
  });
});

describe("the M0100's cord", () => {
  const port = macToDesk([MAC_BACK.ports.at[0], MAC_BACK.ports.y, -MAC.depth / 2]);
  const corners: [number, number][] = [
    [-M0100_TRAVEL.width / 2, -M0100_TRAVEL.depth / 2],
    [M0100_TRAVEL.width / 2, M0100_TRAVEL.depth / 2],
  ];

  it("leaves the mouse's front wherever the mouse has slid to, and ends in the Mac's mouse port", () => {
    for (const at of corners) {
      const cord = macMouseCord(at, at);
      expect(cord[0][1]).toBeCloseTo(MAC_MOUSE.y + 0.012, 12);
      expect(cord[0][0]).toBeCloseTo(MAC_MOUSE.x + at[0], 12);
      expect(cord[0][2]).toBeCloseTo(MAC_MOUSE.z + at[1] - M0100.length / 2, 12);
      expect(cord[cord.length - 1]).toEqual(port);
    }
  });

  it("rests on the desk and on the mat, never sinking into either, wherever the mouse is", () => {
    const onMat = (x: number, z: number) => Math.abs(x - DESK_MAT.x) <= DESK_MAT.width / 2 && Math.abs(z - DESK_MAT.z) <= DESK_MAT.depth / 2;
    let matPoints = 0;
    let deskPoints = 0;
    for (const at of [[0, 0] as [number, number], ...corners])
      for (const trail of [[0, 0] as [number, number], at]) {
        for (const [x, y, z] of macMouseCord(at, trail)) {
          const under = DESK_TOP_Y + (onMat(x, z) ? DESK_MAT.thickness : 0);
          expect(y - M0100_CORD.wire).toBeGreaterThanOrEqual(under - 1e-12);
          if (onMat(x, z)) matPoints++;
          else deskPoints++;
        }
      }
    // It does cross both, and lies on them rather than floating over them.
    expect(matPoints).toBeGreaterThan(0);
    expect(deskPoints).toBeGreaterThan(0);
    const lying = macMouseCord([0, 0], [0, 0]).filter(([x, y, z]) => Math.abs(y - M0100_CORD.wire - DESK_TOP_Y - (onMat(x, z) ? DESK_MAT.thickness : 0)) < 1e-9);
    expect(lying.length).toBeGreaterThan(10);
  });

  it("drags its middle after the mouse, and keeps its end in the port", () => {
    const still = macMouseCordGuide([0, 0], [0, 0]);
    const dragged = macMouseCordGuide(corners[1], corners[1]);
    const lagging = macMouseCordGuide(corners[1], [0, 0]);
    // The middle follows the mouse, by less than the mouse moved; while it lags, it stays where it was.
    const middle = 2;
    expect(dragged[middle][0] - still[middle][0]).toBeGreaterThan(0);
    expect(dragged[middle][0] - still[middle][0]).toBeLessThan(corners[1][0]);
    expect(lagging[middle]).toEqual(still[middle]);
    // The end at the port never moves.
    expect(dragged.slice(-3)).toEqual(still.slice(-3));
  });
});
