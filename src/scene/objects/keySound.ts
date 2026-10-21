import type { KeyVoice } from "../room/keyboard";

/**
 * The keyboard's sound, synthesised with Web Audio — no sound files, in
 * keeping with building everything in code. A press strikes the key's
 * resonances (`keyVoice`, measured off `reference/4/PC-Keyboard06/`): each a
 * sine that rises in a few milliseconds and dies away exponentially, falling
 * 60 dB in its measured time. Keys sound only going down — in the recording
 * a release is 60 dB or more under its press.
 *
 * Browsers start audio only from a gesture, so the context is made (or
 * woken) by `wakeKeySound`, called from the press handlers themselves; until
 * then `playKey` is silent.
 */

/**
 * How loud the keyboard is, overall (**仮**: the recording sets the keys'
 * sound against each other, not how loud a web page should click). At 0.2 a
 * letter peaked at −6 dBFS in the offline render; 0.1 puts it near −12.
 */
const VOLUME = 0.1;
/** e^(−t/τ) falls 60 dB when t = τ · ln 1000. */
const LN_1000 = Math.log(1000);

/**
 * The tick at the very start of a press: noise above 5 kHz, gone in a couple
 * of milliseconds. How loud it is is the key's (`KeyVoice.tick`, calibrated
 * against the recording).
 */
const TICK = { cutoff: 5000, tau: 0.0015 } as const;

let audio: AudioContext | null = null;
const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

/** 30 ms of noise for a context: a fixed pattern rather than Math.random, the same tick every visit. */
function noiseFor(context: BaseAudioContext): AudioBuffer {
  let buffer = noises.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, Math.round(context.sampleRate * 0.03), context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    noises.set(context, buffer);
  }
  return buffer;
}

/** Make or resume the audio context. Call from inside a pointer or key handler. */
export function wakeKeySound(): void {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
}

/**
 * Strike a key's resonances into `destination` at time `at` on `context` — a
 * live context to hear it, an offline one to measure it (the check against
 * the recording renders it this way). Returns how long it rings, seconds.
 */
export function strike(context: BaseAudioContext, voice: KeyVoice, at: number, destination: AudioNode): number {
  const amps = voice.modes.map((m) => 10 ** (m.db / 20));
  // Scaled by the modes' combined power, not their sum: sines of unrelated
  // frequency add in power. With the sum, the Return (four modes, two strong)
  // rendered 2.6 dB under the recording's level against a letter.
  const out = context.createGain();
  out.gain.value = (VOLUME * 10 ** (voice.level / 20)) / Math.hypot(...amps);
  out.connect(destination);

  const tick = context.createBufferSource();
  tick.buffer = noiseFor(context);
  const high = context.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = TICK.cutoff;
  const tickEnvelope = context.createGain();
  tickEnvelope.gain.setValueAtTime(voice.tick * Math.hypot(...amps), at);
  tickEnvelope.gain.setTargetAtTime(0, at, TICK.tau);
  tick.connect(high).connect(tickEnvelope).connect(out);
  tick.start(at);
  tick.stop(at + 0.03);

  const rise = voice.rise / 1000;
  let longest = 0;
  voice.modes.forEach((mode, i) => {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = mode.hz;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(amps[i], at + rise);
    envelope.gain.setTargetAtTime(0, at + rise, mode.t60 / 1000 / LN_1000);
    osc.connect(envelope).connect(out);
    osc.start(at);
    osc.stop(at + rise + mode.t60 / 1000);
    longest = Math.max(longest, rise + mode.t60 / 1000);
  });
  // Let go of the nodes once the longest resonance has died.
  setTimeout(() => out.disconnect(), (longest + 0.05) * 1000);
  return longest;
}

/** Play one key going down. */
export function playKey(voice: KeyVoice): void {
  if (!audio || audio.state !== "running") return;
  strike(audio, voice, audio.currentTime, audio.destination);
}
