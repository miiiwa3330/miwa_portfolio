"use client";

import { useEffect, useState } from "react";
import { BOOT_BAR_WIDTH, bootBar, bootInlineScript, bootNow, bootPercent, bootScript, publishBoot } from "@/state/bootChannel";

/**
 * The inside of the boot screen: "Miiiwa." large, and under it a bar of
 * dashes and a percentage that turns to `[OK]` at 100% (2026-11-04, the
 * user: 「Miiiwa.を大きく上にその下に --------------n%」).
 *
 * Plain HTML with its own styles, not Tailwind classes, and painted by the
 * inline script rather than by React (`bootScript`): **the one requirement is
 * that it shows at once** (the user: 「ローディング画面がなかなか出てこないなんて
 * ことは絶対にないように」). It is the first thing in the page's body, and the
 * page's stylesheet comes inlined with the HTML (`inlineCss`), so nothing has
 * to arrive before it can be drawn.
 */
const BOOT_HTML =
  `<div style="padding:0 24px;text-align:center">` +
  `<p style="margin:0;font-family:var(--font-geist-sans),system-ui,sans-serif;font-weight:900;font-size:clamp(56px,13vw,128px);line-height:1;letter-spacing:-0.04em">Miiiwa<span style="color:#f97316">.</span></p>` +
  `<p style="margin:28px 0 0;font-family:var(--font-geist-mono),ui-monospace,monospace;font-size:15px;line-height:1;white-space:pre">` +
  `<span data-lit style="color:#fff"></span><span data-dim style="color:rgba(255,255,255,0.2)">${"-".repeat(BOOT_BAR_WIDTH)}</span>` +
  `<span data-pct style="display:inline-block;min-width:4ch;margin-left:1ch;text-align:left">0%</span>` +
  `</p></div>`;

/**
 * What covers the room until its first frame is drawn. React renders it once
 * and leaves it alone: the inline script fills the bar, turns it to `[OK]`
 * and hides it, and nothing here re-renders it (so React never puts back what
 * the script wrote). Hence `suppressHydrationWarning`: by the time React
 * hydrates, the script has already moved the bar on.
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
        dangerouslySetInnerHTML={{ __html: BOOT_HTML }}
      />
      <script dangerouslySetInnerHTML={{ __html: bootInlineScript }} />
    </>
  );
}
