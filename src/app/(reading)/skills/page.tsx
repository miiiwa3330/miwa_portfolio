import type { Metadata } from "next";
import { readingMetadata } from "@/reading/pageMeta";
import Skills from "@/detail/Skills";

const DESCRIPTION =
  "Miiiwa が使用しているプログラミング言語・フレームワーク・クラウドインフラ・ツールなどの技術スタック一覧です。実務や個人開発で得た知見をもとにまとめています。";

export const metadata: Metadata = readingMetadata({
  path: "/skills",
  title: "技術スタック",
  description: DESCRIPTION,
  type: "website",
});

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <Skills />
    </div>
  );
}

