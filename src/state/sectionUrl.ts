import type { Focus } from "@/types";

/**
 * The hub's state, expressed in the URL hash.
 *
 * Two jobs are left for it since the detail sheet was replaced by real pages
 * (`/products`, `/skills`, … — 2026-10-30):
 *
 *  - **`/#desk`**: the user asked for the PC to have a URL of its own
 *    (2026-10-01), so that a link can open the room with the reader already
 *    seated. While seated the address bar shows it, and the back button gets
 *    up from the chair.
 *  - **The old links.** Until 2026-10-30 an area's page was the sheet, opened
 *    at `/#products` and the like — every link into an area, the reading
 *    pages' navigation included, had that shape, and they are out there.
 *    `/#about` still means what it meant (the hologram, which never had a
 *    sheet); the four that had one are sent on to their pages
 *    (`movedToPage`).
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
 * Whether this hash used to open the detail sheet, whose content is now a page
 * of its own: every area but About, which is read off the hologram, and the
 * desk, which is read on the PC's own screen.
 */
export function movedToPage(focus: Focus): focus is "products" | "skills" | "experience" | "contact" {
  return focus !== null && focus !== "about" && focus !== "desk";
}

/**
 * The hash the address bar should show for this state: the desk while the
 * reader is sitting at it, and nothing otherwise — turning round the room is
 * not a place to link to.
 */
export function hashForState(focus: Focus): string {
  return hashForSection(focus === "desk" ? focus : null);
}
