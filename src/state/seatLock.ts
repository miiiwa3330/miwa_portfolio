/**
 * Whether the reader is kept in the chair (2026-11-04, the user: 「デスク周り以外の
 * 仕様が未実装なので、立ち上がれないようにしたい」). While true the site opens
 * sat at the PC, and every way of getting up — 「席を立つ」 (the BACK button),
 * the browser's back button, a marker — is refused with one of the engineer's
 * lines (`hub/desk/standLines.ts`) instead. Set back to false (2026-11-26) so the
 * visitor starts standing in the room and can get up from the desk freely.
 */
export const SEAT_LOCKED = false;
