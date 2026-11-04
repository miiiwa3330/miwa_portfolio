import { describe, expect, it } from "vitest";
import { BOOT_BAR_WIDTH, bootBar, bootInlineScript, bootPercent, laterStage, type BootStage } from "./bootChannel";

describe("bootPercent", () => {
  it("is 100 only once everything is done", () => {
    expect(bootPercent(0, 18)).toBe(0);
    expect(bootPercent(17, 18)).toBe(94);
    expect(bootPercent(18, 18)).toBe(100);
    expect(bootPercent(0, 0)).toBe(0);
  });
});

describe("bootBar", () => {
  it("lights none of the dashes at 0% and all of them at 100%", () => {
    expect(bootBar(0, BOOT_BAR_WIDTH)).toBe(0);
    expect(bootBar(50, BOOT_BAR_WIDTH)).toBe(BOOT_BAR_WIDTH / 2);
    expect(bootBar(100, BOOT_BAR_WIDTH)).toBe(BOOT_BAR_WIDTH);
  });
});

describe("laterStage", () => {
  it("only moves forward", () => {
    expect(laterStage("built", "hydrated")).toBe("built");
    expect(laterStage("hydrated", "built")).toBe("built");
  });
});

/** A page with the boot screen and `chunks` script files, for the inline script to run against. */
function page(chunks: number) {
  const part = () => ({ textContent: "" as string | null, style: { color: "" } });
  const parts: Record<string, ReturnType<typeof part>> = { "[data-bar]": part(), "[data-lit]": part(), "[data-dim]": part(), "[data-pct]": part() };
  const attributes: Record<string, string> = {};
  const root = {
    querySelector: (s: string) => parts[s] ?? null,
    setAttribute: (name: string, value: string) => (attributes[name] = value),
    style: { opacity: "", pointerEvents: "", display: "" },
  };
  const scripts = [
    ...Array.from({ length: chunks }, (_, i) => ({ src: `https://miiiwa.com/_next/static/chunks/${i}.js` })),
    { src: "https://miiiwa.com/_next/static/chunks/polyfill.js", noModule: true },
    { src: "https://pagead2.googlesyndication.com/adsbygoogle.js" },
  ];
  let observer: ((list: { getEntries(): { name: string }[] }) => void) | null = null;
  let replaced: (() => void) | null = null;
  let watched: unknown = null;
  const timers: (() => void)[] = [];
  const win: { __miiiwaBoot?: (stage: BootStage) => void } & Record<string, unknown> = {
    PerformanceObserver: class {
      constructor(callback: typeof observer) {
        observer = callback;
      }
      observe() {}
    },
    setTimeout: (callback: () => void) => timers.push(callback),
    MutationObserver: class {
      constructor(callback: () => void) {
        replaced = callback;
      }
      observe(target: unknown) {
        watched = target;
      }
      disconnect() {}
    },
  };
  const doc = {
    getElementById: (id: string) => (id === "miiiwa-boot" ? root : null),
    querySelectorAll: () => scripts,
    addEventListener: () => {},
  };
  // The very text the page carries, run as the browser would run it.
  new Function("window", "document", bootInlineScript)(win, doc);
  return {
    win,
    root,
    parts,
    attributes,
    watched: () => watched,
    arrive: (i: number) => observer?.({ getEntries: () => [{ name: scripts[i].src }] }),
    /** React puts the bar's inside back as it was prerendered. */
    replace: () => {
      for (const key of Object.keys(parts)) if (key !== "[data-bar]") parts[key] = { textContent: key === "[data-pct]" ? "0%" : "", style: { color: "" } };
      replaced?.();
    },
    runTimers: () => timers.splice(0).forEach((t) => t()),
  };
}

describe("bootInlineScript", () => {
  it("starts at 0%, with the whole bar dim", () => {
    const p = page(3);
    expect(p.parts["[data-pct]"].textContent).toBe("0%");
    expect(p.parts["[data-dim]"].textContent).toBe("-".repeat(BOOT_BAR_WIDTH));
    expect(p.win.__miiiwaBoot).toBeTypeOf("function");
  });

  it("counts the page's own script files arriving, and nothing else", () => {
    // 3 files and the 3 stages after them: each file is a sixth.
    const p = page(3);
    p.arrive(0);
    expect(p.parts["[data-pct]"].textContent).toBe("16%");
    p.arrive(3); // the polyfill: not counted
    p.arrive(4); // the ad's script: not counted
    expect(p.parts["[data-pct]"].textContent).toBe("16%");
    expect(p.attributes["aria-valuenow"]).toBe("16");
  });

  it("turns to [OK] at the first frame, then fades out and hides", () => {
    const p = page(3);
    p.win.__miiiwaBoot!("hydrated");
    expect(p.parts["[data-pct]"].textContent).toBe("66%");
    p.win.__miiiwaBoot!("built");
    expect(p.parts["[data-pct]"].textContent).toBe("83%");
    expect(p.root.style.display).toBe("");
    p.win.__miiiwaBoot!("drawn");
    expect(p.parts["[data-pct]"].textContent).toBe("[OK]");
    expect(p.parts["[data-lit]"].textContent).toBe("-".repeat(BOOT_BAR_WIDTH));
    expect(p.parts["[data-dim]"].textContent).toBe("");
    p.runTimers();
    expect(p.root.style.opacity).toBe("0");
    p.runTimers();
    expect(p.root.style.display).toBe("none");
  });

  it("puts the bar back when the screen's inside has been replaced (React's hydration in development)", () => {
    const p = page(3);
    // The bar, not the whole screen: the logo above it is React's own.
    expect(p.watched()).toBe(p.parts["[data-bar]"]);
    p.win.__miiiwaBoot!("built");
    // After the last thing it was told, nothing but the replacement itself can set it off.
    p.replace();
    expect(p.parts["[data-pct]"].textContent).toBe("83%");
    expect(p.parts["[data-lit]"].textContent).toBe("-".repeat(20));
  });

  it("never goes back", () => {
    const p = page(3);
    p.win.__miiiwaBoot!("built");
    const at = p.parts["[data-pct]"].textContent;
    p.win.__miiiwaBoot!("hydrated");
    expect(p.parts["[data-pct]"].textContent).toBe(at);
  });
});
