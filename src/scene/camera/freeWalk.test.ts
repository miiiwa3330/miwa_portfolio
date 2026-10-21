import { describe, expect, it } from "vitest";
import { AT_CENTRE, JUMP_HEIGHT, NO_KEYS, stepFreeWalk, type FreeWalk, type WalkKeys } from "./freeWalk";
import { WALK_SPEED } from "./walkFlight";
import { ROOM_RADIUS, horizontalAt } from "../room/layout";
import { BODY_RADIUS } from "../room/floor";

const DT = 1 / 60;
const DEG = Math.PI / 180;

function run(keys: WalkKeys, yawDeg: number, seconds: number, from: FreeWalk = AT_CENTRE, each?: (w: FreeWalk) => void): FreeWalk {
  let walk = from;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    walk = stepFreeWalk(walk, i === 0 ? keys : { ...keys, jump: false }, yawDeg * DEG, DT);
    each?.(walk);
  }
  return walk;
}

describe("walking on the keys", () => {
  it("walks where the reader is looking, at the room's pace", () => {
    for (const yaw of [0, 68, 200]) {
      const walk = run({ forward: 1, right: 0, jump: false }, yaw, 0.6);
      const [hx, hz] = horizontalAt(yaw);
      const speed = Math.hypot(walk.vx, walk.vz);
      expect(speed).toBeCloseTo(WALK_SPEED, 2);
      expect((walk.vx * hx + walk.vz * hz) / speed).toBeCloseTo(1, 6);
    }
  });

  it("steps to the right on D and back on S, relative to the view", () => {
    const right = run({ forward: 0, right: 1, jump: false }, 0, 0.3);
    // Looking along −Z (yaw 0), right is +X.
    expect(right.x).toBeGreaterThan(0.1);
    expect(Math.abs(right.z)).toBeLessThan(1e-9);
    const back = run({ forward: -1, right: 0, jump: false }, 0, 0.3);
    expect(back.z).toBeGreaterThan(0.1);
  });

  it("is no faster on a diagonal", () => {
    const walk = run({ forward: 1, right: 1, jump: false }, 30, 0.8);
    expect(Math.hypot(walk.vx, walk.vz)).toBeCloseTo(WALK_SPEED, 2);
  });

  it("stops when the keys are let go, without sliding on", () => {
    const moving = run({ forward: 1, right: 0, jump: false }, 0, 0.5);
    const stopped = run(NO_KEYS, 0, 0.6, moving);
    expect(Math.hypot(stopped.vx, stopped.vz)).toBeLessThan(0.01);
    expect(Math.hypot(stopped.x - moving.x, stopped.z - moving.z)).toBeLessThan(0.2);
  });

  it("stops at the wall rather than pressing on through it", () => {
    // Between the board and the comms there is wall to walk into (yaw 220°).
    const walk = run({ forward: 1, right: 0, jump: false }, 225, 4);
    expect(Math.hypot(walk.x, walk.z)).toBeLessThanOrEqual(ROOM_RADIUS - BODY_RADIUS + 1e-9);
    expect(Math.hypot(walk.vx, walk.vz)).toBeLessThan(0.05);
  });
});

describe("jumping on Space", () => {
  it("rises to the jump's height and lands back on the floor", () => {
    let highest = 0;
    const landed = run({ ...NO_KEYS, jump: true }, 0, 1.2, AT_CENTRE, (w) => (highest = Math.max(highest, w.height)));
    expect(highest).toBeGreaterThan(JUMP_HEIGHT * 0.97);
    expect(highest).toBeLessThan(JUMP_HEIGHT * 1.03);
    expect(landed.height).toBe(0);
    expect(landed.rise).toBe(0);
  });

  it("jumps from the floor only: asking again in the air does nothing", () => {
    let walk = stepFreeWalk(AT_CENTRE, { ...NO_KEYS, jump: true }, 0, DT);
    for (let i = 0; i < 10; i++) walk = stepFreeWalk(walk, NO_KEYS, 0, DT);
    const before = walk.rise;
    walk = stepFreeWalk(walk, { ...NO_KEYS, jump: true }, 0, DT);
    expect(walk.rise).toBeLessThan(before);
  });

  it("does nothing without being asked", () => {
    const walk = run({ forward: 1, right: 0, jump: false }, 0, 1);
    expect(walk.height).toBe(0);
  });
});
