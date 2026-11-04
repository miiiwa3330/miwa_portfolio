/**
 * How far the room has got towards its first picture, for the boot screen
 * (`hub/BootScreen.tsx`, 2026-11-04, the user: 「サイトアクセス時最初の画面が
 * 描画されるまでのローディング画面」):
 *
 *  - `html`: the prerendered page, before its scripts run
 *  - `hydrated`: the scripts have run (the boot screen's own effect says so)
 *  - `built`: the scene graph exists, nothing drawn yet (the canvas's `onCreated`)
 *  - `drawn`: the first frame has been drawn (`Scene`'s `FirstFrame`)
 *
 * **The boot screen is painted by a small inline script, not by React**
 * (`bootScript`, below, inlined into the page's HTML). It has to count the
 * page's script files arriving before any of them has run, and it is the one
 * thing that moves the bar — React never re-renders it. What the scene says
 * here is handed on to it (`window.__miiiwaBoot`).
 *
 * Only ever moves forward, and once per page load: coming back to the room
 * from a reading page builds a new canvas, but the boot screen is for arriving
 * at the site, not for every return.
 */

export const BOOT_STAGES = ["html", "hydrated", "built", "drawn"] as const;
export type BootStage = (typeof BOOT_STAGES)[number];

declare global {
  interface Window {
    /** Set by `bootScript` once it is painting: tells it a stage has been reached. */
    __miiiwaBoot?: (stage: BootStage) => void;
  }
}

/** Whichever of two stages is further along. */
export function laterStage(a: BootStage, b: BootStage): BootStage {
  return BOOT_STAGES.indexOf(b) > BOOT_STAGES.indexOf(a) ? b : a;
}

let current: BootStage = "html";

/** The stage reached so far. */
export function bootNow(): BootStage {
  return current;
}

/** Say a stage has been reached. A no-op when it is not further along than the current one. */
export function publishBoot(stage: BootStage): void {
  const next = laterStage(current, stage);
  if (next === current) return;
  current = next;
  if (typeof window !== "undefined") window.__miiiwaBoot?.(next);
}

/** The bar's length, in dashes. */
export const BOOT_BAR_WIDTH = 24;

/**
 * The share done, in whole percent: 100 only once everything is.
 *
 * Self-contained (no imports, no outer names), like `bootBar` and
 * `bootScript`: all three are inlined into the page as their own source.
 */
export function bootPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((done * 100) / total)));
}

/** How many of the bar's dashes are lit at a percentage. */
export function bootBar(percent: number, width: number): number {
  return Math.round((percent * width) / 100);
}

/** What the boot screen's script needs of `window` (narrowed, so a test can hand it a stand-in). */
export type BootWindow = {
  __miiiwaBoot?: (stage: BootStage) => void;
  PerformanceObserver?: { new (callback: (list: { getEntries(): { name: string }[] }) => void): { observe(options: object): void } };
  setTimeout(callback: () => void, ms: number): unknown;
  MutationObserver?: { new (callback: () => void): { observe(target: unknown, options: object): void; disconnect(): void } };
};

/** What it needs of `document`. */
export type BootDocument = {
  getElementById(id: string): BootElement | null;
  querySelectorAll(selectors: string): ArrayLike<{ src?: string; href?: string; noModule?: boolean }>;
  addEventListener(type: string, listener: () => void): void;
};

export type BootElement = {
  querySelector(selectors: string): { textContent: string | null; style: { color: string } } | null;
  setAttribute(name: string, value: string): void;
  style: { opacity: string; pointerEvents: string; display: string };
};

