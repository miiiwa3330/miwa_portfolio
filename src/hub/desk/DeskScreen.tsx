"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowLeft, BookOpen, Fan, FileText, FolderOpen, Mail, Map as MapIcon, NotebookPen, Power, Terminal, X } from "lucide-react";
import { NAV, PAGE_LINKS } from "@/hub/nav";
import { GithubIcon, XIcon } from "@/ui/icons";
import { NOTES, PROJECTS, localizeNote, localizeProject, sortNotesNewestFirst } from "@/data";
import { aboutParagraphs } from "@/hub/about/aboutCopy";
import Products from "@/detail/Products";
import Skills from "@/detail/Skills";
import Experience from "@/detail/Experience";
import Contact from "@/detail/Contact";
import NoteList from "@/reading/NoteList";
import { DESK_SCREEN_PX } from "@/scene/room/screens";
import { fanShowNow, setFanShow } from "@/scene/holoFanShow";
import { setDeskView } from "@/scene/deskView";
import { pcPageForHref, type FileKey, type PcPage } from "./pcPage";
import PcArticle from "./PcArticle";

/**
 * The PC's own screen: a desktop with a file for each area, the notes, and
 * `自己紹介.holo`, which puts the self-introduction on the hologram fan,
 * shortcuts to GitHub, X and the terminal — everything the dock's PC icon
 * holds, and everything the five areas hold (docs/room-migration.md).
 *
 * Laid out at the screen's own resolution (`DESK_SCREEN_PX`) and drawn on the
 * middle monitor by `RoomPanel`. **A file is read to the end in here** (the
 * user's call, 2026-10-01): the window holds the very components the detail
 * sheet does, so the two cannot say different things.
 *
 * **Nothing in it leaves the room** (2026-11-04, the user: 「PC内PCでボタンを
 * 押した時は、画面遷移せずにそのPC内で表示されるように」). A link in the
 * window to one of the site's own pages opens that page in the window instead
 * (`pcPageForHref`), with a back button in the title bar; only a link to
 * another site still opens in a new tab.
 *
 * Nothing in here may carry `overflow: hidden` — see `RoomHtmlLayer`. The
 * window's body scrolls (`overflow-y: auto`), which prototype 2 measured to
 * be harmless.
 */

const FILE_ICONS: Record<FileKey, ReactNode> = {
  about: <FileText size={40} strokeWidth={1.5} />,
  products: <FolderOpen size={40} strokeWidth={1.5} />,
  skills: <BookOpen size={40} strokeWidth={1.5} />,
  experience: <MapIcon size={40} strokeWidth={1.5} />,
  contact: <Mail size={40} strokeWidth={1.5} />,
  notes: <NotebookPen size={40} strokeWidth={1.5} />,
};

/** The files on the desktop, named the way the navigation names them. */
const FILES: { key: FileKey; ja: string; en: string }[] = [
  ...NAV.map((item) => ({ key: item.section as FileKey, ja: item.ja, en: item.en })),
  ...PAGE_LINKS.map((link) => ({ key: "notes" as const, ja: link.ja, en: link.en })),
];

/** The about file is the one plain-text file; the rest read as folders. */
function fileName(key: FileKey, label: string): string {
  return key === "about" ? `${label}.txt` : label;
}

/**
 * How much larger the window's contents are drawn than on their own pages
 * (`/products`, …), where the same components are laid out.
 * **Provisional (仮).** At the seated zoom the GUI's px come out at about 0.7
 * of their size on a 1600px frame (measured on the first, 1240px screen;
 * the larger monitor keeps the same px to the metre, `DESK_SCREEN_PX`), so
 * a page's 16px body text is about 11px. The prototype read comfortably
 * at 22px; 1.3 brings 16px to about 21px.
 */
const WINDOW_ZOOM = 1.3;

/**
 * The desktop's wallpaper (2026-11-04, the user's picture). Dark, so the
 * icons' white labels read on it as they did on the gradient before.
 */
const WALLPAPER = "/images/pc_wallpaper.webp";

/**
 * The PC's power (2026-11-04, the user: the taskbar's 「席を立つ」 became the
 * PC's power). Shutting down closes the window and leaves the screen black;
 * pressed there, it boots again.
 */
type Power = "on" | "shutting-down" | "off" | "booting";

