"use client";

import HubDock from "@/hub/HubDock";
import TerminalOverlay from "@/terminal/TerminalOverlay";
import { useLanguage } from "@/state/LanguageContext";
import { useTerminal } from "@/terminal/TerminalContext";
import { useHandheld } from "@/state/useHandheld";

/**
 * The PC icon (and terminal overlay) docked in the bottom-left corner of the
 * reading pages — the hub's own dock, without the hub's copyright (the page
 * has its own at its foot, `ReadingFooter`).
 * Only shown on desktop/no-touch (!handheld).
 */
export default function ReadingDock() {
  const { language } = useLanguage();
  const isJa = language === "ja";
  const { openTerminal } = useTerminal();
  const handheld = useHandheld();

  if (handheld) return null;

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-40 safe-inset">
        <div className="w-full h-full flex flex-col justify-end p-7 sm:p-9">
          <HubDock isJa={isJa} openTerminal={openTerminal} withFooter={false} />
        </div>
      </div>
      <TerminalOverlay />
    </>
  );
}
