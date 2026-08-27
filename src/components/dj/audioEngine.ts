// Shared, non-React helpers for the DJ decks: equal-power crossfade math
// and waveform peak extraction/caching. Kept framework-free so it can be
// unit-reasoned-about independently of the deck components.

/** Equal-power crossfade: x=0 is full deck A, x=1 is full deck B. */
export function crossfadeGains(x: number): { gainA: number; gainB: number } {
  const clamped = Math.min(1, Math.max(0, x));
  return {
    gainA: Math.cos(clamped * (Math.PI / 2)),
    gainB: Math.sin(clamped * (Math.PI / 2)),
  };
}

export type WaveformPeaks = { min: Float32Array; max: Float32Array };

/** Downsamples an AudioBuffer's first channel into per-column min/max peaks. */
export function extractPeaks(buffer: AudioBuffer, columns: number): WaveformPeaks {
  const channel = buffer.getChannelData(0);
  const samplesPerColumn = Math.max(1, Math.floor(channel.length / columns));
  const min = new Float32Array(columns);
  const max = new Float32Array(columns);

  for (let col = 0; col < columns; col++) {
    const start = col * samplesPerColumn;
    const end = Math.min(start + samplesPerColumn, channel.length);
    let colMin = 0;
    let colMax = 0;
    for (let i = start; i < end; i++) {
      const sample = channel[i];
      if (sample < colMin) colMin = sample;
      if (sample > colMax) colMax = sample;
    }
    min[col] = colMin;
    max[col] = colMax;
  }

  return { min, max };
}

function readSyncSafeInt(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function decodeId3Text(bytes: Uint8Array, encoding: number): string {
  try {
    if (encoding === 1) return new TextDecoder("utf-16").decode(bytes);
    if (encoding === 2) return new TextDecoder("utf-16be").decode(bytes);
    if (encoding === 3) return new TextDecoder("utf-8").decode(bytes);
    return new TextDecoder("latin1").decode(bytes);
  } catch {
    return "";
  }
}

/**
 * Reads the BPM straight out of the file's ID3v2 TBPM tag, when the file
 * has one — real metadata, not a guess. Most casual uploads won't have
 * this tag set, in which case this returns null (rather than estimating,
 * since a rough audio-analysis guess turned out unreliable enough to be
 * misleading for these tracks).
 */
function parseId3Bpm(data: ArrayBuffer): number | null {
  if (data.byteLength < 10) return null;
  const bytes = new Uint8Array(data, 0, Math.min(data.byteLength, 2_000_000));
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null; // "ID3"
  const majorVersion = bytes[3];
  if (majorVersion < 3) return null; // ID3v2.2's 3-char frame ids aren't handled

  const tagSize = readSyncSafeInt(bytes, 6);
  const tagEnd = Math.min(bytes.length, 10 + tagSize);

  let offset = 10;
  while (offset + 10 <= tagEnd) {
    const frameId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    if (frameId === "\0\0\0\0") break;
    const frameSize =
      majorVersion >= 4 ? readSyncSafeInt(bytes, offset + 4) : readUInt32BE(bytes, offset + 4);
    if (frameSize <= 0 || offset + 10 + frameSize > tagEnd) break;

    if (frameId === "TBPM") {
      const encoding = bytes[offset + 10];
      const textBytes = bytes.slice(offset + 11, offset + 10 + frameSize);
      const text = decodeId3Text(textBytes, encoding)
        .replace(/\0/g, "")
        .trim();
      const bpm = Math.round(Number.parseFloat(text));
      return Number.isFinite(bpm) && bpm > 0 ? bpm : null;
    }

    offset += 10 + frameSize;
  }
  return null;
}

const trackCache = new Map<string, Promise<{ buffer: AudioBuffer; bpm: number | null }>>();

/**
 * Fetches + decodes a song's audio once per URL (caching the in-flight/
 * settled promise), reading its ID3 BPM tag from the same download along
 * the way.
 */
export function loadTrack(
  ctx: AudioContext,
  url: string,
): Promise<{ buffer: AudioBuffer; bpm: number | null }> {
  const cached = trackCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => {
      const bpm = parseId3Bpm(data);
      // decodeAudioData detaches its input buffer, so BPM must be read first.
      return ctx.decodeAudioData(data).then((buffer) => ({ buffer, bpm }));
    });

  promise.catch(() => trackCache.delete(url));
  trackCache.set(url, promise);
  return promise;
}

const impulseResponseCache = new WeakMap<AudioContext, AudioBuffer>();

