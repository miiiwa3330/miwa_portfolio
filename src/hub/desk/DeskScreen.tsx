"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Fan, FileText, FolderOpen, Mail, Map as MapIcon, NotebookPen, Power, Terminal, X } from "lucide-react";
import type { SectionType } from "@/types";
import { NAV, PAGE_LINKS } from "@/hub/nav";
import { GithubIcon, XIcon } from "@/ui/icons";
import { NOTES, sortNotesNewestFirst } from "@/data";
import { aboutParagraphs } from "@/hub/about/aboutCopy";
import Products from "@/detail/Products";
import Skills from "@/detail/Skills";
import Experience from "@/detail/Experience";
import Contact from "@/detail/Contact";
import NoteList from "@/reading/NoteList";
import { DESK_SCREEN_PX } from "@/scene/room/screens";
import { fanShowNow, setFanShow } from "@/scene/holoFanShow";
import { setDeskView } from "@/scene/deskView";

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
 * Nothing in here may carry `overflow: hidden` — see `RoomHtmlLayer`. The
 * window's body scrolls (`overflow-y: auto`), which prototype 2 measured to
 * be harmless.
 */

type FileKey = NonNullable<SectionType> | "notes";

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

export default function DeskScreen({
  isJa,
  onLeave,
  openTerminal,
}: {
  isJa: boolean;
  /** Stand up from the desk — back to the middle of the room. */
  onLeave: () => void;
  openTerminal: () => void;
}) {
  const [open, setOpen] = useState<FileKey | null>(null);
  // The project an Experience milestone asked Products to open with: the
  // window switches to Products with that project's popup already open.
  const [project, setProject] = useState<string | null>(null);

  const openFile = (key: FileKey) => {
    if (key !== "products") setProject(null);
    setOpen(key);
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
  const current = FILES.find((file) => file.key === open);
  const title = current ? fileName(current.key, isJa ? current.ja : current.en) : "";

  return (
    <section
      aria-label={isJa ? "Miiiwa のPC" : "Miiiwa's PC"}
      // A tap in here is on the screen, not on empty room (Scene's tap gesture).
      data-ui
      className="relative font-sans text-white select-none"
      style={{
        width: DESK_SCREEN_PX.width,
        height: DESK_SCREEN_PX.height,
        background: "radial-gradient(120% 90% at 70% 20%, #1d3b66 0%, #0b1426 55%, #060a14 100%)",
      }}
    >
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

      {open && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute left-[252px] right-5 top-5 bottom-[76px] flex flex-col rounded-xl bg-[#fffdf7] text-gray-900 shadow-2xl shadow-black/60 select-text"
        >
          <div className="flex items-center justify-between h-12 px-5 rounded-t-xl bg-[#101a2e] text-white">
            <span className="text-[17px] font-bold">{title}</span>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label={isJa ? "閉じる" : "Close"}
              className="flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/15"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ zoom: WINDOW_ZOOM }}>
            {open === "about" && (
              <article className="max-w-3xl mx-auto px-10 py-10 text-gray-800 text-[17px] leading-loose space-y-5">
                {aboutParagraphs(isJa).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </article>
            )}
            {open === "products" && <Products initialProject={project} />}
            {open === "skills" && <Skills />}
            {open === "experience" && (
              <Experience
                onOpenProject={(slug) => {
                  setProject(slug);
                  setOpen("products");
                }}
              />
            )}
            {open === "contact" && <Contact />}
            {open === "notes" && (
              <div className="px-10 py-10">
                <NoteList notes={sortNotesNewestFirst(NOTES)} titleAs="h3" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* The taskbar. */}
      <div className="absolute inset-x-0 bottom-0 h-14 flex items-center gap-4 px-5 bg-black/70 rounded-b-sm">
        <span className="text-[17px] font-black tracking-tight">
          Miiiwa<span className="text-orange-500">.</span>
          <span className="ml-1 font-mono font-normal text-white/60 text-[14px]">OS</span>
        </span>
        {open && <span className="px-3 py-1 rounded-md bg-white/15 text-[15px]">{title}</span>}
        <button
          type="button"
          onClick={onLeave}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-[15px]"
        >
          <Power size={18} />
          {isJa ? "席を立つ" : "Stand up"}
        </button>
      </div>
    </section>
  );
}
