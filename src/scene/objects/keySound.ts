import { hash01 } from "../hash";
import { KEY_SAMPLES, keySampleUrl, type KeySample, type KeySampleGroup } from "../room/keyboard";

/**
 * The keyboard's sound: recorded presses of an HHKB (`keySample`,
 * `room/keyboard.ts` says whose, and the licence), played with Web Audio —
 * the key going down on a press, coming back up on the release.
 *
 * The clips (26, about 47 KB) are not fetched with the page — most visitors
 * never touch the keys — but once the reader sits at the PC
 * (`prefetchKeySound`), so the first key already has them. Browsers start
 * audio only from a gesture (and warn about a context made before one), so
 * the context is made, and the clips decoded, by `wakeKeySound`, called from
 * the press handlers themselves; until they are decoded, `playKey` is silent.
 */

/** How loud the keyboard is, overall (**仮**). The clips' presses peak near −3 dBFS; this puts them near −12. */
const VOLUME = 0.35;
/** Each play is a little off the last: up to this much in pitch (fraction) and level (dB). */
const JITTER = { rate: 0.03, db: 1.5 } as const;

let audio: AudioContext | null = null;
let fetching: Promise<Map<string, ArrayBuffer>> | null = null;
let decoding: Promise<void> | null = null;
const clips = new Map<string, AudioBuffer>();
let plays = 0;

function clipUrls(): string[] {
  const urls: string[] = [];
  for (const group of Object.keys(KEY_SAMPLES) as KeySampleGroup[]) {
    for (let n = 1; n <= KEY_SAMPLES[group]; n++) for (const part of ["down", "up"] as const) urls.push(keySampleUrl({ group, n }, part));
  }
  return urls;
}

/** Fetch the clips' bytes, once. No audio context is needed for this, so it can run before any gesture. */
export function prefetchKeySound(): Promise<Map<string, ArrayBuffer>> {
  fetching ??= Promise.all(
    clipUrls().map(async (url): Promise<[string, ArrayBuffer | null]> => {
      try {
        return [url, await (await fetch(url)).arrayBuffer()];
      } catch {
        // A clip that fails to load stays silent; the keys still go down.
        return [url, null];
      }
    })
  ).then((pairs) => new Map(pairs.filter((p): p is [string, ArrayBuffer] => p[1] !== null)));
  return fetching;
}

async function decode(context: AudioContext): Promise<void> {
  const bytes = await prefetchKeySound();
  await Promise.all(
    [...bytes].map(async ([url, data]) => {
      try {
        // decodeAudioData detaches the buffer it is given: hand it a copy.
        clips.set(url, await context.decodeAudioData(data.slice(0)));
      } catch {
        // Undecodable: silent, as above.
      }
    })
  );
}

/** Make or resume the audio context, and decode the clips. Call from inside a pointer or key handler. */
export function wakeKeySound(): void {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  decoding ??= decode(audio);
}

/** A first key that arrives while the clips are still decoding waits for them, but no longer than this (seconds): later, it would sound late. */
const LATE = 0.15;

/** Play a key going `down`, or coming back `up`. */
export function playKey(sample: KeySample, part: "down" | "up"): void {
  if (!audio) return;
  const url = keySampleUrl(sample, part);
  if (!clips.has(url)) {
    const asked = audio.currentTime;
    void decoding?.then(() => {
      if (audio && audio.currentTime - asked <= LATE) play(audio, url);
    });
    return;
  }
  play(audio, url);
}

function play(context: AudioContext, url: string): void {
  const buffer = clips.get(url);
  if (!buffer || context.state !== "running") return;
  plays++;
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = 1 + (hash01(plays * 2) - 0.5) * 2 * JITTER.rate;
  const gain = context.createGain();
  gain.gain.value = VOLUME * 10 ** (((hash01(plays * 2 + 1) - 0.5) * 2 * JITTER.db) / 20);
  source.connect(gain).connect(context.destination);
  source.onended = () => gain.disconnect();
  source.start();
}