/** How long shutting down and booting take (ms). Provisional (仮). */
const SHUTDOWN_MS = 1200;
const BOOT_MS = 1600;

/** One string per page, to tell two apart. */
function pageId(page: PcPage): string {
  return page.kind === "file" ? `file/${page.file}` : `${page.kind}/${page.slug}`;
}

function Icon({ label, icon, onOpen, href }: { label: string; icon: ReactNode; onOpen?: () => void; href?: string }) {
  const body = (
    <>
      <span className="flex items-center justify-center w-16 h-16 rounded-xl bg-white/10 text-white group-hover:bg-white/20">
        {icon}
      </span>
      <span className="mt-2 text-[15px] leading-tight text-white text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
        {label}
      </span>
    </>
  );
  const className =
    "group flex flex-col items-center w-[104px] p-2 rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onOpen} className={className}>
      {body}
    </button>
  );
}

export default function DeskScreen({ isJa, openTerminal }: { isJa: boolean; openTerminal: () => void }) {
  const [power, setPower] = useState<Power>("on");
  // The window's pages, the one shown last; empty with the window closed.
  const [pages, setPages] = useState<PcPage[]>([]);
  const page = pages.at(-1) ?? null;

  useEffect(() => {
    if (power !== "shutting-down" && power !== "booting") return;
    const timer = window.setTimeout(() => setPower(power === "booting" ? "on" : "off"), power === "booting" ? BOOT_MS : SHUTDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [power]);

  const shutDown = () => {
    setPages([]);
    setPower("shutting-down");
  };

  const openFile = (file: FileKey) => setPages([{ kind: "file", file }]);
  const go = (next: PcPage) => setPages((shown) => (shown.length > 0 && pageId(shown[shown.length - 1]) === pageId(next) ? shown : [...shown, next]));
  const back = () => setPages((shown) => shown.slice(0, -1));

  /**
   * A link in the window to one of the site's own pages: open it here rather
   * than leave the room. Caught on the way down, before next/link's own
   * handler, which then sees the click handled (`defaultPrevented`) and does
   * not navigate. A click meant for a new tab is left to the browser.
   */
  const catchLink = (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as Element).closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
    const next = pcPageForHref(anchor.getAttribute("href") ?? "");
    if (!next) return;
    e.preventDefault();
    if (next === "desktop") setPages([]);
    else go(next);
  };

  /**
   * The hologram fan (2026-10-25, the user): from the time to the
   * self-introduction, and the head turned to it; opened again while it
   * rolls, back to the time.
   */
  const toggleHolo = () => {
    if (fanShowNow() === "about") {
      setFanShow("clock");
      return;
    }
    setFanShow("about");
    setDeskView("fan");
  };
  const title = page ? pageTitle(page, isJa) : "";

  return (
    <section
      aria-label={isJa ? "Miiiwa のPC" : "Miiiwa's PC"}
      // A tap in here is on the screen, not on empty room (Scene's tap gesture).
      data-ui
      className="relative font-sans text-white select-none"
      style={{
        width: DESK_SCREEN_PX.width,
        height: DESK_SCREEN_PX.height,
        background: power === "on" ? `#060a14 url(${WALLPAPER}) center / cover no-repeat` : "#000",
      }}
    >
      {power === "on" && (
        <>
          {/* The desktop's icons, two columns down the left edge. */}
          <nav className="absolute left-5 top-5 grid grid-cols-2 gap-x-2 gap-y-3" aria-label={isJa ? "ファイル" : "Files"}>
            {FILES.map((file) => (
              <Icon key={file.key} label={fileName(file.key, isJa ? file.ja : file.en)} icon={FILE_ICONS[file.key]} onOpen={() => openFile(file.key)} />
            ))}
            <Icon label={isJa ? "自己紹介.holo" : "About.holo"} icon={<Fan size={40} strokeWidth={1.5} />} onOpen={toggleHolo} />
            <Icon label="GitHub" icon={<GithubIcon size={36} />} href="https://github.com/miiiwa1121" />
            <Icon label="X" icon={<XIcon size={32} />} href="https://x.com/miiiwa3330" />
            <Icon label={isJa ? "ターミナル" : "Terminal"} icon={<Terminal size={40} strokeWidth={1.5} />} onOpen={openTerminal} />
          </nav>

          {page && (
            <div
              role="dialog"
              aria-label={title}
              className="absolute left-[252px] right-5 top-5 bottom-[76px] flex flex-col rounded-xl bg-[#fffdf7] text-gray-900 shadow-2xl shadow-black/60 select-text"
            >
              <div className="flex items-center gap-2 h-12 px-3 rounded-t-xl bg-[#101a2e] text-white">
                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={back}
                    aria-label={isJa ? "戻る" : "Back"}
                    className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/15"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <span className="flex-1 min-w-0 px-2 truncate text-[17px] font-bold">{title}</span>
                <button
                  type="button"
                  onClick={() => setPages([])}
                  aria-label={isJa ? "閉じる" : "Close"}
                  className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/15"
                >
                  <X size={20} />
                </button>
              </div>
              {/* Keyed by the page, so a page opened from a link starts at its top. */}
              <div key={`${pages.length}:${pageId(page)}`} className="flex-1 min-h-0 overflow-y-auto" style={{ zoom: WINDOW_ZOOM }} onClickCapture={catchLink}>
                {page.kind === "file" && page.file === "about" && (
                  <article className="max-w-3xl mx-auto px-10 py-10 text-gray-800 text-[17px] leading-loose space-y-5">
                    {aboutParagraphs(isJa).map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </article>
                )}
                {page.kind === "file" && page.file === "products" && <Products onOpenProject={(slug) => go({ kind: "product", slug })} />}
                {page.kind === "file" && page.file === "skills" && <Skills />}
                {page.kind === "file" && page.file === "experience" && <Experience />}
                {page.kind === "file" && page.file === "contact" && <Contact />}
                {page.kind === "file" && page.file === "notes" && (
                  <div className="px-10 py-10">
                    <NoteList notes={sortNotesNewestFirst(NOTES)} titleAs="h3" />
                  </div>
                )}
                {page.kind !== "file" && <PcArticle kind={page.kind} slug={page.slug} isJa={isJa} />}
              </div>
            </div>
          )}

          {/* The taskbar. */}
          <div className="absolute inset-x-0 bottom-0 h-14 flex items-center gap-4 px-5 bg-black/70 rounded-b-sm">
            <span className="text-[17px] font-black tracking-tight">
              Miiiwa<span className="text-orange-500">.</span>
              <span className="ml-1 font-mono font-normal text-white/60 text-[14px]">OS</span>
            </span>
            {page && <span className="max-w-[40%] truncate px-3 py-1 rounded-md bg-white/15 text-[15px]">{title}</span>}
            <button
              type="button"
              onClick={shutDown}
              aria-label={isJa ? "電源を切る" : "Shut down"}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-[15px]"
            >
              <Power size={18} />
              {isJa ? "電源" : "Power"}
            </button>
          </div>
        </>
      )}

      {power === "shutting-down" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#060a14]">
          <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-hidden="true" />
          <p className="text-[18px] text-white/80">{isJa ? "シャットダウンしています…" : "Shutting down…"}</p>
        </div>
      )}

      {/* Off: a black screen, all of it the way to switch it back on. */}
      {power === "off" && (
        <button
          type="button"
          onClick={() => setPower("booting")}
          aria-label={isJa ? "電源を入れる" : "Power on"}
          className="group absolute inset-0 flex items-center justify-center focus-visible:outline-none"
        >
          <Power size={56} strokeWidth={1.5} className="text-white/15 group-hover:text-white/40 group-focus-visible:text-white/40 transition-colors" />
        </button>
      )}

      {power === "booting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          <span className="text-[44px] font-black tracking-tight">
            Miiiwa<span className="text-orange-500">.</span>
            <span className="ml-2 font-mono font-normal text-white/60 text-[30px]">OS</span>
          </span>
          <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" aria-hidden="true" />
        </div>
      )}
    </section>
  );
}

/** The window's title: a file's name, or the write-up's own title. */
function pageTitle(page: PcPage, isJa: boolean): string {
  const language = isJa ? "ja" : "en";
  if (page.kind === "file") {
    const file = FILES.find((f) => f.key === page.file);
    return file ? fileName(file.key, isJa ? file.ja : file.en) : "";
  }
  if (page.kind === "product") {
    const project = PROJECTS.find((p) => p.slug === page.slug);
    return project ? localizeProject(project, language).title : "";
  }
  const note = NOTES.find((n) => n.slug === page.slug);
  return note ? localizeNote(note, language).title : "";
}
