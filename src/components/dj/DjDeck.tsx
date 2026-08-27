"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getImpulseResponse, loadTrack } from "./audioEngine";
import { Turntable } from "./Turntable";
import { DJ_DRAG_MIME, type DjSong } from "./types";
import { Waveform } from "./Waveform";

const FILTER_NEUTRAL_FREQ = 22050;
const FILTER_MIN_LOWPASS = 150;
const FILTER_MAX_HIGHPASS = 4000;
const FLANGER_BASE_DELAY = 0.006;
const FLANGER_DEPTH = 0.004;
const FLANGER_RATE_HZ = 0.22;

export type DjDeckHandle = {
  play: () => void;
  pause: () => void;
};

type ScratchPattern = {
  label: string;
  duration: number;
  /** [secondsFromStart, playbackRate] breakpoints, ramped between. */
  rate: [number, number][];
  /** Optional [secondsFromStart, gain 0|1] step-gate, for a choppy "transformer" cut. */
  gate?: [number, number][];
};

// Classic scratch moves, expressed as a playback-rate gesture on a short-lived
// AudioBufferSourceNode (which — unlike the deck's <audio> element — supports
// negative rates, i.e. actual reverse playback). Each pattern nets out close
// to its starting position, so the deck can just resume from there after.
const SCRATCH_PATTERNS: Record<"A" | "B" | "C", ScratchPattern> = {
  A: {
    label: "Baby scratch",
    duration: 0.35,
    rate: [
      [0, 0],
      [0.09, 3],
      [0.22, -3],
      [0.35, 0],
    ],
  },
  B: {
    label: "Scribble scratch",
    duration: 0.55,
    rate: [
      [0, 0],
      [0.06, 4.5],
      [0.14, -4.5],
      [0.22, 4.5],
      [0.3, -4.5],
      [0.38, 4.5],
      [0.46, -4.5],
      [0.55, 0],
    ],
  },
  C: {
    label: "Transformer scratch",
    duration: 0.5,
    rate: [
      [0, 0],
      [0.1, 3],
      [0.25, -3],
      [0.4, 3],
      [0.5, 0],
    ],
    gate: [
      [0, 1],
      [0.06, 0],
      [0.1, 1],
      [0.18, 0],
      [0.22, 1],
      [0.3, 0],
      [0.34, 1],
      [0.42, 0],
      [0.46, 1],
    ],
  },
};

function MiniSlider({
  label,
  valueLabel,
  title,
  ...inputProps
}: {
  label: string;
  valueLabel: string;
  title?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-0.5 text-[10px]" title={title}>
      <span className="flex justify-between text-black/50 dark:text-white/50">
        <span>{label}</span>
        <span>{valueLabel}</span>
      </span>
      <input type="range" className="w-full accent-foreground" {...inputProps} />
    </label>
  );
}

function FxToggle({
  label,
  on,
  onToggle,
  mix,
  onMixChange,
  max = 0.6,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  mix: number;
  onMixChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`w-16 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
          on
            ? "border-foreground bg-foreground text-background"
            : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        }`}
      >
        {label}
      </button>
      <input
        type="range"
        min={0}
        max={max}
        step={0.01}
        value={mix}
        disabled={!on}
        onChange={(e) => onMixChange(Number(e.target.value))}
        className="flex-1 accent-foreground disabled:opacity-30"
      />
    </div>
  );
}

export const DjDeck = forwardRef<
  DjDeckHandle,
  {
    label: "A" | "B";
    song: DjSong | null;
    audioCtx: AudioContext | null;
    /** This deck's target output gain (0..1), driven by the shared crossfader. */
    gain: number;
    tempo: number;
    onTempoChange: (tempo: number) => void;
    /** The other deck's tempo/BPM, for the "Sync" button. */
    otherTempo: number;
    otherBpm: number | null;
    otherSong: DjSong | null;
    onDropSong: (songId: string) => void;
    onBpmChange?: (bpm: number | null) => void;
    /** Fires when this deck's track finishes playing on its own — drives Auto DJ handoff. */
    onEnded?: () => void;
  }
