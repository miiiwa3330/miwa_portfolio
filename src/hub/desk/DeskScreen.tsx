"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Fan, Globe, Power, Terminal } from "lucide-react";
import { GithubIcon, XIcon } from "@/ui/icons";
import { DESK_SCREEN_PX } from "@/scene/room/screens";
import { fanShowNow, setFanShow } from "@/scene/holoFanShow";
import { setDeskView } from "@/scene/deskView";
import { SITE_HOST } from "./pcPage";
import PcBrowser from "./PcBrowser";
import TerminalScreen from "@/terminal/TerminalScreen";

/**
 * The PC's own screen (2026-11-04, the user): a desktop with two icons —
 * `miiiwa.com`, the site itself in a browser (`PcBrowser`), and
 * `自己紹介.holo`, which puts the self-introduction on the hologram fan — and
 * a taskbar holding the terminal (drawn over this screen, `TerminalScreen`),
 * GitHub and X, and the PC's power.
 *
 * Laid out at the screen's own resolution (`DESK_SCREEN_PX`) and drawn on the
 * middle monitor by `RoomPanel`. **A page is read to the end in here** (the
 * user's call, 2026-10-01).
 *
 * Nothing in here may carry `overflow: hidden` — see `RoomHtmlLayer`.
 */

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

const GITHUB_URL = "https://github.com/miiiwa1121";
const X_URL = "https://x.com/miiiwa3330";

function Icon({ label, icon, onOpen }: { label: string; icon: ReactNode; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col items-center w-[104px] p-2 rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
    >
      <span className="flex items-center justify-center w-16 h-16 rounded-xl bg-white/10 text-white group-hover:bg-white/20">{icon}</span>
      <span className="mt-2 text-[15px] leading-tight text-white text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{label}</span>
    </button>
  );
}

/** A program pinned to the taskbar: opens a window of its own, or a site in a new tab. */
function TaskbarApp({ label, icon, onOpen, href }: { label: string; icon: ReactNode; onOpen?: () => void; href?: string }) {
  const className = "flex items-center justify-center w-11 h-11 rounded-md text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className}>
      {icon}
    </a>
  ) : (
    <button type="button" onClick={onOpen} aria-label={label} title={label} className={className}>
      {icon}
    </button>
  );
}

export default function DeskScreen({ isJa }: { isJa: boolean }) {
  const [power, setPower] = useState<Power>("on");
  const [browserOpen, setBrowserOpen] = useState(false);
  // The page the browser shows, as it names itself (its `<title>`), for the taskbar.
  const [pageTitle, setPageTitle] = useState("");
  const [tooDeep, setTooDeep] = useState(false);
  // The terminal, over this screen rather than the whole window (2026-11-04, the user).
  const [terminalOpen, setTerminalOpen] = useState(false);

  useEffect(() => {
    if (power !== "shutting-down" && power !== "booting") return;
    const timer = window.setTimeout(() => setPower(power === "booting" ? "on" : "off"), power === "booting" ? BOOT_MS : SHUTDOWN_MS);
    return () => window.clearTimeout(timer);
  }, [power]);

  const shutDown = () => {
    setBrowserOpen(false);
    setTooDeep(false);
    setTerminalOpen(false);
    setPower("shutting-down");
  };

  /**
   * Opened at `/` — the room, inside the room. **One level deep** (the
   * user's choice of a room inside the room, 2026-11-04): in the PC of the
   * room in the browser, this is itself in a frame, and there it says so
   * rather than open a third room, and a fourth.
   */
  const openBrowser = () => {
    if (window.self !== window.top) setTooDeep(true);
    else setBrowserOpen(true);
  };
  const closeBrowser = () => {
    setBrowserOpen(false);
    setPageTitle("");
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
          {/* The desktop's icons, down the left edge. */}
          <nav className="absolute left-5 top-5 flex flex-col gap-3" aria-label={isJa ? "デスクトップ" : "Desktop"}>
            <Icon label={SITE_HOST} icon={<Globe size={40} strokeWidth={1.5} />} onOpen={openBrowser} />
            <Icon label={isJa ? "自己紹介.holo" : "About.holo"} icon={<Fan size={40} strokeWidth={1.5} />} onOpen={toggleHolo} />
          </nav>

          {browserOpen && <PcBrowser isJa={isJa} onClose={closeBrowser} onTitle={setPageTitle} />}

          {tooDeep && (
            <div
              role="alertdialog"
              aria-label={SITE_HOST}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] p-7 rounded-xl bg-[#101a2e] text-white shadow-2xl shadow-black/60"
            >
              <p className="text-[18px] leading-relaxed">
                {isJa
                  ? "ここは、PC の中の miiiwa.com の部屋の PC です。この中でまた miiiwa.com を開くと、部屋がどこまでも続いてしまうので、開けません。"
                  : "This is the PC in the room of miiiwa.com, inside the PC. Opened again in here, miiiwa.com would show a room inside a room without end, so it does not open."}
              </p>
              <button type="button" onClick={() => setTooDeep(false)} className="mt-5 px-5 py-2 rounded-md bg-white/15 hover:bg-white/25 text-[16px]">
                OK
              </button>
            </div>
          )}

          {/* The taskbar. */}
          <div className="absolute inset-x-0 bottom-0 h-14 flex items-center gap-2 px-5 bg-black/70 rounded-b-sm">
            <span className="mr-3 text-[17px] font-black tracking-tight">
              Miiiwa<span className="text-orange-500">.</span>
              <span className="ml-1 font-mono font-normal text-white/60 text-[14px]">OS</span>
            </span>
            <TaskbarApp label={isJa ? "ターミナル" : "Terminal"} icon={<Terminal size={22} />} onOpen={() => setTerminalOpen(true)} />
            <TaskbarApp label="GitHub" icon={<GithubIcon size={22} />} href={GITHUB_URL} />
            <TaskbarApp label="X" icon={<XIcon size={19} />} href={X_URL} />
            {/* The open window, after the pinned programs. */}
            {browserOpen && (
              <button
                type="button"
                onClick={openBrowser}
                className="ml-3 flex items-center gap-2 max-w-[40%] h-11 px-3 rounded-md bg-white/15 hover:bg-white/20 text-[15px]"
              >
                <Globe size={18} className="shrink-0" />
                <span className="truncate">{pageTitle || SITE_HOST}</span>
              </button>
            )}
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

          <TerminalScreen isOpen={terminalOpen} closeTerminal={() => setTerminalOpen(false)} fill="screen" />
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