/** A synthetic reverb tail (exponentially-decaying noise) — no IR sample file needed. */
export function getImpulseResponse(ctx: AudioContext): AudioBuffer {
  const cached = impulseResponseCache.get(ctx);
  if (cached) return cached;

  const seconds = 2.2;
  const decay = 3.2;
  const length = Math.round(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  impulseResponseCache.set(ctx, impulse);
  return impulse;
}

// --- Live guitar-input helpers (used by LiveInput.tsx) ---

/** Distortion voicings the live-input amp can run through. */
export type DistModel = "overdrive" | "maiden" | "punk" | "fuzz";

/** One sample of a distortion transfer curve: input `x` in -1..1 → output. */
function shapeSample(x: number, amount: number, model: DistModel): number {
  const a = Math.max(0, Math.min(1, amount));
  switch (model) {
    case "maiden": {
      // Bright, asymmetric tube-style clip — even harmonics, tight and cutting.
      const k = 3 + a * 60;
      return x >= 0 ? Math.tanh(k * x) : Math.tanh(k * 0.8 * x) * 0.92;
    }
    case "punk": {
      // Buzzy arctangent clip with a hard ceiling — fizzy 90s skate-punk crunch.
      const k = 4 + a * 120;
      const y = (2 / Math.PI) * Math.atan(k * x) * 1.1;
      return Math.max(-0.95, Math.min(0.95, y));
    }
    case "fuzz": {
      // Near-square splat — expands the clipped signal toward the rails.
      const k = 6 + a * 200;
      const y = Math.tanh(k * x);
      return Math.sign(y) * Math.abs(y) ** 0.55;
    }
    default: {
      // Original smooth soft-clip overdrive.
      const k = a * 120;
      const deg = Math.PI / 180;
      return ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
  }
}

/**
 * Transfer curve for the live-input WaveShaperNode. `amount` is 0..1 (0 is
 * nearly linear, 1 is a hard crunch); `model` picks the clipping character.
 */
export function makeDriveCurve(
  amount: number,
  model: DistModel = "overdrive",
): Float32Array<ArrayBuffer> {
  const samples = 2048;
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = shapeSample(x, amount, model);
  }
  return curve;
}

/**
 * Rough monophonic pitch estimate via band-limited autocorrelation — enough
 * to drive a sub-octave oscillator from a single-note guitar line. Returns
 * the fundamental in Hz, or null when the input is too quiet or unpitched.
 * Only the lag range for `minHz`..`maxHz` is scanned, keeping it cheap enough
 * to run in an animation-frame loop.
 */
export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  minHz = 70,
  maxHz = 900,
): number | null {
  const size = buf.length;
  let power = 0;
  for (let i = 0; i < size; i++) power += buf[i] * buf[i];
  if (Math.sqrt(power / size) < 0.008) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(size - 2, Math.ceil(sampleRate / minHz));

  const corr = new Float32Array(maxLag + 2);
  let bestLag = -1;
  let bestVal = 0;
  let prev = -Infinity;
  let rising = false;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) sum += buf[i] * buf[i + lag];
    const v = sum / (size - lag);
    corr[lag] = v;

    if (v > prev) {
      rising = true;
    } else if (rising) {
      // Local maximum at the previous lag — keep the strongest one, and stop
      // once later peaks fall well below it (that first peak is the period).
      const peak = lag - 1;
      if (corr[peak] > bestVal) {
        bestVal = corr[peak];
        bestLag = peak;
      } else if (bestVal > 0 && corr[peak] < bestVal * 0.8) {
        break;
      }
      rising = false;
    }
    prev = v;
  }

  if (bestLag < 1 || bestVal <= 0) return null;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  const x1 = corr[bestLag - 1];
  const x2 = corr[bestLag];
  const x3 = corr[bestLag + 1] || 0;
  const denom = x1 + x3 - 2 * x2;
  const shift = denom ? (0.5 * (x1 - x3)) / denom : 0;

  const freq = sampleRate / (bestLag + shift);
  return freq >= minHz && freq <= maxHz ? freq : null;
}

const cabinetCache = new WeakMap<BaseAudioContext, Promise<AudioBuffer>>();

/**
 * Renders a short, dark impulse that colours the signal like a mic'd 4x12
 * — steep top-end rolloff with a small presence bump. Cached per context.
 */
export function getCabinetImpulse(ctx: AudioContext): Promise<AudioBuffer> {
  const cached = cabinetCache.get(ctx);
  if (cached) return cached;

  const render = (async () => {
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * 0.05));
    const offline = new OfflineAudioContext(1, length, rate);

    const noiseBuffer = offline.createBuffer(1, length, rate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
    }
    const noise = offline.createBufferSource();
    noise.buffer = noiseBuffer;

    const highpass = offline.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 90;
    const presence = offline.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 2000;
    presence.gain.value = 4;
    presence.Q.value = 1.2;
    const lowpass = offline.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 4200;
    lowpass.Q.value = 0.9;

    noise
      .connect(highpass)
      .connect(presence)
      .connect(lowpass)
      .connect(offline.destination);
    noise.start();
    return offline.startRendering();
  })();

  cabinetCache.set(ctx, render);
  render.catch(() => cabinetCache.delete(ctx));
  return render;
}

