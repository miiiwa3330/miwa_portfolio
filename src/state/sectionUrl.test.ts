import { describe, expect, it } from "vitest";
import { hasSheet, hashForSection, hashForState, sectionFromHash } from "./sectionUrl";

describe("sectionFromHash", () => {
  it("reads every real section", () => {
    for (const id of ["about", "products", "skills", "experience", "contact"]) {
      expect(sectionFromHash(`#${id}`)).toBe(id);
    }
  });

  it("tolerates a missing leading hash", () => {
    expect(sectionFromHash("products")).toBe("products");
  });

  it("reads an empty hash as no section", () => {
    expect(sectionFromHash("")).toBeNull();
    expect(sectionFromHash("#")).toBeNull();
  });

  it("refuses anything that is not a section, rather than trusting the URL", () => {
    for (const junk of ["#nope", "#Products", "#products/../x", "#<script>"]) {
      expect(sectionFromHash(junk), junk).toBeNull();
    }
  });
});

describe("hashForSection", () => {
  it("round-trips through sectionFromHash", () => {
    for (const id of ["about", "products", "skills", "experience", "contact"] as const) {
      expect(sectionFromHash(hashForSection(id))).toBe(id);
    }
  });

  it("gives an empty hash for no section, so the URL goes back to clean", () => {
    expect(hashForSection(null)).toBe("");
  });
});

describe("the desk's URL", () => {
  it("reads #desk as the desk", () => {
    expect(sectionFromHash("#desk")).toBe("desk");
    expect(sectionFromHash(hashForSection("desk"))).toBe("desk");
  });

  it("shows #desk while sitting at the desk, which has no sheet to be open", () => {
    expect(hashForState("desk", false)).toBe("#desk");
  });

  it("shows an area only while its sheet is open, as before", () => {
    expect(hashForState("products", true)).toBe("#products");
    expect(hashForState("products", false)).toBe("");
    expect(hashForState(null, false)).toBe("");
  });

  it("opens a sheet for the four areas that have one, and for nothing else", () => {
    for (const id of ["products", "skills", "experience", "contact"] as const) expect(hasSheet(id)).toBe(true);
    for (const id of ["about", "desk", null] as const) expect(hasSheet(id)).toBe(false);
  });
});
