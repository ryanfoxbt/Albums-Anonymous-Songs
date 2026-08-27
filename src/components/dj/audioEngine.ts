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

const bpmCache = new Map<string, number | null>();

/**
 * Rough BPM estimate from onset-energy peak spacing — no ID3/analysis
 * service involved, just a lightweight in-browser approximation. Good
 * enough for a "does this roughly match" beatmatching aid, not a
 * professional-grade detector.
 */
function estimateBpm(buffer: AudioBuffer): number | null {
  const channel = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = 1024;

  const energies: number[] = [];
  for (let i = 0; i + windowSize <= channel.length; i += windowSize) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      const sample = channel[j];
      sum += sample * sample;
    }
    energies.push(sum);
  }
  if (energies.length < 100) return null;

  // Onset = a window whose energy jumps well above its recent local
  // average, debounced so one transient can't register twice.
  const historyWindows = Math.round(sampleRate / windowSize); // ~1s
  const onsetTimes: number[] = [];
  for (let i = historyWindows; i < energies.length; i++) {
    let localSum = 0;
    for (let j = i - historyWindows; j < i; j++) localSum += energies[j];
    const localAvg = localSum / historyWindows;
    if (energies[i] > localAvg * 1.3 && energies[i] > 1e-5) {
      const timeSec = (i * windowSize) / sampleRate;
      if (onsetTimes.length === 0 || timeSec - onsetTimes[onsetTimes.length - 1] > 0.15) {
        onsetTimes.push(timeSec);
      }
    }
  }
  if (onsetTimes.length < 8) return null;

  // Fold each inter-onset interval into a plausible tempo range (70-180
  // BPM) by doubling/halving, then vote — the most common bucket wins.
  const bpmCounts = new Map<number, number>();
  for (let i = 1; i < onsetTimes.length; i++) {
    const interval = onsetTimes[i] - onsetTimes[i - 1];
    if (interval <= 0) continue;
    let bpm = 60 / interval;
    while (bpm < 70) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    const bucket = Math.round(bpm / 2) * 2;
    bpmCounts.set(bucket, (bpmCounts.get(bucket) ?? 0) + 1);
  }

  let bestBpm: number | null = null;
  let bestCount = 0;
  for (const [bpm, count] of bpmCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestBpm = bpm;
    }
  }
  return bestBpm;
}

/** Cached wrapper around {@link estimateBpm}, keyed by the same URL used for the audio buffer cache. */
export function getEstimatedBpm(buffer: AudioBuffer, cacheKey: string): number | null {
  if (bpmCache.has(cacheKey)) return bpmCache.get(cacheKey)!;
  const bpm = estimateBpm(buffer);
  bpmCache.set(cacheKey, bpm);
  return bpm;
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
