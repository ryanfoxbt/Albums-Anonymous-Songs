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

const bufferCache = new Map<string, Promise<AudioBuffer>>();

/** Fetches + decodes a song's audio once per URL, caching the in-flight/settled promise. */
export function loadAudioBuffer(
  ctx: AudioContext,
  url: string,
): Promise<AudioBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data));

  promise.catch(() => bufferCache.delete(url));
  bufferCache.set(url, promise);
  return promise;
}
