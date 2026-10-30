"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import CornerBrackets from "@/ui/CornerBrackets";
import SectionHeading from "@/detail/SectionHeading";
import { NAV, PAGE_LINKS } from "@/hub/nav";
import { useLanguage } from "@/state/LanguageContext";

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

const ASCII_404 = [
  "  _  _    ___  _  _   ",
  " | || |  / _ \\| || |  ",
  " | || |_| | | | || |_ ",
  " |__   _| |_| |__   _|",
  "    |_|  \\___/   |_|  ",
].join("\n");

type CmdEntry = {
  cmd: string;
  output: string | null;
};

export default function NotFoundView() {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const pathname = usePathname() || "/unknown-sector";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<CmdEntry[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const asciiBodyJa = [
    ASCII_404,
    "",
    "+------------------------------------------------------------------+",
    "| STATUS  : 404 Not Found (ERR_SECTOR_UNMAPPED)                    |",
    `| TARGET  : ${pathname.padEnd(54, " ").slice(0, 54)} |`,
    "+------------------------------------------------------------------+",
    "| この区画には、まだ「部屋」が作られていません。                   |",
    "| アクセスしようとしたURLは移動または削除されたか、                |",
    "| コロニーの外の宇宙空間を指しています。                           |",
    "|                                                                  |",
    "| [RECOVERY COMMANDS]                                              |",
    "|   cd /           : 部屋（3Dトップページ）へ戻る                  |",
    "|   cd /products   : 制作実績の一覧へ移動                          |",
    "|   cd /notes      : ノートの一覧へ移動                            |",
    "|   help           : コマンド一覧を表示                            |",
    "+------------------------------------------------------------------+",
  ].join("\n");

  const asciiBodyEn = [
    ASCII_404,
    "",
    "+------------------------------------------------------------------+",
    "| STATUS  : 404 Not Found (ERR_SECTOR_UNMAPPED)                    |",
    `| TARGET  : ${pathname.padEnd(54, " ").slice(0, 54)} |`,
    "+------------------------------------------------------------------+",
    "| This sector of the colony hasn't been built yet.                 |",
    "| The URL you requested may have been moved, deleted, or points    |",
    "| into deep space outside the rocket colony.                       |",
    "|                                                                  |",
    "| [RECOVERY COMMANDS]                                              |",
    "|   cd /           : Return to the 3D Colony Room                  |",
    "|   cd /products   : Browse Products                               |",
    "|   cd /notes      : Read Technical Notes                          |",
    "|   help           : Show available commands                       |",
    "+------------------------------------------------------------------+",
  ].join("\n");

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setHistory((prev) => [...prev, { cmd: "", output: null }]);
      return;
    }
    setCmdHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);

    const lower = trimmed.toLowerCase();

    if (lower === "clear") {
      setHistory([]);
      setInput("");
      return;
    }

    if (lower === "home" || lower === "cd" || lower === "cd /" || lower === "cd ~" || lower === "exit") {
      window.location.href = "/";
      return;
    }

    const routeMap: Record<string, string> = {
      about: "/about",
      products: "/products",
      skills: "/skills",
      experience: "/experience",
      contact: "/contact",
      notes: "/notes",
    };

    const cdTarget = lower.startsWith("cd ") ? lower.slice(3).replace(/^\/+|\/+$/g, "") : lower;
    if (routeMap[cdTarget]) {
      router.push(routeMap[cdTarget]);
      return;
    }

    let output: string;
    if (lower === "help") {
      output = [
        "Available commands:",
        "  cd /           Return to 3D Room (/)",
        "  cd /about      Go to About me (/about)",
        "  cd /products   Go to Products (/products)",
        "  cd /skills     Go to Skills (/skills)",
        "  cd /experience Go to Experience (/experience)",
        "  cd /contact    Go to Contact (/contact)",
        "  cd /notes      Go to Notes (/notes)",
        "  ls             List directories",
        "  pwd            Print working directory",
        "  whoami         Print current user",
        "  clear          Clear terminal screen",
      ].join("\n");
    } else if (lower === "ls" || lower === "ls -la" || lower === "ls -l") {
      output = "about/       contact/     experience/  notes/       products/    skills/";
    } else if (lower === "pwd") {
      output = `/Users/miiiwa${pathname} (unmapped)`;
    } else if (lower === "whoami") {
      output = "miiiwa";
    } else {
      output = `zsh: command not found: ${trimmed}`;
    }

    setHistory((prev) => [...prev, { cmd: trimmed, output }]);
    setInput("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <SectionHeading as="h1" en="404 Not Found" className="mb-8 md:mb-12">
        404 ページが見つかりません
      </SectionHeading>

      {/* macOS Terminal / iTerm Window matching the user's screenshot */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        aria-label="miiiwa — -zsh — 120×30"
        onClick={() => inputRef.current?.focus()}
        className="relative rounded-[11px] bg-[#1e2430]/95 backdrop-blur-md text-[#e6edf3] border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.45)] overflow-hidden font-mono cursor-text"
      >
        {/* Title bar: left-aligned traffic lights + blue folder icon + "miiiwa — -zsh — 120×30" */}
        <div className="flex items-center gap-3 px-3.5 py-2 bg-[#1c1d22] border-b border-black/40 select-none">
          {/* macOS Traffic Lights with glyphs inside */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              onClick={(e) => e.stopPropagation()}
              title={isJa ? "閉じる（部屋へ戻る）" : "Close (Return to Room)"}
              aria-label={isJa ? "閉じる（部屋へ戻る）" : "Close (Return to Room)"}
              className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] flex items-center justify-center text-[#4d0000] hover:brightness-110 transition"
            >
              <svg viewBox="0 0 10 10" className="w-2 h-2 stroke-current stroke-[1.75]" fill="none" aria-hidden="true">
                <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" strokeLinecap="round" />
              </svg>
            </a>
            <span className="w-3.5 h-3.5 rounded-full bg-[#febc2e] flex items-center justify-center text-[#5c3c00]">
              <svg viewBox="0 0 10 10" className="w-2 h-2 stroke-current stroke-[1.75]" fill="none" aria-hidden="true">
                <path d="M2 5H8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#28c840] flex items-center justify-center text-[#004d0d]">
              <svg viewBox="0 0 10 10" className="w-2 h-2 fill-current" aria-hidden="true">
                <path d="M2.2 4.8V2.2H4.8L2.2 4.8ZM7.8 5.2V7.8H5.2L7.8 5.2Z" />
              </svg>
            </span>
          </div>

          {/* Folder icon + title text right next to traffic lights */}
          <div className="flex items-center gap-1.5 text-[13px] font-sans font-semibold text-[#b8bcc4] tracking-tight truncate">
            <svg viewBox="0 0 20 16" className="w-4 h-3.5 shrink-0" fill="none" aria-hidden="true">
              <path
                d="M1 2.5C1 1.67 1.67 1 2.5 1H7.17C7.7 1 8.21 1.21 8.59 1.59L9.8 2.8H17.5C18.33 2.8 19 3.47 19 4.3V13.5C19 14.33 18.33 15 17.5 15H2.5C1.67 15 1 14.33 1 13.5V2.5Z"
                fill="#56b4f9"
              />
              <path
                d="M1 5.2H19V13.5C19 14.33 18.33 15 17.5 15H2.5C1.67 15 1 14.33 1 13.5V5.2Z"
                fill="#6ec3ff"
              />
            </svg>
            <span className="truncate">miiiwa — -zsh — 120×30</span>
          </div>
        </div>

        {/* Terminal Viewport */}
        <div className="p-4 sm:p-6 md:p-7 min-h-[24rem] text-[13px] sm:text-[14px] leading-[1.45] text-[#e6edf3] overflow-x-auto space-y-1">
          <div>Last login: Sun Oct 25 02:06:08 on ttys004</div>

          {/* Initial command that triggered 404 */}
          <div>
            <span>miiiwa@MiwanoMacBook-Air ~ % </span>
            <span>cd .{pathname}</span>
          </div>
          <div>cd: no such file or directory: .{pathname}</div>

          {/* Pure ASCII 404 output */}
          <pre className="pt-2 pb-3 text-[12px] sm:text-[13px] leading-[1.35] text-[#e6edf3] overflow-x-auto">
            {isJa ? asciiBodyJa : asciiBodyEn}
          </pre>

          {/* Clickable ASCII shortcuts inside terminal */}
          <div className="pt-1 pb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] sm:text-[13px]">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              onClick={(e) => e.stopPropagation()}
              className="text-[#6ec3ff] hover:underline cursor-pointer"
            >
              [cd / (Room)]
            </a>
            <Link
              href="/products"
              onClick={(e) => e.stopPropagation()}
              className="text-[#6ec3ff] hover:underline"
            >
              [cd /products]
            </Link>
            <Link
              href="/notes"
              onClick={(e) => e.stopPropagation()}
              className="text-[#6ec3ff] hover:underline"
            >
              [cd /notes]
            </Link>
            <Link
              href="/about"
              onClick={(e) => e.stopPropagation()}
              className="text-[#6ec3ff] hover:underline"
            >
              [cd /about]
            </Link>
          </div>

          {/* Command history */}
          {history.map((item, idx) => (
            <div key={idx}>
              <div>
                <span>miiiwa@MiwanoMacBook-Air ~ % </span>
                <span>{item.cmd}</span>
              </div>
              {item.output && (
                <pre className="whitespace-pre-wrap text-[#e6edf3] leading-[1.4]">
                  {item.output}
                </pre>
              )}
            </div>
          ))}

          {/* Active prompt line with block cursor */}
          <div className="flex items-center flex-wrap">
            <span className="whitespace-pre shrink-0">miiiwa@MiwanoMacBook-Air ~ % </span>
            <div className="relative flex-1 min-w-[160px] flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    runCommand(input);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (cmdHistory.length > 0) {
                      const nextIdx = historyIdx + 1;
                      if (nextIdx < cmdHistory.length) {
                        setHistoryIdx(nextIdx);
                        setInput(cmdHistory[cmdHistory.length - 1 - nextIdx]);
                      }
                    }
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (historyIdx > 0) {
                      const nextIdx = historyIdx - 1;
                      setHistoryIdx(nextIdx);
                      setInput(cmdHistory[cmdHistory.length - 1 - nextIdx]);
                    } else if (historyIdx === 0) {
                      setHistoryIdx(-1);
                      setInput("");
                    }
                  }
                }}
                aria-label="zsh command input"
                className="w-full bg-transparent border-none outline-none text-[#e6edf3] font-mono text-[13px] sm:text-[14px] caret-[#a8b1be]"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {input.length === 0 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 inline-block w-[8.5px] h-[17px] bg-[#9aa2af]/85 animate-pulse"
                />
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
