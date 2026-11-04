/**
 * Whether the reader is kept in the chair (2026-11-04, the user: 「デスク周り以外の
 * 仕様が未実装なので、立ち上がれないようにしたい」). While true the site opens
 * sat at the PC, and every way of getting up — the taskbar's 「席を立つ」, BACK,
 * the browser's back button, a marker — is refused with one of the engineer's
 * lines (`hub/desk/standLines.ts`) instead. The one switch: the room beyond
 * the desk comes back by setting it to false.
 */
export const SEAT_LOCKED = true;
