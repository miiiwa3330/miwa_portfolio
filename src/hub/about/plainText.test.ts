import { describe, expect, it } from "vitest";
import { plainText } from "./plainText";

/** An element as JSX compiles it: a plain object whose children are in `props`. */
const el = (children: unknown) => ({ type: "span", props: { children } });

describe("plainText", () => {
  it("keeps the words and drops the markup, however deep", () => {
    expect(plainText(el(["初めまして、", el("Ｍｉｉｉｗａ"), "です。"]))).toBe("初めまして、Ｍｉｉｉｗａです。");
    expect(plainText(el(["On my own I have shipped ", el(el("imadoko")), ", then ", 3, " more."]))).toBe("On my own I have shipped imadoko, then 3 more.");
  });

  it("reads nothing for what React draws nothing for", () => {
    expect(plainText([null, undefined, false, true, el(null)])).toBe("");
  });
});
