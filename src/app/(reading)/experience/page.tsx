import type { Metadata } from "next";
import { readingMetadata } from "@/reading/pageMeta";
import Experience from "@/detail/Experience";

const DESCRIPTION =
  "Miiiwa のエンジニアとしての経歴・学歴・産学連携・開発活動のタイムラインです。漫画『王様達のヴァイキング』との出会いから、42tokyo、東大松尾研GCI、個人開発への歩みを記録しています。";

export const metadata: Metadata = readingMetadata({
  path: "/experience",
  title: "経歴・活動",
  description: DESCRIPTION,
  type: "website",
});

export default function ExperiencePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <Experience />
    </div>
  );
}

