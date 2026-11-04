/**
 * The PC's browser (`PcBrowser`), which shows miiiwa.com itself in a frame
 * (2026-11-04, the user: 「miiiwa.comをPC内PCで忠実に再現」): what its address
 * bar reads and writes, and which links leave it.
 */

/** The site's own host, as the address bar writes it. */
export const SITE_HOST = "miiiwa.com";

/** What the address bar shows for a page of the site: the host, then the path (none for `/`), the query and the hash. */
export function addressOf(location: { pathname: string; search: string; hash: string }): string {
  const path = location.pathname === "/" ? "" : location.pathname;
  return `${SITE_HOST}${path}${location.search}${location.hash}`;
}

/**
 * What the reader typed into the address bar, as a root-relative URL of the
 * site to load: with or without the scheme and the host, with or without the
 * leading slash. Null for another host — the PC's browser shows miiiwa.com
 * only (other sites refuse to be framed, `X-Frame-Options`).
 */
export function addressToPath(typed: string): string | null {
  const text = typed.trim();
  if (!text) return null;
  const withoutScheme = text.replace(/^https?:\/\//i, "");
  const cut = withoutScheme.search(/[/?#]/);
  const host = (cut === -1 ? withoutScheme : withoutScheme.slice(0, cut)).toLowerCase();
  if (host === SITE_HOST || host === `www.${SITE_HOST}`) {
    const rest = cut === -1 ? "" : withoutScheme.slice(cut);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  // No host at all: a path, written with or without its leading slash.
  if (text.startsWith("/")) return text;
  if (/^[\w-]+(\/[\w.-]*)*\/?([?#].*)?$/.test(text)) return `/${text}`;
  return null;
}

/**
 * Whether a link clicked in the browser leaves the site — another origin,
 * over http(s) — and so opens in a tab of its own beside the room rather
 * than in the frame, where most sites refuse to be shown and where the room
 * could no longer read where the page has gone. `href` resolved (an
 * anchor's `.href`); `mailto:` and the like are the browser's.
 */
export function leavesSite(href: string, origin: string): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  return (url.protocol === "http:" || url.protocol === "https:") && url.origin !== origin;
}
