"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Lock, RotateCw, X } from "lucide-react";
import { hideRealCursorOverScreens } from "@/scene/deskPointer";
import { frameToScreen, pcFrameInput } from "@/scene/frameInput";
import { SITE_HOST, addressOf, addressToPath, leavesSite } from "./pcPage";

/**
 * How much larger the page is drawn than it is laid out. **Provisional (仮).**
 * At the seated zoom the GUI's px come out at about 0.7 of their size on a
 * 1600px frame (measured on the first, 1240px screen; the larger monitor
 * keeps the same px to the metre, `DESK_SCREEN_PX`), so a page's 16px body
 * text is about 11px. The prototype read comfortably at 22px; 1.3 brings
 * 16px to about 21px. The page lays out at the frame's width over this — as
 * on a window that wide, which is what it is.
 */
const FRAME_SCALE = 1.3;

/** How often the bar reads where the page has got to (ms) — see the effect. */
const FOLLOW_MS = 250;

/** The Navigation API, where the browser has it: this frame's own history (`history.length` is the whole tab's). */
type FrameNavigation = { canGoBack: boolean; canGoForward: boolean };

/** Where an element sits within an ancestor, in the ancestor's own px — the layout's, before any transform. */
function offsetWithin(el: HTMLElement, ancestor: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let at: HTMLElement | null = el;
  while (at && at !== ancestor) {
    x += at.offsetLeft;
    y += at.offsetTop;
    at = at.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/**
 * miiiwa.com, in a browser on the PC (2026-11-04, the user:
 * 「miiiwa.comをPC内PCで忠実に再現」): the site itself in an `<iframe>`, so
 * everything it does, it does in here — its pages, its header and menu, the
 * room at `/` (a room inside the room) — with back, forward, reload and an
 * address bar around it. The same origin lets the bar read where the page is.
 *
 * **What happens in the frame stays in it**, so it is passed on: the pointer,
 * the wheel and the keys to the room (`frameInput`), so that the desk's mouse
 * and keyboard move and the drawn cursor stays on the screen; and the real
 * cursor is hidden in there too while the drawn one stands in for it. A link
 * that leaves the site opens in a tab of its own beside the room
 * (`leavesSite`): most sites refuse to be framed, and the room could not
 * read where the page had gone.
 *
 * Nothing in here may carry `overflow: hidden` — see `RoomHtmlLayer`. The
 * frame is scaled up with a transform rather than `zoom`.
 */
export default function PcBrowser({ isJa, onClose, onTitle }: { isJa: boolean; onClose: () => void; onTitle: (title: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [address, setAddress] = useState(SITE_HOST);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);
  // What the reader is typing into the address bar; null while they are not.
  const [typed, setTyped] = useState<string | null>(null);
  const reportTitle = useRef(onTitle);
  useEffect(() => {
    reportTitle.current = onTitle;
  });

  /**
   * Following the page: read, a few times a second, where it is, its title
   * and its history. Every way a page moves is covered by the one read — the
   * site's own links (`pushState`), a hash, a full load, the title written
   * after the route has changed — where events would need one listener each,
   * put back in every new document. Back and forward are only offered where
   * the Navigation API can say they stay in the frame: `history.back()` from
   * the frame's first page goes back in the whole tab, out of the room.
   */
  useEffect(() => {
    let title = "";
    const follow = () => {
      try {
        const win = frame.current?.contentWindow;
        if (!win) return;
        setAddress(addressOf(win.location));
        const navigation = (win as Window & { navigation?: FrameNavigation }).navigation;
        setCanBack(!!navigation?.canGoBack);
        setCanForward(!!navigation?.canGoForward);
        if (win.document.title !== title) {
          title = win.document.title;
          reportTitle.current(title);
        }
      } catch {
        // Another origin (not reached from here: such links open in a tab).
      }
    };
    const timer = window.setInterval(follow, FOLLOW_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Listening in the frame, put back in each document it loads.
  const detach = useRef<(() => void) | null>(null);
  useEffect(() => () => detach.current?.(), []);

  const listenInFrame = () => {
    detach.current?.();
    detach.current = null;
    const el = frame.current;
    const screen = el?.closest("section");
    let win: Window | null | undefined;
    let doc: Document;
    try {
      win = el?.contentWindow;
      if (!el || !screen || !win) return;
      doc = win.document;
    } catch {
      return;
    }
    const frameWin = win;
    const origin = offsetWithin(el, screen);
    const pointer = (type: "move" | "down" | "up") => (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pcFrameInput.emit({ kind: "pointer", type, at: frameToScreen({ x: e.clientX, y: e.clientY }, origin, FRAME_SCALE), buttons: e.buttons, target: e.target });
    };
    const move = pointer("move");
    const down = pointer("down");
    const up = pointer("up");
    const out = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && !e.relatedTarget) pcFrameInput.emit({ kind: "pointer", type: "move", at: null, buttons: e.buttons, target: null });
    };
    const wheel = (e: WheelEvent) => pcFrameInput.emit({ kind: "wheel", deltaY: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1) });
    const keyDown = (e: KeyboardEvent) => pcFrameInput.emit({ kind: "key", type: "down", code: e.code });
    const keyUp = (e: KeyboardEvent) => pcFrameInput.emit({ kind: "key", type: "up", code: e.code });
    const click = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || !leavesSite(anchor.href, frameWin.location.origin)) return;
      e.preventDefault();
      window.open(anchor.href, "_blank", "noopener,noreferrer");
    };
    frameWin.addEventListener("pointermove", move, true);
    frameWin.addEventListener("pointerdown", down, true);
    frameWin.addEventListener("pointerup", up, true);
    doc.addEventListener("pointerout", out, true);
    frameWin.addEventListener("wheel", wheel, { capture: true, passive: true });
    frameWin.addEventListener("keydown", keyDown, true);
    frameWin.addEventListener("keyup", keyUp, true);
    doc.addEventListener("click", click, true);
    const showCursor = hideRealCursorOverScreens(doc, "data-pc-frame-cursor");
    detach.current = () => {
      showCursor();
      frameWin.removeEventListener("pointermove", move, true);
      frameWin.removeEventListener("pointerdown", down, true);
      frameWin.removeEventListener("pointerup", up, true);
      doc.removeEventListener("pointerout", out, true);
      frameWin.removeEventListener("wheel", wheel, true);
      frameWin.removeEventListener("keydown", keyDown, true);
      frameWin.removeEventListener("keyup", keyUp, true);
      doc.removeEventListener("click", click, true);
    };
  };

  const frameWindow = () => frame.current?.contentWindow ?? null;

  const submitAddress = (e: FormEvent) => {
    e.preventDefault();
    const next = addressToPath(typed ?? "");
    // Another site: the bar keeps what was typed, and the page stays.
    if (next === null) return;
    setTyped(null);
    (document.activeElement as HTMLElement | null)?.blur();
    frameWindow()?.location.assign(next);
  };

  const toolButton = "flex items-center justify-center w-9 h-9 rounded-md hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div
      role="dialog"
      aria-label={SITE_HOST}
      className="absolute left-[136px] right-5 top-5 bottom-[76px] flex flex-col rounded-xl bg-white shadow-2xl shadow-black/60"
    >
      {/* The browser's own bar: back, forward, reload, the address, close. */}
      <div className="flex items-center gap-1 h-14 px-3 rounded-t-xl bg-[#101a2e] text-white">
        <button type="button" onClick={() => frameWindow()?.history.back()} disabled={!canBack} aria-label={isJa ? "戻る" : "Back"} className={toolButton}>
          <ArrowLeft size={20} />
        </button>
        <button type="button" onClick={() => frameWindow()?.history.forward()} disabled={!canForward} aria-label={isJa ? "進む" : "Forward"} className={toolButton}>
          <ArrowRight size={20} />
        </button>
        <button type="button" onClick={() => frameWindow()?.location.reload()} aria-label={isJa ? "再読み込み" : "Reload"} className={toolButton}>
          <RotateCw size={18} />
        </button>
        <form onSubmit={submitAddress} className="flex-1 min-w-0 mx-2">
          <label className="flex items-center gap-2 h-9 px-4 rounded-full bg-white/10 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-orange-400">
            <Lock size={14} className="shrink-0 text-white/50" aria-hidden="true" />
            <input
              value={typed ?? address}
              onChange={(e) => setTyped(e.target.value)}
              onFocus={(e) => e.target.select()}
              onBlur={() => setTyped(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.blur();
              }}
              aria-label={isJa ? "アドレス" : "Address"}
              spellCheck={false}
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent font-mono text-[16px] text-white outline-none"
            />
          </label>
        </form>
        <button type="button" onClick={onClose} aria-label={isJa ? "閉じる" : "Close"} className={toolButton}>
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <iframe
          ref={frame}
          src="/"
          title={SITE_HOST}
          onLoad={listenInFrame}
          className="absolute left-0 top-0 border-0 rounded-b-xl origin-top-left bg-white"
          style={{ width: `${100 / FRAME_SCALE}%`, height: `${100 / FRAME_SCALE}%`, transform: `scale(${FRAME_SCALE})` }}
        />
      </div>
    </div>
  );
}
