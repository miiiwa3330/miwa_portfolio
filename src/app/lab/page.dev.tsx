import type { Metadata } from "next";
import LabView from "@/lab/LabView";

export const metadata: Metadata = {
  title: "Lab",
  robots: { index: false, follow: false },
};

/**
 * 部屋の部品を1つずつ見る開発用のページ（`src/lab/`）。**本番には存在しない**:
 * ファイル名が `page.dev.tsx` で、`next.config.ts` の `pageExtensions` が開発の
 * ときだけこの拡張子を拾う。このサイトは `output: 'export'` で `app/` の下の
 * ページは全部書き出されるので、ルートごと外す（理由は `next.config.ts`）。
 */
export default function LabPage() {
  return <LabView />;
}
