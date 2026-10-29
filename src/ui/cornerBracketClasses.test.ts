import { describe, expect, it } from "vitest";
import {
  cornerBracketClasses,
  CORNER_OFFSET_CLASSES,
  CORNER_SIZE_CLASSES,
  type CornerOffset,
  type CornerSize,
} from "./cornerBracketClasses";

describe("cornerBracketClasses", () => {
  it("uses default configuration (sm, normal, border-current, border-2)", () => {
    const classes = cornerBracketClasses();
    expect(classes.container).toContain("pointer-events-none absolute inset-1");
    expect(classes.topLeft).toContain("w-2 h-2 border-2 border-r-0 border-b-0 border-current");
    expect(classes.topRight).toContain("w-2 h-2 border-2 border-l-0 border-b-0 border-current");
    expect(classes.bottomLeft).toContain("w-2 h-2 border-2 border-r-0 border-t-0 border-current");
    expect(classes.bottomRight).toContain("w-2 h-2 border-2 border-l-0 border-t-0 border-current");
  });

  it("applies requested size classes correctly", () => {
    const sizes: CornerSize[] = ["xs", "sm", "md", "lg"];
    for (const size of sizes) {
      const classes = cornerBracketClasses({ size });
      const expectedSizeClass = CORNER_SIZE_CLASSES[size];
      expect(classes.topLeft).toContain(expectedSizeClass);
      expect(classes.topRight).toContain(expectedSizeClass);
      expect(classes.bottomLeft).toContain(expectedSizeClass);
      expect(classes.bottomRight).toContain(expectedSizeClass);
    }
  });

  it("applies requested offset classes correctly", () => {
    const offsets: CornerOffset[] = ["none", "tight", "normal", "loose", "card"];
    for (const offset of offsets) {
      const classes = cornerBracketClasses({ offset });
      const expectedOffsetClass = CORNER_OFFSET_CLASSES[offset];
      expect(classes.container).toContain(expectedOffsetClass);
    }
  });

  it("applies custom color class and stroke width", () => {
    const classes = cornerBracketClasses({
      colorClass: "border-orange-500",
      strokeWidth: "1",
    });
    expect(classes.topLeft).toContain("border-orange-500");
    expect(classes.topLeft).toContain("border border-r-0");
    expect(classes.topLeft).not.toContain("border-2");
  });
});

