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
