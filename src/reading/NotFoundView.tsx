"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monoton } from "next/font/google";
import { motion } from "framer-motion";
import { ChevronRight, Compass, Terminal } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import SectionHeading from "@/detail/SectionHeading";
import { NAV, PAGE_LINKS } from "@/hub/nav";
import { useLanguage } from "@/state/LanguageContext";
import { useTerminal } from "@/terminal/TerminalContext";
import { useHandheld } from "@/state/useHandheld";

const errorCodeFont = Monoton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

type DestinationCard = {
  page: string;
  ja: string;
  en: string;
  descJa: string;
  descEn: string;
  tag: string;
};

const DESTINATIONS: readonly DestinationCard[] = [
  {
    ...NAV[0],
    descJa: "価値観・プロフィール・42tokyoでの学び",
    descEn: "Profile, values & learnings at 42tokyo",
    tag: "SECTOR 01",
  },
  {
    ...NAV[1],
    descJa: "全13件の個人開発サービス・ゲームの記録",
    descEn: "13 personal web apps, games & write-ups",
    tag: "SECTOR 02",
  },
  {
    ...NAV[2],
    descJa: "フロントエンド・バックエンド・3D技術一覧",
    descEn: "Frontend, backend, 3D & infrastructure stack",
    tag: "SECTOR 03",
  },
  {
    ...NAV[3],
    descJa: "2019年からの歩みとインターン・ハッカソン",
    descEn: "Timeline since 2019, internships & hackathons",
    tag: "SECTOR 04",
  },
  {
    ...NAV[4],
    descJa: "X（旧Twitter）でのご連絡・ご相談窓口",
    descEn: "Get in touch via X (@miiiwa3330)",
    tag: "SECTOR 05",
  },
  {
    ...PAGE_LINKS[0],
    descJa: "開発中に踏んだ罠や3D設計の技術ログ",
    descEn: "Technical notes on 3D pitfalls & design",
    tag: "ARCHIVE",
  },
];

