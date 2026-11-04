import { describe, expect, it } from "vitest";
import { BOOT_LINES, BOOT_STAGES, bootLineState, bootNow, laterStage, publishBoot } from "./bootChannel";

describe("bootLineState", () => {
  it("has one line per stage between the page and the first frame", () => {
    expect(BOOT_LINES.length).toBe(BOOT_STAGES.length - 1);
  });

  it("works through the lines one at a time, and has them all done at the first frame", () => {
    const rows = BOOT_STAGES.map((stage) => BOOT_LINES.map((_, i) => bootLineState(stage, i)));
    expect(rows).toEqual([
      ["doing", "todo", "todo"],
      ["done", "doing", "todo"],
      ["done", "done", "doing"],
      ["done", "done", "done"],
    ]);
  });
});

describe("publishBoot", () => {
  it("only moves forward", () => {
    expect(laterStage("built", "hydrated")).toBe("built");
    expect(laterStage("hydrated", "built")).toBe("built");
    publishBoot("built");
    publishBoot("hydrated");
    expect(bootNow()).toBe("built");
    publishBoot("drawn");
    expect(bootNow()).toBe("drawn");
  });
});
