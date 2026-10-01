import { describe, expect, it } from "vitest";
import { STANDING, STEP_BOB, STRIDE, advanceGait, footStep, stepBob, type Gait } from "./gait";
import { horizontalAt } from "./layout";

const DT = 1 / 60;

/** Walk straight along yaw 0 (world -Z) at `speed` for `seconds`, calling `each` every frame. */
function walk(speed: number, seconds: number, each?: (gait: Gait, at: number) => void, start: Gait = STANDING, from = 0): Gait {
  let gait = start;
  let at = from;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    at += speed * DT;
    gait = advanceGait(gait, 0, -at, 0, DT);
    each?.(gait, at);
  }
  return gait;
}

/** A foot over the floor in the world, walking along yaw 0 with the body at `at` metres out. */
function footOnFloor(gait: Gait, side: 0 | 1, at: number): [number, number] {
  const [fx, fz] = horizontalAt(0);
  const { offset } = footStep(gait, side);
  const along = at + offset[1];
  return [fx * along - fz * offset[0], fz * along + fx * offset[0]];
}

describe("the walk", () => {
  it("keeps a planted foot where it was put down, at a steady walk", () => {
    // Up to pace first, then follow every planted spell of the left foot.
    let gait = walk(1.2, 1);
    let planted: [number, number] | null = null;
    let worst = 0;
    let spells = 0;
    let at = 1.2;
    for (let i = 0; i < 120; i++) {
      at += 1.2 * DT;
      gait = advanceGait(gait, 0, -at, 0, DT);
      const { lift } = footStep(gait, 0);
      const spot = footOnFloor(gait, 0, at);
      if (lift === 0) {
        if (!planted) {
          planted = spot;
          spells++;
        }
        worst = Math.max(worst, Math.hypot(spot[0] - planted[0], spot[1] - planted[1]));
      } else {
        planted = null;
      }
    }
    expect(spells).toBeGreaterThanOrEqual(2);
    expect(worst).toBeLessThan(0.01);
  });

  it("takes a stride per STRIDE metres, whatever the speed", () => {
    for (const speed of [0.6, 1.5]) {
      const gait = walk(speed, 2);
      expect(gait.phase).toBeCloseTo((speed * 2) / STRIDE, 1);
    }
  });

  it("lifts each foot in turn, never both at once", () => {
    walk(1.2, 2, (gait) => {
      expect(footStep(gait, 0).lift > 0 && footStep(gait, 1).lift > 0).toBe(false);
    });
    let lifted = [false, false];
    walk(1.2, 2, (gait) => {
      lifted = lifted.map((was, side) => was || footStep(gait, side as 0 | 1).lift > 0.05);
    });
    expect(lifted).toEqual([true, true]);
  });

  it("comes to rest with both feet down and together once the walking stops", () => {
    let gait = walk(1.2, 1.27);
    for (let i = 0; i < 90; i++) gait = advanceGait(gait, 0, -1.2 * 1.27, 0, DT);
    for (const side of [0, 1] as const) {
      const { offset, lift } = footStep(gait, side);
      expect(lift).toBeLessThan(0.002);
      expect(Math.hypot(offset[0], offset[1])).toBeLessThan(0.02);
    }
    expect(gait.phase * 2).toBeCloseTo(Math.round(gait.phase * 2), 6);
  });

  it("walks backwards when the eye backs away: the steps go behind", () => {
    let gait = walk(1.2, 1);
    gait = walk(-1.2, 1, undefined, gait, 1.2);
    expect(gait.heading[1]).toBeLessThan(-0.95);
  });

  it("shuffles round on the spot when turning, without striding off", () => {
    let gait = STANDING;
    let yaw = 0;
    let lifted = 0;
    for (let i = 0; i < 90; i++) {
      yaw += 1.5 * DT;
      gait = advanceGait(gait, 0, 0, yaw, DT);
      lifted = Math.max(lifted, footStep(gait, 0).lift, footStep(gait, 1).lift);
      for (const side of [0, 1] as const) {
        const { offset } = footStep(gait, side);
        expect(Math.hypot(offset[0], offset[1])).toBeLessThan(0.03);
      }
    }
    expect(lifted).toBeGreaterThan(0.01);
  });

  it("takes no steps while carried — rolling in on the chair", () => {
    let gait = STANDING;
    for (let i = 0; i < 30; i++) gait = advanceGait(gait, 0, -i * 0.01, 0, DT, 1);
    expect(gait.amount).toBe(0);
    expect(gait.phase).toBe(0);
  });
});

describe("stepBob", () => {
  it("is nothing standing still", () => {
    expect(stepBob(STANDING)).toBeCloseTo(0, 12);
  });

  it("dips the eye as each foot comes down, and never lifts it", () => {
    let deepest = 0;
    walk(1.5, 2, (gait) => {
      const bob = stepBob(gait);
      expect(bob).toBeLessThanOrEqual(0);
      deepest = Math.min(deepest, bob);
    });
    expect(deepest).toBeLessThan(-STEP_BOB * 0.9);
    // Deepest with both feet on the floor (half-strides), level mid-step.
    const full: Gait = { ...STANDING, amount: 1 };
    expect(stepBob({ ...full, phase: 0.5 })).toBeCloseTo(-STEP_BOB, 12);
    expect(stepBob({ ...full, phase: 0.25 })).toBeCloseTo(0, 12);
  });
});
