/**
 * Vocabulary shared across layers that otherwise have no business depending
 * on each other — data/scene/state would each need to import a Context
 * module just to name a type. Defined once here so none of them do.
 */

export type Language = "ja" | "en";

export type SectionType = "about" | "products" | "skills" | "experience" | "contact" | null;

/** A place the tour stops at: the five areas, plus the desktop PC that is not one of them. */
export type Stop = NonNullable<SectionType> | "desk";

/**
 * What the camera has stepped in to, if anything: one of the areas, or the
 * desk. The desk is focused like an area — the camera steps in, sits down at
 * it — but it has no detail page and no card.
 */
export type Focus = Stop | null;
