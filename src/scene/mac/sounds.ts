/**
 * The Macintosh's games' sounds (2026-10-25, the user: 「Snake のゲーム音」):
 * short tones, as the 128K's one speaker made them — a square wave, the
 * sound of a 1-bit machine — and a burst of noise for a mine. Pure: each
 * sound is its notes, played one after another by `objects/macSound.ts`.
 *
 * No recordings: the tones are a few lines each, cost nothing to fetch, and
 * the 128K's own beeps were tones like these. **仮**: every note.
 */

export type MacSound =
  // Snake
  | "eat"
  // Breakout
  | "wall"
  | "paddle"
  | "brick"
  | "miss"
  // Mines
  | "open"
  | "flag"
  | "boom"
  // Every game's end
  | "over"
  | "win";

/** A note: its pitch (Hz; 0 for noise) and how long it sounds (ms). */
export type Note = { readonly hz: number; readonly ms: number };

const n = (hz: number, ms: number): Note => ({ hz, ms });

export const MAC_SOUNDS: Record<MacSound, readonly Note[]> = {
  // Up a fifth: a bite.
  eat: [n(880, 40), n(1320, 50)],
  wall: [n(392, 20)],
  paddle: [n(523, 30)],
  brick: [n(784, 35)],
  // Down an octave, slowly: the ball is gone.
  miss: [n(262, 120), n(131, 220)],
  open: [n(1047, 15)],
  flag: [n(659, 25), n(988, 25)],
  boom: [n(0, 350)],
  // Down by steps: over. Up the major chord: won.
  over: [n(440, 120), n(349, 120), n(294, 120), n(220, 300)],
  win: [n(523, 90), n(659, 90), n(784, 90), n(1047, 240)],
};

/** How long a sound lasts (ms): its notes end to end. */
export function soundLength(sound: MacSound): number {
  return MAC_SOUNDS[sound].reduce((t, note) => t + note.ms, 0);
}
