import { describe, expect, it } from "vitest";
import { fanShowNow, onFanShow, setFanShow, type FanShow } from "./holoFanShow";

describe("what the hologram fan shows", () => {
  it("starts on the time, and tells the fan each time the self-introduction is asked for — again starts it over", () => {
    expect(fanShowNow()).toBe("clock");
    const heard: FanShow[] = [];
    const off = onFanShow((show) => heard.push(show));
    setFanShow("about");
    setFanShow("about");
    setFanShow("clock");
    setFanShow("clock");
    off();
    setFanShow("about");
    expect(heard).toEqual(["about", "about", "clock"]);
    setFanShow("clock");
  });
});
