"use client";

import { useEffect, useRef, useState } from "react";
import { Lamp, Lightbulb, Palette } from "lucide-react";
import { useAppState } from "@/state/AppStateContext";
import { neonTheme, type LightSwitch } from "@/scene/room/lighting";
import CornerBrackets from "@/ui/CornerBrackets";

/**
 * The room's light switches, on the screen: the ceiling light, the desk lamp
 * and the neon's colours. The same three switches as the plate by the door
 * in the room — both only call `flipLight`, and the state they change is
 * held once (`AppStateContext`).
 *
 * Styled in the loo100 aesthetic (radius: 0, box-label, fine border).
 * The button is enclosed in corner brackets ("「」") while the menu is open.
 */
export default function LightMenu({ isJa }: { isJa: boolean }) {
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
    { key: "ceiling", icon: <Lightbulb size={16} />, label: isJa ? "天井灯" : "Ceiling", state: lights.ceiling ? "ON" : "OFF", on: lights.ceiling },
    { key: "desk", icon: <Lamp size={16} />, label: isJa ? "デスクライト" : "Desk lamp", state: lights.desk ? "ON" : "OFF", on: lights.desk },
    { key: "neon", icon: <Palette size={16} />, label: isJa ? "ネオン" : "Neon", state: isJa ? neon.ja : neon.en, on: true },
  ];
  const size = "w-12 h-12";

  return (
    <div ref={root} className="relative pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        title={isJa ? "照明" : "Lights"}
        aria-label={isJa ? "照明" : "Lights"}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`group relative ${size} rounded-none flex items-center justify-center transition-all duration-150 active:scale-95 border backdrop-blur-md ${
          open
            ? "bg-neutral-900/85 text-white border-black"
            : "bg-white/85 text-neutral-800 border-black/20 hover:bg-white"
        }`}
      >
        <CornerBrackets
          size="xs"
          offset="tight"
          strokeWidth="2"
          colorClass={open ? "border-neutral-900" : "border-neutral-800"}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <Lightbulb className="w-4 h-4" fill={lights.ceiling || lights.desk ? "#fde68a" : "none"} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-none bg-white text-neutral-900 border border-black/20 shadow-none p-1 font-mono">
          {rows.map((row) => (
            <button
              key={row.key}
              role="menuitem"
              onClick={() => flipLight(row.key)}
              className="group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-none hover:bg-neutral-100 text-left text-xs transition-colors"
            >
              <CornerBrackets
                size="xs"
                offset="tight"
                strokeWidth="2"
                colorClass="border-neutral-900"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <span className={row.on ? "text-neutral-900" : "text-neutral-400"}>{row.icon}</span>
              <span className="flex-1 font-bold">{row.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 border ${
                row.on
                  ? "bg-neutral-900 text-neutral-100 border-neutral-700"
                  : "bg-neutral-100 text-neutral-500 border-neutral-200"
              }`}>
                {row.state}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
