import { describe, expect, it } from "vitest";
import { groupProseByHeading } from "./groupProseByHeading";

type Node = { tag: "h2" | "h3" | "p" | "ul"; text: string } | string;

const isH2 = (node: Node) => typeof node !== "string" && node.tag === "h2";
const isBlank = (node: Node) => typeof node === "string" && node.trim() === "";

describe("groupProseByHeading", () => {
  it("groups each h2 ('｜' heading) with its following paragraphs and h3 subsections", () => {
    const nodes: Node[] = [
      "\n",
      { tag: "h2", text: "メールを溶かして、会話にする" },
      "\n",
      { tag: "p", text: "段落1" },
      { tag: "p", text: "段落2" },
      "\n",
      { tag: "h2", text: "できること" },
      "\n",
      { tag: "h3", text: "メールを、チャットのように読む" },
      { tag: "p", text: "段落3" },
      { tag: "ul", text: "リスト" },
    ];

    expect(groupProseByHeading(nodes, isH2, isBlank)).toEqual([
      [
        { tag: "h2", text: "メールを溶かして、会話にする" },
        { tag: "p", text: "段落1" },
        { tag: "p", text: "段落2" },
      ],
      [
        { tag: "h2", text: "できること" },
        { tag: "h3", text: "メールを、チャットのように読む" },
        { tag: "p", text: "段落3" },
        { tag: "ul", text: "リスト" },
      ],
    ]);
  });

  it("keeps leading intro paragraphs before the first h2 in their own initial section", () => {
    const nodes: Node[] = [
      { tag: "p", text: "導入文1" },
      { tag: "p", text: "導入文2" },
      { tag: "h2", text: "最初の見出し" },
      { tag: "p", text: "本文" },
    ];

    expect(groupProseByHeading(nodes, isH2, isBlank)).toEqual([
      [
        { tag: "p", text: "導入文1" },
        { tag: "p", text: "導入文2" },
      ],
      [
        { tag: "h2", text: "最初の見出し" },
        { tag: "p", text: "本文" },
      ],
    ]);
  });

  it("returns an empty array when given only whitespace nodes", () => {
    expect(groupProseByHeading(["\n", "  "], isH2, isBlank)).toEqual([]);
  });
});