/** Tempo-sync options for the live-input delay, as a fraction of a beat. */
export const DELAY_DIVISIONS: { label: string; beats: number }[] = [
  { label: "Free", beats: 0 },
  { label: "1/4", beats: 1 },
  { label: "1/8 dotted", beats: 0.75 },
  { label: "1/8", beats: 0.5 },
  { label: "1/16 dotted", beats: 0.375 },
  { label: "1/16", beats: 0.25 },
];

/** AudioContext augmented with the output-routing API (Chromium). */
export type AudioContextWithSink = AudioContext & {
  setSinkId?: (sinkId: string) => Promise<void>;
  sinkId?: string;
};

// Label fragments that point at (or away from) an outboard USB/Thunderbolt
// audio interface, used to auto-pick capture + playback devices.
const INTERFACE_HINTS = [
  "scarlett", "focusrite", "clarett", "saffire", "2i2", "4i4", "8i6", "18i",
  "behringer", "umc", "u-phoria", "uphoria", "presonus", "audiobox", "studio 24",
  "studio 26", "studio 68", "motu", "audient", "evo 4", "evo 8", "id4", "id14",
  "id44", "steinberg", "ur22", "ur44", "ur12", "universal audio", "apollo",
  "volt 1", "volt 2", "volt 4", "ssl 2", "ssl2", "komplete audio", "roland",
  "rubix", "tascam", "us-1x2", "us-2x2", "us-4x4", "zoom uac", "uac-2", "uac-8",
  "m-audio", "air 192", "m-track", "arturia", "minifuse", "line 6", "helix",
  "hx stomp", "pod go", "audio interface", "usb audio codec", "usb audio device",
];
const NON_INTERFACE_HINTS = [
  "macbook", "built-in", "built in", "imac", "display audio", "webcam", "camera",
  "airpods", "bluetooth", "headset", "communications", "realtek",
  "high definition audio", "hands-free", "virtual",
];

function scoreDeviceLabel(label: string): number {
  const l = label.toLowerCase();
  let score = 0;
  if (INTERFACE_HINTS.some((h) => l.includes(h))) score += 3;
  if (NON_INTERFACE_HINTS.some((h) => l.includes(h))) score -= 4;
  return score;
}

/**
 * Best guess at the capture + playback device IDs for a plugged-in audio
 * interface: prefer an input whose label looks like an interface, then pair
 * the output on the same physical device (shared `groupId`), falling back to
 * the best-scoring output label. Returns empty strings when nothing clearly
 * beats the system default — e.g. before mic permission, when labels are
 * blank — so callers can leave the OS default in place.
 */
export function pickAudioInterface(devices: MediaDeviceInfo[]): {
  inputId: string;
  outputId: string;
} {
  const usable = (kind: MediaDeviceKind) =>
    devices.filter(
      (d) =>
        d.kind === kind &&
        d.deviceId &&
        d.deviceId !== "communications" &&
        d.deviceId !== "default",
    );

  let bestInput: MediaDeviceInfo | null = null;
  let bestInputScore = 0;
  for (const d of usable("audioinput")) {
    if (!d.label) continue;
    const score = scoreDeviceLabel(d.label);
    if (score > bestInputScore) {
      bestInputScore = score;
      bestInput = d;
    }
  }
  if (!bestInput) return { inputId: "", outputId: "" };

  const outputs = usable("audiooutput");
  let output =
    outputs.find(
      (d) => d.groupId && d.groupId === bestInput.groupId,
    ) ?? null;
  if (!output) {
    let bestScore = 0;
    for (const d of outputs) {
      if (!d.label) continue;
      const score = scoreDeviceLabel(d.label);
      if (score > bestScore) {
        bestScore = score;
        output = d;
      }
    }
  }

  return { inputId: bestInput.deviceId, outputId: output?.deviceId ?? "" };
}

/** Turns a getUserMedia rejection into something worth showing a user. */
export function describeMediaError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError")
      return "Microphone access was blocked. Allow it for this site and try again.";
    if (error.name === "NotFoundError") return "No audio input device was found.";
    if (error.name === "NotReadableError")
      return "The audio device is in use by another app (close your DAW or the Focusrite mixer).";
  }
  return "Couldn't open the audio input.";
}
