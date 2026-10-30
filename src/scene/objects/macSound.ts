import { MAC_SOUNDS, type MacSound } from "../mac/sounds";
import { deskAudio } from "./keySound";

/**
 * Playing the Macintosh's games' sounds (`mac/sounds.ts`, their notes):
 * each note a square wave — the 128K's one speaker's sound — or, at 0 Hz, a
 * burst of noise, through the desk's audio context (`keySound`), which a
 * press or a key has woken. Nothing is fetched.
 */

/** How loud (**仮**): a square wave is loud for its level; this sits under the keys' clicks (about −12 dBFS). */
const VOLUME = 0.06;
/** Each note fades in and out over this long (s), so its ends do not click. */
const EDGE = 0.004;

let noise: AudioBuffer | null = null;

function noiseBuffer(context: AudioContext): AudioBuffer {
  if (noise) return noise;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.5), context.sampleRate);
  const data = buffer.getChannelData(0);
  // A 1-bit noise, as the 128K's: each sample full up or full down.
  for (let i = 0; i < data.length; i++) data[i] = Math.random() < 0.5 ? -1 : 1;
  noise = buffer;
  return buffer;
}

/**
 * Play a sound, its notes one after another. Silent until the audio context
 * is running: it is woken by the press or the key that opened the game, not
 * here — a sound comes from the frame loop, and a context made outside a
 * gesture is refused (and warned about).
 */
export function playMacSound(sound: MacSound): void {
  const context = deskAudio();
  if (!context || context.state !== "running") return;
  let at = context.currentTime;
  for (const note of MAC_SOUNDS[sound]) {
    const length = note.ms / 1000;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(VOLUME, at + EDGE);
    gain.gain.setValueAtTime(VOLUME, at + Math.max(EDGE, length - EDGE));
    gain.gain.linearRampToValueAtTime(0, at + length);
    gain.connect(context.destination);
    const source: AudioScheduledSourceNode =
      note.hz > 0 ? Object.assign(context.createOscillator(), { type: "square" as OscillatorType }) : Object.assign(context.createBufferSource(), { buffer: noiseBuffer(context) });
    if (source instanceof OscillatorNode) source.frequency.value = note.hz;
    source.connect(gain);
    source.onended = () => gain.disconnect();
    source.start(at);
    source.stop(at + length);
    at += length;
  }
}
