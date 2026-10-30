import type { Language } from "@/types";

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/**
 * How a note is authored.
 *
 * A note is a short dev-diary entry, not a manual: what was built, what went
 * wrong, and what it felt like. Only the facts about the entry live here —
 * the prose is `src/content/notes/<slug>.mdx` (and `src/content/notes/en/<slug>.mdx`),
 * which repeats none of them (the page draws the title and date from this
 * record, not from the MDX).
 */
export type NoteSource = {
  /** URL segment and MDX file name. */
  slug: string;
  title: string;
  titleEn?: string;
  /** One or two sentences: the summary on the index and the meta description. */
  description: string;
  descriptionEn?: string;
  /**
   * The day the work the note tells of was done, `YYYY-MM-DD` — not the day
   * the note went online (the user's call, devlog 2026-09-20). The pages show
   * it, and the sitemap gives it as the note's `lastModified`.
   */
  date: string;
  tags: string[];
  tagsEn?: string[];
  /**
   * Products the entry is about, by `ProjectSource.slug`. Their pages list
   * the entry, and the entry ends by pointing back at them.
   */
  products: string[];
};

/** Resolve a note's title, description and tags into `language`. */
export function localizeNote(note: NoteSource, language: Language): NoteSource {
  if (language === "ja") return note;
  return {
    ...note,
    title: note.titleEn ?? note.title,
    description: note.descriptionEn ?? note.description,
    tags: note.tagsEn ?? note.tags,
  };
}

/** Resolve a list of notes into `language`, preserving order. */
export function localizeNotes(notes: readonly NoteSource[], language: Language): NoteSource[] {
  return notes.map((n) => localizeNote(n, language));
}

/** Where a note is served. */
export function notePath(slug: string): string {
  return `/notes/${slug}`;
}

/**
 * Newest first. Entries sharing a date keep their authored order, so a day
 * with two entries reads in the order they were written down.
 */
export function sortNotesNewestFirst(notes: readonly NoteSource[]): NoteSource[] {
  return notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => (a.note.date === b.note.date ? a.index - b.index : a.note.date < b.note.date ? 1 : -1))
    .map(({ note }) => note);
}

/** The entries about one product, newest first. */
export function notesForProduct(notes: readonly NoteSource[], productSlug: string): NoteSource[] {
  return sortNotesNewestFirst(notes.filter((note) => note.products.includes(productSlug)));
}

/** `2026-09-19` → `2026年9月19日` (ja) or `Sep 19, 2026` (en). Parsed by hand: `Date` would read it as UTC. */
export function formatNoteDate(date: string, language: Language = "ja"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`not a YYYY-MM-DD date: ${date}`);
  const [, y, m, d] = match;
  if (language === "en") {
    const monthIdx = Number(m) - 1;
    const monthName = EN_MONTHS[monthIdx] ?? m;
    return `${monthName} ${Number(d)}, ${Number(y)}`;
  }
  return `${Number(y)}年${Number(m)}月${Number(d)}日`;
}
