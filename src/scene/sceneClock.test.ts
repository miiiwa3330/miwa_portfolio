import { beforeEach, describe, expect, it } from "vitest";
import { createSceneClock, type SceneClock } from "./sceneClock";

describe("sceneClock", () => {
  let clock: SceneClock;

  beforeEach(() => {
    clock = createSceneClock();
  });

  it("runs with the renderer", () => {
    expect(clock.time(0)).toBe(0);
    expect(clock.time(12.5)).toBe(12.5);
    expect(clock.delta(1 / 60)).toBe(1 / 60);
  });

  // R3F restarts `clock.elapsedTime` from zero every time `frameloop` changes,
  // which this page does twice per visit to a detail page (see `restarts`).
  describe("when the renderer's clock restarts from zero", () => {
    it("does not send the scene back in time", () => {
      clock.time(40); // read the diorama for forty seconds
      // The detail page opens, then closes: elapsedTime is back at zero.
      expect(clock.time(0)).toBe(40);
      expect(clock.time(0.5)).toBe(40.5);
    });

    it("survives it happening more than once", () => {
      clock.time(40);
      clock.time(0);
      clock.time(12); // 52
      expect(clock.time(0)).toBe(52);
      expect(clock.time(3)).toBe(55);
    });
  });

  it("gives each clock its own state", () => {
    const other = createSceneClock();
    clock.time(40);
    clock.time(0);
    expect(other.time(0)).toBe(0);
    expect(clock.time(5)).toBe(45);
  });
});
