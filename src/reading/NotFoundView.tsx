"use client";

import { useRef, useState, type ReactNode } from "react";
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
  "██╗  ██╗ ██████╗ ██╗  ██╗",
  "██║  ██║██╔═████╗██║  ██║",
  "███████║██║██╔██║███████║",
  "╚════██║████╔╝██║╚════██║",
  "     ██║╚██████╔╝     ██║",
  "     ╚═╝ ╚═════╝      ╚═╝",
].join("\n");

const ASCII_ASTRONAUT = [
  "        _..._        ",
  "      .'     '.      ",
  "     /  _   _  \\     ",
  "     | (o)_(o) |     ",
  "      \\   ^   /      ",
  "      /'-----'\\      ",
  "     / /     \\ \\     ",
  "    (_/       \\_)    ",
].join("\n");

type CmdEntry = {
  cmd: string;
  output: ReactNode;
};

export default function NotFoundView() {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const pathname = usePathname() || "/unknown-sector";
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<CmdEntry[]>([]);

  const asciiReportJa = [
    "+------------------------------------------------------------------+",
    "| SYSTEM DIAGNOSTIC : 404 SECTOR_NOT_FOUND                         |",
    "+------------------------------------------------------------------+",
    `| TARGET_PATH       : ${pathname.padEnd(44, " ").slice(0, 44)} |`,
    "| STATUS            : UNREACHABLE (VOID_SPACE)                     |",
    "+------------------------------------------------------------------+",
    "| [MESSAGE]                                                        |",
    "| この区画には、まだ「部屋」が作られていません。                   |",
    "| アクセスしようとしたURLは移動または削除されたか、                |",
    "| コロニーの外の宇宙空間を指しています。                           |",
    "+------------------------------------------------------------------+",
  ].join("\n");

  const asciiReportEn = [
    "+------------------------------------------------------------------+",
    "| SYSTEM DIAGNOSTIC : 404 SECTOR_NOT_FOUND                         |",
    "+------------------------------------------------------------------+",
    `| TARGET_PATH       : ${pathname.padEnd(44, " ").slice(0, 44)} |`,
    "| STATUS            : UNREACHABLE (VOID_SPACE)                     |",
    "+------------------------------------------------------------------+",
    "| [MESSAGE]                                                        |",
    "| This sector of the colony hasn't been built yet.                 |",
    "| The URL you requested may have been moved, deleted, or points    |",
    "| into deep space outside the rocket colony.                       |",
    "+------------------------------------------------------------------+",
  ].join("\n");

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();

    if (lower === "clear") {
      setHistory([]);
      setInput("");
      return;
    }

    if (lower === "home" || lower === "cd /" || lower === "cd ~") {
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

    let output: ReactNode;
    if (lower === "help") {
      output = (
        <pre className="text-green-300 whitespace-pre-wrap">
          {[
            "AVAILABLE RECOVERY COMMANDS:",
            "  home       : Return to the 3D Colony Room (/)",
            "  products   : Jump to Products (/products)",
            "  about      : Jump to About me (/about)",
            "  skills     : Jump to Skills (/skills)",
            "  experience : Jump to Experience (/experience)",
            "  contact    : Jump to Contact (/contact)",
            "  notes      : Jump to Notes (/notes)",
            "  ls         : List available sectors",
            "  clear      : Clear command log",
          ].join("\n")}
        </pre>
      );
    } else if (lower === "ls") {
      output = (
        <pre className="text-green-300 whitespace-pre-wrap">
          {"drwxr-xr-x  / (room)   /about   /products   /skills   /experience   /contact   /notes"}
        </pre>
      );
    } else if (lower === "pwd") {
      output = <span className="text-red-400">{pathname} (UNMAPPED_VOID)</span>;
    } else if (lower === "whoami") {
      output = <span>lost-traveler@miiiwa-colony</span>;
    } else {
      output = (
        <span className="text-amber-400">
          {`zsh: command not found: ${trimmed} (type 'help' or click a command below)`}
        </span>
      );
    }

    setHistory((prev) => [...prev, { cmd: trimmed, output }]);
    setInput("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      <SectionHeading as="h1" en="404 Not Found" className="mb-8 md:mb-12">
        404 ページが見つかりません
      </SectionHeading>

      {/* Main 404 Terminal Window */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        aria-label="404 Terminal"
        onClick={() => inputRef.current?.focus()}
        className="group relative rounded-none bg-[#050505] text-green-400 border border-black overflow-hidden font-mono cursor-text"
      >
        <CornerBrackets
          size="lg"
          offset="card"
          strokeWidth="2"
          colorClass="border-[#ea580c]"
          className="opacity-0 group-hover:opacity-100 transition-opacity z-20"
        />

        {/* CRT scanline overlay inside the terminal box */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 opacity-[0.14] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%),linear-gradient(90deg,rgba(255,0,0,0.05),rgba(0,255,0,0.02),rgba(0,0,255,0.05))] bg-[length:100%_4px,3px_100%]"
        />

        {/* Terminal Top Bar */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-neutral-950 text-neutral-300 border-b border-green-500/30 text-[11px] sm:text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 bg-[#ea580c]" />
            <span className="inline-block w-2.5 h-2.5 bg-amber-400/80" />
            <span className="inline-block w-2.5 h-2.5 bg-green-500/80" />
            <span className="ml-2 font-bold tracking-widest text-green-400 uppercase">
              miiiwa@colony-shell: ~ (tty404)
            </span>
          </div>
          <span className="text-[#ea580c] font-bold tabular-nums">
            [EXIT_CODE: 404_ERR_SECTOR_UNMAPPED]
          </span>
        </div>

        {/* Terminal Body (Pure ASCII) */}
        <div className="relative z-20 p-5 sm:p-8 md:p-10 text-xs sm:text-sm leading-relaxed space-y-5 overflow-x-auto">
          {/* Prompt 1: Locate request */}
          <div>
            <div className="text-white">
              <span className="text-green-500 font-bold">miiiwa@colony:~$</span>{" "}
              <span>locate --sector &quot;{pathname}&quot;</span>
            </div>
            <div className="mt-1 text-red-400">
              zsh: locate: {pathname}: No such sector in rocket colony (HTTP 404)
            </div>
          </div>

          {/* ASCII 404 Banner + Astronaut */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-10 py-2">
            <pre
              aria-label="404"
              className="text-[#ea580c] font-bold text-[11px] sm:text-sm md:text-base leading-[1.15] select-none overflow-x-auto"
            >
              {ASCII_404}
            </pre>
            <pre
              aria-hidden="true"
              className="hidden sm:block text-green-500/80 text-[11px] leading-[1.15] select-none"
            >
              {ASCII_ASTRONAUT}
            </pre>
          </div>

          {/* ASCII Diagnostic Frame */}
          <pre className="text-green-300 text-[11px] sm:text-xs md:text-sm leading-[1.45] overflow-x-auto">
            {isJa ? asciiReportJa : asciiReportEn}
          </pre>

          {/* Clickable ASCII Quick Commands */}
          <div>
            <div className="text-white mb-2">
              <span className="text-green-500 font-bold">miiiwa@colony:~$</span>{" "}
              <span>./recover.sh --select-action</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
              {/* Plain <a> into the hub (see leadsToHub in src/hub/nav.ts) */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                onClick={(e) => e.stopPropagation()}
                className="inline-block px-3.5 py-2 bg-green-500/15 hover:bg-[#ea580c] text-green-300 hover:text-black border border-green-500/50 hover:border-[#ea580c] font-bold transition-colors text-xs sm:text-sm cursor-pointer"
              >
                {isJa ? "[ $ cd /  (部屋・トップへ戻る) ]" : "[ $ cd /  (Return to 3D Room) ]"}
              </a>

              <Link
                href="/products"
                onClick={(e) => e.stopPropagation()}
                className="inline-block px-3.5 py-2 bg-transparent hover:bg-green-500/20 text-green-300 border border-green-500/40 hover:border-green-400 font-bold transition-colors text-xs sm:text-sm"
              >
                {isJa ? "[ $ cd /products  (制作実績を見る) ]" : "[ $ cd /products  (Browse Products) ]"}
              </Link>

              <Link
                href="/notes"
                onClick={(e) => e.stopPropagation()}
                className="inline-block px-3.5 py-2 bg-transparent hover:bg-green-500/20 text-green-300 border border-green-500/40 hover:border-green-400 font-bold transition-colors text-xs sm:text-sm"
              >
                {isJa ? "[ $ cd /notes  (ノートを読む) ]" : "[ $ cd /notes  (Read Notes) ]"}
              </Link>
            </div>
          </div>

          {/* Interactive command history */}
          {history.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-white">
                <span className="text-green-500 font-bold">miiiwa@colony:~$</span> {item.cmd}
              </div>
              <div className="pl-2">{item.output}</div>
            </div>
          ))}

          {/* Live interactive prompt */}
          <div className="flex items-center pt-1">
            <span className="text-green-500 font-bold mr-2 shrink-0">miiiwa@colony:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  runCommand(input);
                }
              }}
              placeholder={
                isJa
                  ? "help / ls / home / products などを入力して Enter..."
                  : "Type 'help', 'ls', 'home', 'products' and press Enter..."
              }
              aria-label="Terminal command input"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-white placeholder:text-green-700/70 font-mono text-xs sm:text-sm"
              autoComplete="off"
              spellCheck={false}
            />
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
