import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { siteUrl } from "@/data/site";
import { NAV, PAGE_LINKS, leadsToHub, navItemForSection, navKey, offHubHref, pageLinkForPath } from "./nav";

const byLabel = (ja: string) => {
  const item = NAV.find((i) => i.ja === ja);
  if (!item) throw new Error(`no nav item ${ja}`);
  return item;
};

describe("NAV", () => {
  it("lists the five areas", () => {
    expect(NAV.map((i) => i.ja)).toEqual([
      "自己紹介",
      "制作実績",
      "技術スタック",
      "経歴・活動",
      "お問い合わせ",
    ]);
  });

  it("names every area in the room exactly once", () => {
    const sections = NAV.flatMap((i) => (i.section ? [i.section] : []));
    expect([...sections].sort()).toEqual(["about", "contact", "experience", "products", "skills"]);
  });

  it("gives every entry its own key, the page links included", () => {
    const keys = [...NAV, ...PAGE_LINKS].map(navKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("leads only to pages the build writes and lists", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const item of NAV) expect(urls).toContain(siteUrl(item.page));
  });
});

describe("PAGE_LINKS", () => {
  it("puts the notes after the areas", () => {
    expect(PAGE_LINKS.map((l) => [l.ja, l.page])).toEqual([["ノート", "/notes"]]);
  });

  it("leads only to pages the build writes and lists", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const { page } of PAGE_LINKS) expect(urls).toContain(siteUrl(page));
  });

  it("leaves the hub by next/link, not by a full load", () => {
    for (const { page } of PAGE_LINKS) expect(leadsToHub(page)).toBe(false);
  });
});

describe("offHubHref", () => {
  it("leads to the dedicated page for the area", () => {
    expect(offHubHref(byLabel("自己紹介"))).toBe("/about");
    expect(offHubHref(byLabel("制作実績"))).toBe("/products");
    expect(offHubHref(byLabel("技術スタック"))).toBe("/skills");
    expect(offHubHref(byLabel("経歴・活動"))).toBe("/experience");
    expect(offHubHref(byLabel("お問い合わせ"))).toBe("/contact");
  });
});

describe("pageLinkForPath", () => {
  const about = NAV.find((i) => i.page === "/about");
  const products = NAV.find((i) => i.page === "/products");
  const skills = NAV.find((i) => i.page === "/skills");
  const experience = NAV.find((i) => i.page === "/experience");
  const contact = NAV.find((i) => i.page === "/contact");
  const notes = PAGE_LINKS.find((l) => l.page === "/notes");

  it("lights the respective entry on each section page", () => {
    expect(pageLinkForPath("/about")).toBe(about);
    expect(pageLinkForPath("/products")).toBe(products);
    expect(pageLinkForPath("/products/imadoko")).toBe(products);
    expect(pageLinkForPath("/skills")).toBe(skills);
    expect(pageLinkForPath("/experience")).toBe(experience);
    expect(pageLinkForPath("/contact")).toBe(contact);
  });

  it("lights the notes on their index and on every note", () => {
    expect(notes).toBeDefined();
    expect(pageLinkForPath("/notes")).toBe(notes);
    expect(pageLinkForPath("/notes/drag-the-sun")).toBe(notes);
  });

  it("lights nothing on the other pages", () => {
    expect(pageLinkForPath("/")).toBeUndefined();
    expect(pageLinkForPath("/privacy")).toBeUndefined();
    expect(pageLinkForPath("/notes-archive")).toBeUndefined();
  });
});

describe("navItemForSection", () => {
  it("lights the focused area's entry, and nothing with none focused", () => {
    expect(navItemForSection("experience")).toBe(byLabel("経歴・活動"));
    expect(navItemForSection("products")).toBe(byLabel("制作実績"));
    expect(navItemForSection(null)).toBeUndefined();
  });
});

describe("leadsToHub", () => {
  it("is true for the hub, bare or at an area", () => {
    expect(leadsToHub("/")).toBe(true);
    expect(leadsToHub("/#about")).toBe(true);
    expect(leadsToHub("/#products")).toBe(true);
  });

  it("is false for the standalone pages of the site", () => {
    expect(leadsToHub("/about")).toBe(false);
    expect(leadsToHub("/products")).toBe(false);
    expect(leadsToHub("/skills")).toBe(false);
    expect(leadsToHub("/experience")).toBe(false);
    expect(leadsToHub("/contact")).toBe(false);
    expect(leadsToHub("/notes")).toBe(false);
    expect(leadsToHub("/privacy")).toBe(false);
  });
});
