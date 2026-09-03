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

const trackCache = new Map<string, Promise<{ buffer: AudioBuffer }>>();

/**
 * Fetches + decodes a song's audio once per URL (caching the in-flight/
 * settled promise). BPM is not read here — it comes from the Song record,
 * set by hand in the admin panel.
 */
export function loadTrack(
  ctx: AudioContext,
  url: string,
): Promise<{ buffer: AudioBuffer }> {
  const cached = trackCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => ({ buffer }));

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
