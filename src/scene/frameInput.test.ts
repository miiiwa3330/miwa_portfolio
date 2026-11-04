import { describe, expect, it } from "vitest";
import { frameToScreen, pcFrameInput, type FrameInput } from "./frameInput";

describe("frameToScreen", () => {
  it("puts a point of the frame on the screen: its top left, then the scale", () => {
    expect(frameToScreen({ x: 0, y: 0 }, { x: 136, y: 76 }, 1.3)).toEqual({ x: 136, y: 76 });
    expect(frameToScreen({ x: 100, y: 50 }, { x: 136, y: 76 }, 1.3)).toEqual({ x: 266, y: 141 });
  });
});

describe("pcFrameInput", () => {
  it("passes each input to every listener until it unsubscribes", () => {
    const heard: FrameInput[] = [];
    const off = pcFrameInput.on((input) => heard.push(input));
    pcFrameInput.emit({ kind: "key", type: "down", code: "KeyA" });
    off();
    pcFrameInput.emit({ kind: "key", type: "up", code: "KeyA" });
    expect(heard).toEqual([{ kind: "key", type: "down", code: "KeyA" }]);
  });
});
