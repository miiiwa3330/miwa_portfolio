import type { Metadata } from "next";
import { readingMetadata } from "@/reading/pageMeta";
import About from "@/detail/About";

const DESCRIPTION =
  "学生エンジニア Miiiwa の自己紹介ページです。「面白いを最優先！」をモットーに、42tokyoや東大松尾研GCIでの学び、個人開発への情熱と価値観を語っています。";

export const metadata: Metadata = readingMetadata({
  path: "/about",
  title: "自己紹介",
  description: DESCRIPTION,
  type: "website",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <About />
    </div>
  );
}