export default function NotFoundView() {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const { openTerminal } = useTerminal();
  const handheld = useHandheld();
  const pathname = usePathname() || "/unknown-sector";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <SectionHeading as="h1" en="404 Not Found" className="mb-8 md:mb-12">
        404 ページが見つかりません
      </SectionHeading>

      {/* Main 404 Hero Card */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        aria-labelledby="not-found-title"
        className="group relative rounded-none bg-white border border-black/20 hover:border-black transition-colors overflow-hidden"
      >
        <CornerBrackets
          size="lg"
          offset="card"
          strokeWidth="2"
          colorClass="border-neutral-900"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />

        {/* Top telemetry status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-8 py-3 bg-neutral-900 text-neutral-100 border-b border-black font-mono text-[11px] sm:text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-none bg-[#ea580c] animate-pulse" />
            <span className="font-bold tracking-widest uppercase">
              COLONY NAVIGATION // ERR_SECTOR_UNMAPPED
            </span>
          </div>
          <span className="text-neutral-400 tabular-nums">STATUS: 404 NOT FOUND</span>
        </div>

        <div className="p-6 sm:p-10 md:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left: Giant 404 in Monoton + coordinate readout */}
          <div className="lg:col-span-5 flex flex-col items-start lg:border-r lg:border-black/10 lg:pr-8">
            <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
              {isJa ? "未確認エリアに迷い込みました" : "UNEXPLORED COLONY SECTOR"}
            </span>
            <div
              aria-hidden="true"
              className={`${errorCodeFont.className} text-7xl sm:text-8xl md:text-[6.5rem] leading-none tracking-wider text-[#ea580c] select-none`}
            >
              404
            </div>

            <div className="mt-6 w-full bg-neutral-50 border border-black/15 p-3.5 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between text-neutral-500">
                <span>TARGET_PATH</span>
                <span className="text-[#ea580c] font-bold">UNREACHABLE</span>
              </div>
              <div className="font-bold text-neutral-900 truncate" title={pathname}>
                {pathname}
              </div>
            </div>
          </div>

          {/* Right: Message & primary actions */}
          <div className="lg:col-span-7 flex flex-col items-start">
            <h2
              id="not-found-title"
              className="text-2xl sm:text-3xl md:text-4xl font-black text-neutral-950 tracking-tight leading-[1.35]"
            >
              {isJa ? (
                <>
                  この区画には、まだ<span className="text-[#ea580c]">部屋</span>が作られていません。
                </>
              ) : (
                <>
                  This sector of the colony hasn&apos;t been <span className="text-[#ea580c]">built</span> yet.
                </>
              )}
            </h2>

            <p className="mt-4 text-neutral-600 text-sm sm:text-base md:text-lg leading-relaxed">
              {isJa
                ? "アクセスしようとしたURLは移動または削除されたか、コロニーの外の宇宙空間を指しています。中央の部屋（3Dのトップページ）へ戻るか、下のワープゲートから目的のページへ移動してください。"
                : "The URL you tried to reach may have been moved, deleted, or points into deep space outside the rocket colony. Return to the central 3D room, or jump directly to a destination below."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto font-mono">
              {/* Plain <a> into the hub (see leadsToHub in src/hub/nav.ts) */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="group/btn relative inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-none bg-neutral-900 hover:bg-black text-white font-bold border border-black transition-all active:scale-95 text-xs sm:text-sm uppercase cursor-pointer"
              >
                <CornerBrackets
                  size="xs"
                  offset="tight"
                  strokeWidth="2"
                  colorClass="border-white"
                  className="opacity-0 group-hover/btn:opacity-100 transition-opacity"
                />
                <Compass size={16} className="text-[#ea580c]" />
                <span>{isJa ? "部屋（トップ）へ戻る" : "Return to 3D Room"}</span>
              </a>

              <Link
                href="/products"
                className="group/btn relative inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-none bg-white hover:bg-neutral-100 text-neutral-900 font-bold border border-black/20 hover:border-black transition-all active:scale-95 text-xs sm:text-sm uppercase"
              >
                <CornerBrackets
                  size="xs"
                  offset="tight"
                  strokeWidth="2"
                  colorClass="border-neutral-900"
                  className="opacity-0 group-hover/btn:opacity-100 transition-opacity"
                />
                <span>{isJa ? "制作実績を見る" : "Browse Products"}</span>
                <ChevronRight size={15} />
              </Link>

              {!handheld && (
                <button
                  type="button"
                  onClick={openTerminal}
                  className="group/btn relative inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3.5 rounded-none bg-white hover:bg-neutral-100 text-neutral-700 font-bold border border-black/20 hover:border-black transition-all active:scale-95 text-xs sm:text-sm uppercase cursor-pointer"
                >
                  <CornerBrackets
                    size="xs"
                    offset="tight"
                    strokeWidth="2"
                    colorClass="border-neutral-900"
                    className="opacity-0 group-hover/btn:opacity-100 transition-opacity"
                  />
                  <Terminal size={15} className="text-[#ea580c]" />
                  <span>{isJa ? "ターミナルを開く" : "Open Terminal"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick navigation grid to all valid sections */}
      <section aria-labelledby="sector-map-heading" className="mt-16">
        <SectionHeading id="sector-map-heading" size="md" en="Colony Sector Map" className="mb-6">
          コロニー内の案内図
        </SectionHeading>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {DESTINATIONS.map((dest) => (
            <li key={dest.page} className="flex">
              <Link
                href={dest.page}
                className="group relative flex-1 flex flex-col justify-between p-5 sm:p-6 rounded-none bg-white border border-black/20 hover:border-[#ea580c] motion-safe:hover:-translate-y-0.5 transition-[border-color,transform] duration-200 focus-visible:outline-none focus-visible:border-[#ea580c]"
              >
                <CornerBrackets
                  size="sm"
                  offset="normal"
                  strokeWidth="2"
                  colorClass="border-[#ea580c]"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-neutral-900 text-neutral-100">
                      {dest.tag}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">{dest.page}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-neutral-950 group-hover:text-[#ea580c] transition-colors">
                    {isJa ? dest.ja : dest.en}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    {isJa ? dest.descJa : dest.descEn}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-end font-mono">
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-neutral-900 group-hover:text-[#ea580c] group-hover:underline uppercase">
                    {isJa ? "移動する" : "Enter"}
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="motion-safe:group-hover:translate-x-0.5 transition-transform duration-200"
                    />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