/**
 * Paints the boot screen (`#miiiwa-boot`) from the moment it is parsed: the
 * page's script files as they arrive, then the three stages after them,
 * each one a unit of the same size (nothing weights them — there is no
 * measure of how long each takes on the reader's machine). At 100% the
 * percentage turns to `[OK]`, holds a moment, and the screen fades out.
 *
 * Self-contained — it runs as the page's own source (`bootInlineScript`),
 * before any bundle, so it may use nothing but its arguments. The percentage
 * never goes back: a script file found later (the body's, once the page is
 * parsed) adds to the total.
 *
 * **It looks the screen's parts up afresh and paints again whenever they
 * are replaced.** In development React puts the bar's inside back as it
 * was prerendered (measured on a phone: at 0.58 s, after the script had
 * painted 95%, and after the scripts had said they had run), and parts held
 * from before then are no longer on the page. A `MutationObserver` on the
 * bar's own children (`[data-bar]`) sees it; the script's own writes are a
 * level below, inside the parts, so they do not set it off.
 */
export function bootScript(percent: typeof bootPercent, bar: typeof bootBar, width: number, win: BootWindow, doc: BootDocument): void {
  if (!doc.getElementById("miiiwa-boot") || win.__miiiwaBoot) return;
  const seen: Record<string, boolean> = {};
  let total = 0;
  let loaded = 0;
  let stages = 0;
  let shown = 0;
  let leaving = false;
  const order = ["html", "hydrated", "built", "drawn"];

  function count() {
    const nodes = doc.querySelectorAll('script[src],link[rel="preload"][as="script"]');
    for (let i = 0; i < nodes.length; i++) {
      const url = nodes[i].src || nodes[i].href || "";
      if (url.indexOf("/_next/static/chunks/") < 0 || nodes[i].noModule || url in seen) continue;
      seen[url] = false;
      total++;
    }
  }
  function arrived(url: string) {
    if (url in seen && !seen[url]) {
      seen[url] = true;
      loaded++;
    }
  }
  function dashes(n: number) {
    let s = "";
    for (let i = 0; i < n; i++) s += "-";
    return s;
  }
  function paint() {
    const root = doc.getElementById("miiiwa-boot");
    if (!root) return;
    const p = Math.max(shown, percent(loaded + stages, total + order.length - 1));
    shown = p;
    const n = bar(p, width);
    const lit = root.querySelector("[data-lit]");
    const dim = root.querySelector("[data-dim]");
    const pct = root.querySelector("[data-pct]");
    if (lit) lit.textContent = dashes(n);
    if (dim) dim.textContent = dashes(width - n);
    root.setAttribute("aria-valuenow", String(p));
    if (pct) {
      pct.textContent = p < 100 ? p + "%" : "[OK]";
      pct.style.color = p < 100 ? "" : "#34d399";
    }
    if (p < 100 || leaving) return;
    leaving = true;
    const screen = root;
    win.setTimeout(function () {
      if (watch) watch.disconnect();
      screen.style.opacity = "0";
      screen.style.pointerEvents = "none";
      win.setTimeout(function () {
        screen.style.display = "none";
      }, 400);
    }, 450);
  }

  const watch = win.MutationObserver ? new win.MutationObserver(paint) : null;
  const track = doc.getElementById("miiiwa-boot")?.querySelector("[data-bar]");
  if (watch && track) watch.observe(track, { childList: true });
  count();
  if (win.PerformanceObserver) {
    try {
      new win.PerformanceObserver(function (list) {
        const entries = list.getEntries();
        for (let i = 0; i < entries.length; i++) arrived(entries[i].name);
        paint();
      }).observe({ type: "resource", buffered: true });
    } catch {
      // Without it, the files count as arrived once the scripts have run.
    }
  }
  doc.addEventListener("DOMContentLoaded", function () {
    count();
    paint();
  });
  win.__miiiwaBoot = function (stage) {
    // The scripts have run, so every file they came in has arrived.
    if (stage !== "html") {
      count();
      for (const url in seen) arrived(url);
    }
    stages = Math.max(stages, order.indexOf(stage));
    paint();
  };
  paint();
}

/** `bootScript`, as the inline script the page carries. */
export const bootInlineScript = `(${bootScript.toString()})(${bootPercent.toString()},${bootBar.toString()},${BOOT_BAR_WIDTH},window,document)`;
