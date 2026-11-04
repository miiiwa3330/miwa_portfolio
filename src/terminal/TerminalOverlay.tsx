"use client";

import { useTerminal } from "./TerminalContext";
import TerminalScreen from "./TerminalScreen";

/** The terminal over the whole window, opened from the dock and the menus (`TerminalContext`). */
export default function TerminalOverlay() {
  const { isOpen, closeTerminal } = useTerminal();
  return <TerminalScreen isOpen={isOpen} closeTerminal={closeTerminal} fill="viewport" />;
}
