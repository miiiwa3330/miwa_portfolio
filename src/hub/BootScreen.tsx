"use client";

import { useEffect, useState } from "react";
import Wordmark from "@/ui/Wordmark";
import { BOOT_BAR_WIDTH, bootBar, bootInlineScript, bootNow, bootPercent, bootScript, publishBoot } from "@/state/bootChannel";

/**
 * The bar under the logo: dashes and a percentage that turns to `[OK]` at
 * 100% (2026-11-04, the user: 「Miiiwa.を大きく上にその下に --------------n%」).
 * Painted by the inline script rather than by React (`bootScript`), which
 * finds it by `data-bar`.
 */
const BAR_HTML =
  `<span data-lit style="color:#fff"></span><span data-dim style="color:rgba(255,255,255,0.2)">${"-".repeat(BOOT_BAR_WIDTH)}</span>` +
  `<span data-pct style="display:inline-block;min-width:4ch;margin-left:1ch;text-align:left">0%</span>`;

/**
 * What covers the room until its first frame is drawn: "Miiiwa." large, and
 * the bar under it. React renders it once and leaves it alone: the inline
 * script fills the bar, turns it to `[OK]` and hides it, and nothing here
 * re-renders it (so React never puts back what the script wrote). Hence
 * `suppressHydrationWarning`: by the time React hydrates, the script has
 * already moved the bar on.
 *
 * **Styled on the elements themselves: the one requirement is that it shows
 * at once** (the user: 「ローディング画面がなかなか出てこないなんて
 * ことは絶対にないように」). It is the first thing in the page's body, and the
 * page's stylesheet comes inlined with the HTML (`inlineCss`), so nothing has
 * to arrive before it can be drawn. The logo is the header's own `Wordmark`
 * (2026-11-04, the user: 「ヘッダーのタイトルと同じ、オレンジが発光するモーション」):
 * its blinking is in that same inlined stylesheet, so it costs no request.
 */
export default function BootScreen() {
  // Decided once, at mount: the screen is for arriving at the site. Back on
  // the hub from a reading page after it has finished, there is nothing to show.
  const [done] = useState(() => bootNow() === "drawn");

  useEffect(() => {
    // Arrived at a reading page first and came to the hub by a link: the page
    // never carried the inline script, so it is started here instead.
    bootScript(bootPercent, bootBar, BOOT_BAR_WIDTH, window, document);
    publishBoot("hydrated");
  }, []);

  if (done) return null;
  return (
    <>
      <div
        id="miiiwa-boot"
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        suppressHydrationWarning
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#070a14",
          color: "#fff",
          transition: "opacity 400ms ease-out",
        }}
      >
        <div style={{ padding: "0 24px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(56px, 13vw, 128px)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            <Wordmark onLight={false} />
          </p>
          <p
            data-bar
            suppressHydrationWarning
            style={{
              margin: "28px 0 0",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              fontSize: 15,
              lineHeight: 1,
              whiteSpace: "pre",
            }}
            dangerouslySetInnerHTML={{ __html: BAR_HTML }}
          />
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: bootInlineScript }} />
    </>
  );
}
