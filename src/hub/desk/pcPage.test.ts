import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { pcPageForHref } from "./pcPage";

describe("pcPageForHref", () => {
  it("opens every page of the site in the PC's window, except the room itself and the privacy policy", () => {
    // Against the sitemap rather than a list written here: a page added to the
    // site and not to the PC would otherwise leave the room when clicked.
    const paths = sitemap()
      .map(({ url }) => new URL(url).pathname)
      .filter((path) => path !== "/" && path !== "/privacy");
    expect(paths.length).toBeGreaterThan(20);
    for (const path of paths) expect(pcPageForHref(path), path).not.toBeNull();
  });

  it("reads each kind of page", () => {
    expect(pcPageForHref("/about")).toEqual({ kind: "file", file: "about" });
    expect(pcPageForHref("/experience")).toEqual({ kind: "file", file: "experience" });
    expect(pcPageForHref("/notes")).toEqual({ kind: "file", file: "notes" });
    expect(pcPageForHref("/products/loo100")).toEqual({ kind: "product", slug: "loo100" });
    expect(pcPageForHref("/notes/adsense-low-value-content")).toEqual({ kind: "note", slug: "adsense-low-value-content" });
  });

  it("ignores a trailing slash, a query and a hash", () => {
    expect(pcPageForHref("/products/loo100/")).toEqual({ kind: "product", slug: "loo100" });
    expect(pcPageForHref("/products/loo100#top")).toEqual({ kind: "product", slug: "loo100" });
    expect(pcPageForHref("/skills?from=pc")).toEqual({ kind: "file", file: "skills" });
  });

  it("closes the window for the room's own page", () => {
    expect(pcPageForHref("/")).toBe("desktop");
    expect(pcPageForHref("/#products")).toBe("desktop");
  });

  it("leaves alone what the window cannot show", () => {
    expect(pcPageForHref("https://github.com/miiiwa1121")).toBeNull();
    expect(pcPageForHref("//example.com/notes")).toBeNull();
    expect(pcPageForHref("/archive/v0")).toBeNull();
    expect(pcPageForHref("/privacy")).toBeNull();
    expect(pcPageForHref("/products/no-such-product")).toBeNull();
    expect(pcPageForHref("/notes/no-such-note")).toBeNull();
    expect(pcPageForHref("/notes/adsense-low-value-content/more")).toBeNull();
    expect(pcPageForHref("/notes-archive")).toBeNull();
  });
});
