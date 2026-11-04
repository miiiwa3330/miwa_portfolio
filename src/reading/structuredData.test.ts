import { describe, expect, it } from "vitest";
import { NOTES } from "@/data";
import { SITE_URL } from "@/data/site";
import { bottomNavForPath } from "./breadcrumbs";
import { breadcrumbJsonLd, jsonLdText, noteJsonLd, websiteJsonLd } from "./structuredData";

describe("websiteJsonLd", () => {
  it("names the site at its own URL, and its maker", () => {
    const site = websiteJsonLd();
    expect(site["@type"]).toBe("WebSite");
    expect(site.url).toBe(SITE_URL);
    expect(site.author.name).toBe("Miiiwa");
  });
});

describe("noteJsonLd", () => {
  it("says of every note what its page shows: title, summary, date, address", () => {
    for (const note of NOTES) {
      const post = noteJsonLd(note);
      expect(post["@type"]).toBe("BlogPosting");
      expect(post.headline).toBe(note.title);
      expect(post.description).toBe(note.description);
      expect(post.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.datePublished).toBe(note.date);
      expect(post.url).toBe(`${SITE_URL}/notes/${note.slug}`);
      expect(post.mainEntityOfPage).toBe(post.url);
    }
  });
});

describe("breadcrumbJsonLd", () => {
  it("lists the footer's trail in order, the page itself last at its own URL", () => {
    const path = "/products/loo100";
    const list = breadcrumbJsonLd(bottomNavForPath(path, true).breadcrumbs, path);
    expect(list.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "制作実績", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: "漏洩百貨店（loo100）", item: `${SITE_URL}/products/loo100` },
    ]);
  });
});

describe("jsonLdText", () => {
  it("cannot be closed early by a string in it", () => {
    const text = jsonLdText({ headline: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("<");
    expect(JSON.parse(text).headline).toBe("</script><script>alert(1)</script>");
  });
});
