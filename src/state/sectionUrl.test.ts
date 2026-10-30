import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { siteUrl } from "@/data/site";
import { pathForSection } from "@/hub/nav";
import { hashForSection, hashForState, movedToPage, sectionFromHash } from "./sectionUrl";

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

  it("shows #desk while sitting at the desk", () => {
    expect(hashForState("desk")).toBe("#desk");
  });

  it("shows nothing for an area: its page is a page of its own now", () => {
    for (const id of ["about", "products", "skills", "experience", "contact", null] as const) {
      expect(hashForState(id)).toBe("");
    }
  });
});

describe("the old links", () => {
  it("sends on the four areas that had a sheet, and nothing else", () => {
    for (const id of ["products", "skills", "experience", "contact"] as const) expect(movedToPage(id)).toBe(true);
    for (const id of ["about", "desk", null] as const) expect(movedToPage(id)).toBe(false);
  });

  it("sends them to pages the build writes", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const id of ["products", "skills", "experience", "contact"] as const) {
      expect(urls).toContain(siteUrl(pathForSection(id)));
    }
  });
});
