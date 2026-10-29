import type { Metadata } from "next";
import { readingMetadata } from "@/reading/pageMeta";
import Contact from "@/detail/Contact";

const DESCRIPTION =
  "Miiiwa へのご連絡・ご相談・お仕事の依頼・ポートフォリオへのフィードバック用のお問い合わせ窓口です。X（旧Twitter）やメールにていつでもお気軽にメッセージをお寄せください。";

export const metadata: Metadata = readingMetadata({
  path: "/contact",
  title: "お問い合わせ",
  description: DESCRIPTION,
  type: "website",
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <Contact />
    </div>
  );
}