>(function DjDeck(
  {
    label,
    song,
    audioCtx,
    gain,
    tempo,
    onTempoChange,
    otherTempo,
    otherBpm,
    otherSong,
    onDropSong,
    onBpmChange,
    onEnded,
  },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<{
    filter: BiquadFilterNode;
    dryGain: GainNode;
    delay: DelayNode;
    feedback: GainNode;
    wetGain: GainNode;
    reverbWetGain: GainNode;
    flangerWetGain: GainNode;
    flangerDelay: DelayNode;
    deckGain: GainNode;
  } | null>(null);
  const loadedSongIdRef = useRef<string | null>(null);
  const scratchStopRef = useRef<(() => void) | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [filterKnob, setFilterKnob] = useState(0);
  const [echoOn, setEchoOn] = useState(false);
  const [echoMix, setEchoMix] = useState(0.3);
  const [reverbOn, setReverbOn] = useState(false);
  const [reverbMix, setReverbMix] = useState(0.35);
  const [flangerOn, setFlangerOn] = useState(false);
  const [flangerMix, setFlangerMix] = useState(0.5);
  const [trim, setTrim] = useState(1);
  const [cuePoint, setCuePoint] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scratching, setScratching] = useState(false);

  useImperativeHandle(ref, () => ({
    play: () => {
      audioCtx?.resume();
      audioRef.current?.play();
    },
    pause: () => audioRef.current?.pause(),
  }));

  // Build the Web Audio node graph exactly once per deck. A
  // MediaElementAudioSourceNode can only ever be created once for a given
  // <audio> element, so this must not re-run (guarded against React
  // Strict Mode's double-invoke in dev).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioCtx || graphRef.current) return;

    const source = audioCtx.createMediaElementSource(audio);
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = FILTER_NEUTRAL_FREQ;

    const dryGain = audioCtx.createGain();
    dryGain.gain.value = 1;

    // Echo: a feedback delay loop.
    const delay = audioCtx.createDelay(1);
    delay.delayTime.value = 0.3;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.35;
    const wetGain = audioCtx.createGain();
    wetGain.gain.value = 0;

    // Reverb: a synthetic-impulse convolver.
    const convolver = audioCtx.createConvolver();
    convolver.buffer = getImpulseResponse(audioCtx);
    const reverbWetGain = audioCtx.createGain();
    reverbWetGain.gain.value = 0;

    // Flanger: a short LFO-modulated delay, swept continuously.
    const flangerDelay = audioCtx.createDelay(0.02);
    flangerDelay.delayTime.value = FLANGER_BASE_DELAY;
    const flangerFeedback = audioCtx.createGain();
    flangerFeedback.gain.value = 0.25;
    const flangerWetGain = audioCtx.createGain();
    flangerWetGain.gain.value = 0;
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = FLANGER_RATE_HZ;
    const lfoDepth = audioCtx.createGain();
    lfoDepth.gain.value = FLANGER_DEPTH;
    lfo.connect(lfoDepth).connect(flangerDelay.delayTime);
    lfo.start();

    const deckGain = audioCtx.createGain();
    deckGain.gain.value = gain;

    source.connect(filter);
    filter.connect(dryGain).connect(deckGain);
    filter.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wetGain).connect(deckGain);
    filter.connect(convolver).connect(reverbWetGain).connect(deckGain);
    filter.connect(flangerDelay);
    flangerDelay.connect(flangerFeedback).connect(flangerDelay);
    flangerDelay.connect(flangerWetGain).connect(deckGain);
    deckGain.connect(audioCtx.destination);

    graphRef.current = {
      filter,
      dryGain,
      delay,
      feedback,
      wetGain,
      reverbWetGain,
      flangerWetGain,
      flangerDelay,
      deckGain,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioCtx]);

  // Crossfader gain × per-deck volume trim, smoothed to avoid zipper clicks.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !audioCtx) return;
    graph.deckGain.gain.setTargetAtTime(gain * trim, audioCtx.currentTime, 0.01);
  }, [gain, trim, audioCtx]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (filterKnob === 0) {
      graph.filter.type = "lowpass";
      graph.filter.frequency.value = FILTER_NEUTRAL_FREQ;
    } else if (filterKnob < 0) {
      graph.filter.type = "lowpass";
      const t = -filterKnob; // 0..1
      graph.filter.frequency.value =
        FILTER_NEUTRAL_FREQ + t * (FILTER_MIN_LOWPASS - FILTER_NEUTRAL_FREQ);
    } else {
      graph.filter.type = "highpass";
      graph.filter.frequency.value = 20 + filterKnob * (FILTER_MAX_HIGHPASS - 20);
    }
  }, [filterKnob]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.wetGain.gain.value = echoOn ? echoMix : 0;
  }, [echoOn, echoMix]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.reverbWetGain.gain.value = reverbOn ? reverbMix : 0;
  }, [reverbOn, reverbMix]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.flangerWetGain.gain.value = flangerOn ? flangerMix : 0;
  }, [flangerOn, flangerMix]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = tempo;
  }, [tempo]);

  // Load a new song into this deck.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song || loadedSongIdRef.current === song.id) return;
    loadedSongIdRef.current = song.id;

    scratchStopRef.current?.();
    audio.pause();
    audio.src = song.audioUrl;
    audio.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
    onTempoChange(1);
    setFilterKnob(0);
    setEchoOn(false);
    setReverbOn(false);
    setFlangerOn(false);
    setCuePoint(0);
    setBuffer(null);
    setBpm(null);
    onBpmChange?.(null);

    if (audioCtx) {
      loadTrack(audioCtx, song.audioUrl)
        .then(({ buffer: buf, bpm: tagBpm }) => {
          if (loadedSongIdRef.current !== song.id) return;
          setBuffer(buf);
          setBpm(tagBpm);
          onBpmChange?.(tagBpm);
        })
        .catch(() => {
          // Waveform/BPM are nice-to-haves; playback still works without them.
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, audioCtx]);

  // Stop any in-flight scratch gesture when the deck unmounts.
  useEffect(() => {
    return () => scratchStopRef.current?.();
  }, []);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !song) return;
    audioCtx?.resume();
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function triggerScratch(patternKey: "A" | "B" | "C") {
    const audio = audioRef.current;
    const graph = graphRef.current;
    if (!audio || !audioCtx || !graph || !buffer || scratching) return;

    audioCtx.resume();
    const startPosition = Math.min(audio.currentTime, buffer.duration - 0.05);
    const wasPlaying = !audio.paused;
    audio.pause();

    const pattern = SCRATCH_PATTERNS[patternKey];
    const now = audioCtx.currentTime;

    const scratchGain = audioCtx.createGain();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(scratchGain).connect(graph.deckGain);

    source.playbackRate.setValueAtTime(pattern.rate[0][1], now);
    for (const [t, rate] of pattern.rate) {
      source.playbackRate.linearRampToValueAtTime(rate, now + t);
    }

    if (pattern.gate) {
      scratchGain.gain.setValueAtTime(pattern.gate[0][1], now);
      for (const [t, level] of pattern.gate) {
        scratchGain.gain.setValueAtTime(level, now + t);
      }
    }

    source.start(now, Math.max(0, startPosition));
    setScratching(true);

    const finish = () => {
      scratchStopRef.current = null;
      try {
        source.stop();
      } catch {
        // Already stopped — harmless.
      }
      source.disconnect();
      scratchGain.disconnect();
      setScratching(false);
      audio.currentTime = startPosition;
      if (wasPlaying) audio.play();
    };
    const timeoutId = window.setTimeout(finish, pattern.duration * 1000 + 30);
    scratchStopRef.current = () => {
      window.clearTimeout(timeoutId);
      finish();
    };
  }

  function jumpToCue() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = cuePoint;
  }

  function setCueHere() {
    const audio = audioRef.current;
    if (!audio) return;
    setCuePoint(audio.currentTime);
  }

  function syncTempo() {
    // Real beatmatching when both decks' BPM are known; otherwise just
    // copy the other deck's raw speed as a starting point.
    if (bpm && otherBpm) {
      const target = (otherBpm * otherTempo) / bpm;
      onTempoChange(Math.min(1.5, Math.max(0.5, target)));
    } else {
      onTempoChange(otherTempo);
    }
  }

  function handleSeek(fraction: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = fraction * audio.duration;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const id = e.dataTransfer.getData(DJ_DRAG_MIME);
    if (id) onDropSong(id);
  }

  const buttonClass =
    "flex items-center justify-center rounded-lg border border-black/15 text-[10px] font-medium hover:bg-black/5 disabled:opacity-30 dark:border-white/20 dark:hover:bg-white/10";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col gap-2 rounded-2xl border p-3 transition-colors ${
        isDragOver
          ? "border-foreground bg-black/5 dark:bg-white/10"
          : "border-black/10 dark:border-white/10"
      }`}
    >
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setProgress(audio.currentTime / audio.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
          Deck {label}
        </span>
        {song ? (
          <span className="min-w-0 truncate text-xs font-medium">
            {song.title} <span className="text-black/50 dark:text-white/50">— {song.artistName}</span>
          </span>
        ) : (
          <span className="truncate text-xs text-black/40 dark:text-white/40">
            Drop a song, or use &ldquo;→ {label}&rdquo;
          </span>
        )}
        {bpm && (
          <span
            className="shrink-0 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-black/50 dark:bg-white/10 dark:text-white/50"
            title="From this file's ID3 tag"
          >
            {bpm} BPM
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Turntable song={song} isPlaying={isPlaying} tempo={tempo} />
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!song}
            aria-label={isPlaying ? `Pause deck ${label}` : `Play deck ${label}`}
            className={`${buttonClass} h-8`}
          >
            {isPlaying ? (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <rect x="3" y="2" width="3.5" height="12" rx="0.5" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="0.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M4 2.5v11l10-5.5-10-5.5z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={syncTempo}
            disabled={!song || !otherSong}
            title={`Match this deck's tempo to Deck ${label === "A" ? "B" : "A"}${bpm && otherBpm ? " (beatmatched)" : ""}`}
            className={`${buttonClass} h-8`}
          >
            Sync
          </button>
          <button
            type="button"
            onClick={jumpToCue}
            disabled={!song}
            title={`Jump to ${cuePoint.toFixed(1)}s`}
            className={`${buttonClass} h-8`}
          >
            Cue
          </button>
          <button
            type="button"
            onClick={setCueHere}
            disabled={!song}
            title="Store the current position as this deck's cue point"
            className={`${buttonClass} h-8`}
          >
            Set
          </button>
        </div>
      </div>

      <Waveform buffer={buffer} progress={song ? progress : null} onSeek={handleSeek} />

      <div className="grid grid-cols-3 gap-2">
        <MiniSlider
          label="Tempo"
          valueLabel={`${Math.round(tempo * 100)}%`}
          min={0.5}
          max={1.5}
          step={0.01}
          value={tempo}
          onChange={(e) => onTempoChange(Number(e.target.value))}
          onDoubleClick={() => onTempoChange(1)}
        />
        <MiniSlider
          label="Volume"
          valueLabel={`${Math.round(trim * 100)}%`}
          min={0}
          max={1}
          step={0.01}
          value={trim}
          onChange={(e) => setTrim(Number(e.target.value))}
          onDoubleClick={() => setTrim(1)}
        />
        <MiniSlider
          label="Filter"
          valueLabel={`${filterKnob > 0 ? "+" : ""}${Math.round(filterKnob * 100)}%`}
          title="Low ← neutral → high"
          min={-1}
          max={1}
          step={0.01}
          value={filterKnob}
          onChange={(e) => setFilterKnob(Number(e.target.value))}
          onDoubleClick={() => setFilterKnob(0)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FxToggle label="Echo" on={echoOn} onToggle={() => setEchoOn((v) => !v)} mix={echoMix} onMixChange={setEchoMix} />
        <FxToggle
          label="Reverb"
          on={reverbOn}
          onToggle={() => setReverbOn((v) => !v)}
          mix={reverbMix}
          onMixChange={setReverbMix}
        />
        <FxToggle
          label="Flanger"
          on={flangerOn}
          onToggle={() => setFlangerOn((v) => !v)}
          mix={flangerMix}
          onMixChange={setFlangerMix}
        />
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[10px] font-medium text-black/50 dark:text-white/50">
            Scratch
          </span>
          <div className="grid flex-1 grid-cols-3 gap-1.5">
            {(["A", "B", "C"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => triggerScratch(key)}
                disabled={!song || !buffer || scratching}
                title={SCRATCH_PATTERNS[key].label}
                className={`${buttonClass} h-7`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
