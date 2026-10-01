import type { Focus, SectionType } from "@/types";

/**
 * The open section, expressed in the URL.
 *
 * Without this the site had no addressable state at all: the browser's back
 * button left the site instead of closing the panel, and there was no way to
 * link anyone to a particular section.
 *
 * A hash, not a path. The site is a single statically exported document with
 * one 3D scene that must survive navigation, so real routes would mean either
 * reloading the whole world or keeping the canvas in a layout above them —
 * a restructure, and a separate decision. A hash buys the back button and
 * shareable links today without touching the export.
 *
 * Note what this deliberately does NOT fix: the section content is still
 * rendered on the client, so it stays absent from the prerendered HTML and
 * invisible to anything that does not run JavaScript.
 */

const FOCUS_IDS = ["about", "products", "skills", "experience", "contact", "desk"] as const;

/** Parse a section — or the desk — out of a location hash. Unknown values read as none. */
export function sectionFromHash(hash: string): Focus {
  const id = hash.replace(/^#/, "");
  return (FOCUS_IDS as readonly string[]).includes(id) ? (id as Focus) : null;
}

/** The hash a section (or the desk) should be shown at. Empty for "no section". */
export function hashForSection(section: Focus): string {
  return section ? `#${section}` : "";
}

/**
 * Whether focusing this opens the detail sheet: every area but About, which
 * is read off the hologram, and the desk, which is read on the PC's own
 * screen (docs/room-migration.md).
 */
export function hasSheet(focus: Focus): focus is Exclude<NonNullable<SectionType>, "about"> {
  return focus !== null && focus !== "about" && focus !== "desk";
}

/**
 * The hash the address bar should show for this state: an area while its
 * sheet is open, and the desk while the reader is sitting at it — the user
 * asked for the PC to have a URL of its own (`/#desk`, 2026-10-01), so that a
 * link can open the room with the reader already seated. Nothing otherwise:
 * turning round the room is not a place to link to.
 */
export function hashForState(focus: Focus, pageOpen: boolean): string {
  if (focus === "desk") return hashForSection(focus);
  return hashForSection(pageOpen ? focus : null);
}
