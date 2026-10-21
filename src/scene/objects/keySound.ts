import type { KeyVoice } from "../room/keyboard";

/**
 * The keyboard's sound, synthesised with Web Audio — no sound files, in
 * keeping with building everything in code. A press is a short band of
 * noise (the click) over a falling sine (the Topre "thock" as the cap
 * bottoms out); a release is a fainter, higher click alone. The voice of
 * each key is `keyVoice` (`room/keyboard.ts`).
 *
 * Browsers start audio only from a gesture, so the context is made (or
 * woken) by `wakeKeySound`, called from the press handlers themselves; until
 * then `playKey` is silent.
 */

/** How loud the keyboard is, overall (**仮**). */
const VOLUME = 0.18;

let audio: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** Make or resume the audio context. Call from inside a pointer or key handler. */
export function wakeKeySound(): void {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  if (!noise) {
    noise = audio.createBuffer(1, Math.round(audio.sampleRate * 0.06), audio.sampleRate);
    const data = noise.getChannelData(0);
    // A fixed pattern rather than Math.random: the same click every visit.
    let seed = 1;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }
}

/** Play one key going down (`down`) or coming back up. */
export function playKey(voice: KeyVoice, down: boolean): void {
  if (!audio || audio.state !== "running" || !noise) return;
  const t = audio.currentTime;
  const out = audio.createGain();
  out.gain.value = VOLUME * voice.gain * (down ? 1 : 0.4);
  out.connect(audio.destination);

  const click = audio.createBufferSource();
  click.buffer = noise;
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = down ? voice.click : voice.click * 1.3;
  band.Q.value = 0.9;
  const clickEnvelope = audio.createGain();
  clickEnvelope.gain.setValueAtTime(0.0001, t);
  clickEnvelope.gain.exponentialRampToValueAtTime(1, t + 0.002);
  clickEnvelope.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  click.connect(band).connect(clickEnvelope).connect(out);
  click.start(t);
  click.stop(t + 0.05);

  if (down) {
    const thump = audio.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(voice.thump * 1.4, t);
    thump.frequency.exponentialRampToValueAtTime(voice.thump, t + 0.02);
    const thumpEnvelope = audio.createGain();
    thumpEnvelope.gain.setValueAtTime(0.0001, t);
    thumpEnvelope.gain.exponentialRampToValueAtTime(0.8, t + 0.003);
    thumpEnvelope.gain.exponentialRampToValueAtTime(0.0001, t + voice.decay);
    thump.connect(thumpEnvelope).connect(out);
    thump.start(t);
    thump.stop(t + voice.decay + 0.02);
  }
  // Disconnect once both parts have stopped, so nodes do not pile up.
  setTimeout(() => out.disconnect(), (voice.decay + 0.1) * 1000);
}
