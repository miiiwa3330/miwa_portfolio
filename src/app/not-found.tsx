import type { Metadata } from "next";
import ReadingHeader from "@/reading/ReadingHeader";
import ReadingFooter from "@/reading/ReadingFooter";
import ReadingDock from "@/reading/ReadingDock";
import NotFoundView from "@/reading/NotFoundView";

export const metadata: Metadata = {
  title: "404 Not Found — ページが見つかりません",
  description: "お探しのページは移動または削除されたか、存在しないURLです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground safe-inset">
      <ReadingHeader />
      <main className="flex-1 pt-24 sm:pt-28 md:pt-32">
        <NotFoundView />
      </main>
      <ReadingFooter />
      <ReadingDock />
    </div>
  );
}

