"use client";

import { useEffect, useRef, useState } from "react";
import { loadAudioBuffer } from "./audioEngine";
import { Turntable } from "./Turntable";
import { DJ_DRAG_MIME, type DjSong } from "./types";
import { Waveform } from "./Waveform";

const FILTER_NEUTRAL_FREQ = 22050;
const FILTER_MIN_LOWPASS = 150;
const FILTER_MAX_HIGHPASS = 4000;

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

export function DjDeck({
  label,
  song,
  audioCtx,
  gain,
  tempo,
  onTempoChange,
  otherTempo,
  otherSong,
  onDropSong,
}: {
  label: "A" | "B";
  song: DjSong | null;
  audioCtx: AudioContext | null;
  /** This deck's target output gain (0..1), driven by the shared crossfader. */
  gain: number;
  tempo: number;
  onTempoChange: (tempo: number) => void;
  /** The other deck's tempo, for the "Sync" button. */
  otherTempo: number;
  otherSong: DjSong | null;
  onDropSong: (songId: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<{
    filter: BiquadFilterNode;
    dryGain: GainNode;
    delay: DelayNode;
    feedback: GainNode;
    wetGain: GainNode;
    deckGain: GainNode;
  } | null>(null);
  const loadedSongIdRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [filterKnob, setFilterKnob] = useState(0);
  const [echoOn, setEchoOn] = useState(false);
  const [echoMix, setEchoMix] = useState(0.3);
  const [trim, setTrim] = useState(1);
  const [cuePoint, setCuePoint] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

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

    const delay = audioCtx.createDelay(1);
    delay.delayTime.value = 0.3;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.35;
    const wetGain = audioCtx.createGain();
    wetGain.gain.value = 0;

    const deckGain = audioCtx.createGain();
    deckGain.gain.value = gain;

    source.connect(filter);
    filter.connect(dryGain).connect(deckGain);
    filter.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wetGain).connect(deckGain);
    deckGain.connect(audioCtx.destination);

    graphRef.current = { filter, dryGain, delay, feedback, wetGain, deckGain };
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
    const audio = audioRef.current;
    if (audio) audio.playbackRate = tempo;
  }, [tempo]);

  // Load a new song into this deck.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !song || loadedSongIdRef.current === song.id) return;
    loadedSongIdRef.current = song.id;

    audio.pause();
    audio.src = song.audioUrl;
    audio.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
    onTempoChange(1);
    setFilterKnob(0);
    setEchoOn(false);
    setCuePoint(0);
    setBuffer(null);

    if (audioCtx) {
      loadAudioBuffer(audioCtx, song.audioUrl)
        .then((buf) => {
          if (loadedSongIdRef.current === song.id) setBuffer(buf);
        })
        .catch(() => {
          // Waveform is a nice-to-have; playback still works without it.
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, audioCtx]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !song) return;
    audioCtx?.resume();
    if (audio.paused) audio.play();
    else audio.pause();
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
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-black/40 dark:text-white/40">
          Deck {label}
        </span>
        {song ? (
          <span className="truncate text-xs font-medium">
            {song.title} <span className="text-black/50 dark:text-white/50">— {song.artistName}</span>
          </span>
        ) : (
          <span className="truncate text-xs text-black/40 dark:text-white/40">
            Drop a song, or use &ldquo;→ {label}&rdquo;
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
            onClick={() => onTempoChange(otherTempo)}
            disabled={!song || !otherSong}
            title={`Match this deck's tempo to Deck ${label === "A" ? "B" : "A"}`}
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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEchoOn((v) => !v)}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
            echoOn
              ? "border-foreground bg-foreground text-background"
              : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          }`}
        >
          Echo
        </button>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.01}
          value={echoMix}
          disabled={!echoOn}
          onChange={(e) => setEchoMix(Number(e.target.value))}
          className="flex-1 accent-foreground disabled:opacity-30"
        />
      </div>
    </div>
  );
}
