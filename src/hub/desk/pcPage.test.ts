import { describe, expect, it } from "vitest";
import { addressOf, addressToPath, leavesSite } from "./pcPage";

describe("addressOf", () => {
  it("writes the host, then the path, the query and the hash", () => {
    expect(addressOf({ pathname: "/", search: "", hash: "" })).toBe("miiiwa.com");
    expect(addressOf({ pathname: "/", search: "", hash: "#desk" })).toBe("miiiwa.com#desk");
    expect(addressOf({ pathname: "/products/loo100", search: "?from=pc", hash: "#top" })).toBe("miiiwa.com/products/loo100?from=pc#top");
  });
});

describe("addressToPath", () => {
  it("takes the address with or without the scheme, the host and the slash", () => {
    expect(addressToPath("miiiwa.com")).toBe("/");
    expect(addressToPath("https://miiiwa.com/notes/")).toBe("/notes/");
    expect(addressToPath("http://www.miiiwa.com/about")).toBe("/about");
    expect(addressToPath("  MIIIWA.COM/skills ")).toBe("/skills");
    expect(addressToPath("miiiwa.com#desk")).toBe("/#desk");
    expect(addressToPath("/contact")).toBe("/contact");
    expect(addressToPath("products/loo100")).toBe("/products/loo100");
    expect(addressToPath("archive/v1/index.html")).toBe("/archive/v1/index.html");
  });

  it("refuses another host and an empty bar", () => {
    expect(addressToPath("google.com")).toBeNull();
    expect(addressToPath("https://x.com/miiiwa3330")).toBeNull();
    expect(addressToPath("miiiwa.com.example.net/about")).toBeNull();
    expect(addressToPath("loo100.miiiwa.com")).toBeNull();
    expect(addressToPath("   ")).toBeNull();
  });
});

describe("leavesSite", () => {
  const origin = "https://miiiwa.com";

  it("is true for another site", () => {
    expect(leavesSite("https://loo100.miiiwa.com/", origin)).toBe(true);
    expect(leavesSite("https://github.com/miiiwa1121", origin)).toBe(true);
    expect(leavesSite("http://miiiwa.com/about", origin)).toBe(true);
  });

  it("is false for the site's own pages, the old versions under /archive among them", () => {
    expect(leavesSite("https://miiiwa.com/notes", origin)).toBe(false);
    expect(leavesSite("https://miiiwa.com/archive/v0", origin)).toBe(false);
    expect(leavesSite("https://miiiwa.com/#desk", origin)).toBe(false);
  });

  it("leaves mail and what is not a URL to the browser", () => {
    expect(leavesSite("mailto:someone@example.com", origin)).toBe(false);
    expect(leavesSite("not a url", origin)).toBe(false);
  });
});
