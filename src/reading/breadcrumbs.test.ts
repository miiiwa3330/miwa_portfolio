import { describe, expect, it } from "vitest";
import { bottomNavForPath } from "./breadcrumbs";

describe("bottomNavForPath", () => {
  it("builds breadcrumbs and back link for top-level section pages", () => {
    const about = bottomNavForPath("/about", true);
    expect(about.breadcrumbs).toEqual([
      { label: "トップ", href: "/" },
      { label: "自己紹介" },
    ]);
    expect(about.backHref).toBe("/");
    expect(about.backLabel).toBe("トップへ戻る");

    const skillsEn = bottomNavForPath("/skills", false);
    expect(skillsEn.breadcrumbs).toEqual([
      { label: "Home", href: "/" },
      { label: "Skills" },
    ]);
    expect(skillsEn.backHref).toBe("/");
    expect(skillsEn.backLabel).toBe("Back to Home");
  });

  it("builds 3-level breadcrumbs and index back link for product detail pages", () => {
    const prod = bottomNavForPath("/products/imadoko", true);
    expect(prod.breadcrumbs).toEqual([
      { label: "トップ", href: "/" },
      { label: "制作実績", href: "/products" },
      { label: "imadoko" },
    ]);
    expect(prod.backHref).toBe("/products");
    expect(prod.backLabel).toBe("制作実績の一覧に戻る");
  });

  it("builds 3-level breadcrumbs and index back link for note detail pages", () => {
    const note = bottomNavForPath("/notes/adsense-low-value-content", true);
    expect(note.breadcrumbs.length).toBe(3);
    expect(note.breadcrumbs[0]).toEqual({ label: "トップ", href: "/" });
    expect(note.breadcrumbs[1]).toEqual({ label: "ノート", href: "/notes" });
    expect(note.backHref).toBe("/notes");
    expect(note.backLabel).toBe("ノートの一覧に戻る");
  });

  it("builds breadcrumbs and back link for unmatched 404 routes", () => {
    const unknownJa = bottomNavForPath("/unknown-page", true);
    expect(unknownJa.breadcrumbs).toEqual([
      { label: "トップ", href: "/" },
      { label: "404 Not Found" },
    ]);
    expect(unknownJa.backHref).toBe("/");
    expect(unknownJa.backLabel).toBe("トップへ戻る");

    const unknownEn = bottomNavForPath("/unknown-page", false);
    expect(unknownEn.breadcrumbs).toEqual([
      { label: "Home", href: "/" },
      { label: "404 Not Found" },
    ]);
    expect(unknownEn.backHref).toBe("/");
    expect(unknownEn.backLabel).toBe("Back to Home");
  });
});
