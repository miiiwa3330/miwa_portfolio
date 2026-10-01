"use client";

import { useEffect, useRef, useState } from "react";
import { Lamp, Lightbulb, Palette } from "lucide-react";
import { useAppState } from "@/state/AppStateContext";
import { neonTheme, type LightSwitch } from "@/scene/room/lighting";

/**
 * The room's light switches, on the screen: the ceiling light, the desk lamp
 * and the neon's colours. The same three switches as the plate by the door
 * in the room — both only call `flipLight`, and the state they change is
 * held once (`AppStateContext`).
 *
 * One round button in the header that opens a short list, rather than three
 * more round buttons: the header is already full on a phone.
 */
export default function LightMenu({ isJa, compact }: { isJa: boolean; compact: boolean }) {
  const { lights, flipLight } = useAppState();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // A press anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const neon = neonTheme(lights);
  const rows: { key: LightSwitch; icon: React.ReactNode; label: string; state: string; on: boolean }[] = [
    { key: "ceiling", icon: <Lightbulb size={18} />, label: isJa ? "天井灯" : "Ceiling", state: lights.ceiling ? "ON" : "OFF", on: lights.ceiling },
    { key: "desk", icon: <Lamp size={18} />, label: isJa ? "デスクライト" : "Desk lamp", state: lights.desk ? "ON" : "OFF", on: lights.desk },
    { key: "neon", icon: <Palette size={18} />, label: isJa ? "ネオン" : "Neon", state: isJa ? neon.ja : neon.en, on: true },
  ];
  const size = compact ? "w-11 h-11" : "w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14";

  return (
    <div ref={root} className="relative pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        title={isJa ? "照明" : "Lights"}
        aria-label={isJa ? "照明" : "Lights"}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${size} rounded-full flex items-center justify-center bg-white text-gray-800 border border-black/5 shadow-sm hover:scale-105 active:scale-95 transition-all duration-200`}
      >
        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" fill={lights.ceiling || lights.desk ? "#fde68a" : "none"} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white text-gray-800 border border-black/5 shadow-lg p-1.5">
          {rows.map((row) => (
            <button
              key={row.key}
              role="menuitem"
              onClick={() => flipLight(row.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 text-left"
            >
              <span className={row.on ? "text-orange-600" : "text-gray-400"}>{row.icon}</span>
              <span className="flex-1 text-sm font-bold">{row.label}</span>
              <span className={`text-xs font-mono ${row.on ? "text-orange-700" : "text-gray-400"}`}>{row.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
