"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackPodcastClick } from "@/lib/analyticsClient";
import { getImpulseResponse, loadTrack } from "./audioEngine";
import { FxToggle, MiniSlider } from "./controls";
import { Turntable } from "./Turntable";
import { DJ_DRAG_MIME, type DeckFx, type DjSong } from "./types";
import { Waveform } from "./Waveform";

function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

// Loop: default length (in beats, using the deck's BPM) for a freshly-set
// loop, and the fallback (in raw seconds) when the deck's BPM is unknown.
const DEFAULT_LOOP_BEATS = 4;
const DEFAULT_LOOP_FALLBACK_SEC = 2;
const MIN_LOOP_SEC = 0.05;
// One-tap loop lengths offered once the deck's BPM is known.
const LOOP_BEAT_PRESETS = [2, 4, 8, 16] as const;
// Fine loop nudge: 1/16 of a beat when the BPM is known, else a flat 20 ms.
const LOOP_NUDGE_FALLBACK_SEC = 0.02;
// Beat-jump button sizes (beats), and how many beats the grid calls a bar.
const BEAT_JUMP_SIZES = [4, 1] as const;
const BAR_BEATS = 4;

const FILTER_NEUTRAL_FREQ = 22050;
const FILTER_MIN_LOWPASS = 150;
const FILTER_MAX_HIGHPASS = 4000;
const FLANGER_BASE_DELAY = 0.006;
const FLANGER_DEPTH = 0.004;
const FLANGER_RATE_HZ = 0.22;

// Three-band EQ: shelf/peak centre frequencies and the ± range of each knob.
const EQ_LOW_HZ = 220;
const EQ_MID_HZ = 1000;
const EQ_HIGH_HZ = 3800;
const EQ_MIN_DB = -24;
const EQ_MAX_DB = 12;

/** Momentary actions the deck performs — reported so a recorder can log them.
 *  The imperative handle methods do the same things WITHOUT reporting (that's
 *  the replay path). */
export type DeckAction =
  | { k: "play" }
  | { k: "pause" }
  | { k: "seek"; pos: number }
  | { k: "cueSet"; pos?: number }
  | { k: "cue" }
  | { k: "cueClear" }
  | { k: "loopSet"; start: number; end: number }
  | { k: "loopExit" }
  | { k: "scratch"; pattern: "A" | "B" | "C" };

export type Loop = { start: number; end: number }; // seconds

export type DjDeckHandle = {
  play: () => void;
  pause: () => void;
  seek: (fraction: number) => void;
  jumpToCue: () => void;
  /** Sets the cue point. With no argument it uses the live playhead; with a
   *  0..1 fraction it places the cue there (the replay path passes the
   *  recorded position so a dragged cue lands where it was dragged). */
  setCueHere: (fraction?: number) => void;
  /** Grid-snapping, reporting cue set — the keyboard-shortcut counterpart to
   *  the Set Cue button (setCueHere is the raw replay path). */
  setCueHereUser: () => void;
  clearCue: () => void;
  setLoop: (start: number, end: number) => void;
  exitLoop: () => void;
  /** Toggle the one-tap loop / exit. Unlike most handle methods this DOES
   *  report (via onAction) — it's a keyboard-shortcut entry point, and loops
   *  replay from the recorded loopSet/loopExit events, not this call. */
  toggleLoop: () => void;
  /** Jump by whole beats (keyboard shortcut). Reports a seek, for the same
   *  reason as toggleLoop. No-op when the BPM is unknown. */
  beatJump: (beats: number) => void;
  triggerScratch: (pattern: "A" | "B" | "C") => void;
  /** For the record-start snapshot: is this deck's <audio> currently playing? */
  isPlaying: () => boolean;
  /** Current playhead as a 0..1 fraction of the track (0 if unknown). */
  currentPos: () => number;
  /** Seeks to an absolute position, in native track-seconds (unlike `seek`,
   *  which takes a 0..1 fraction) — used for Sync's phase-alignment nudge. */
  seekSeconds: (t: number) => void;
  /** This deck's current playhead and beat-grid offset, both in native
   *  track-seconds — the two numbers Sync needs to compute a beat-phase offset. */
  getBeatAnchor: () => { positionSec: number; gridOffsetSec: number } | null;
  /** iOS: a gesture-initiated play()/pause() so this <audio> can be started
   *  programmatically later. Needed by the /mix replay, where one tap has to
   *  drive both decks over time and iOS otherwise blocks the deferred play(). */
  primeAudio: () => void;
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

export const DjDeck = forwardRef<
  DjDeckHandle,
  {
    label: "A" | "B";
    song: DjSong | null;
    audioCtx: AudioContext | null;
    /** Creates the shared AudioContext on first use (from a user gesture). */
    ensureAudioContext: () => AudioContext;
    /** This deck's target output gain (0..1), driven by the shared crossfader. */
    gain: number;
    tempo: number;
    onTempoChange: (tempo: number) => void;
    /** The other deck's BPM, just for the "Sync" button's label/enabled state. */
    otherBpm: number | null;
    otherSong: DjSong | null;
    /** Beatmatches AND phase-aligns this deck to the other one. The actual
     *  computation lives in DjBoard, which can see both decks' state/refs. */
    onSyncRequest?: () => void;
    onDropSong: (songId: string) => void;
    /** Highlights this deck as the target of keyboard shortcuts. */
    focused?: boolean;
    /** Asks DjBoard to make this the keyboard-focused deck (on pointer-down). */
    onFocusRequest?: () => void;
    /** This deck is currently following the other one's tempo via Sync. */
    syncActive?: boolean;
    /** Fires when this deck's track finishes playing on its own — drives Auto DJ handoff. */
    onEnded?: () => void;
    /** Controlled continuous/toggle FX state (lifted to DjBoard). */
    fx: DeckFx;
    onFx: (key: keyof DeckFx, value: number | boolean) => void;
    /** Reports a momentary user action (play/pause/seek/cue/scratch). */
    onAction?: (action: DeckAction) => void;
    /** Playback mode — every control is read-only and driven externally. */
    disabled?: boolean;
  }
>(function DjDeck(
  {
    label,
    song,
    audioCtx,
    ensureAudioContext,
    gain,
    tempo,
    onTempoChange,
    otherBpm,
    otherSong,
    onSyncRequest,
    onDropSong,
    onEnded,
    fx,
    onFx,
    onAction,
    disabled = false,
    focused = false,
    onFocusRequest,
    syncActive = false,
  },
  ref,
) {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<{
    filter: BiquadFilterNode;
    eqLow: BiquadFilterNode;
    eqMid: BiquadFilterNode;
    eqHigh: BiquadFilterNode;
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
  // BPM is whatever's been set on the Song record in the admin panel — no
  // detection, no tap-tempo. Null until an admin has entered one.
  const bpm = song?.bpm ?? null;
  // Seconds from track start to the first grid beat. Starts at the track
  // start; the "Grid" button re-anchors it to the playhead by ear.
  const [beatOffset, setBeatOffset] = useState(0);
  // Snap cue / loop points / beat jumps to the grid.
  const [quantize, setQuantize] = useState(true);
  const [cuePoint, setCuePoint] = useState(0);
  const [hasCue, setHasCue] = useState(false);
  const [loopRange, setLoopRange] = useState<Loop | null>(null);
  // A manual loop half-set: "Loop In" captured a start, "Loop Out" not yet hit.
  const [loopInPoint, setLoopInPoint] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scratching, setScratching] = useState(false);
  // Set while the Cue button is held down from a paused deck (momentary preview).
  const cuePreviewRef = useRef(false);

  useImperativeHandle(ref, () => ({
    play: () => void resumeAndPlay(),
    pause: () => audioRef.current?.pause(),
    seek: (fraction: number) => seekTo(fraction),
    jumpToCue: () => jumpToCue(),
    setCueHere: (fraction?: number) => setCueAt(fraction),
    /** Keyboard entry point — behaves like the Set Cue button (grid-snaps
     *  and reports), unlike setCueHere which is the raw replay path. */
    setCueHereUser: () => handleSetCue(),
    clearCue: () => clearCue(),
    setLoop: (start, end) => setLoopRange({ start, end }),
    exitLoop: () => {
      setLoopRange(null);
      setLoopInPoint(null);
    },
    toggleLoop: () => toggleLoop(),
    beatJump: (beats) => beatJump(beats),
    triggerScratch: (pattern) => triggerScratch(pattern),
    isPlaying: () => !!audioRef.current && !audioRef.current.paused,
    currentPos: () => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
        return 0;
      }
      return audio.currentTime / audio.duration;
    },
    seekSeconds: (t) => {
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.max(0, t);
    },
    getBeatAnchor: () => {
      const audio = audioRef.current;
      if (!audio) return null;
      return { positionSec: audio.currentTime, gridOffsetSec: beatOffset };
    },
    primeAudio: () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        // A gesture-initiated play() marks this element "user-activated" for
        // iOS, so the replay scheduler's later programmatic play() is allowed.
        // Pause synchronously — the scheduler drives real playback from here.
        const p = audio.play();
        audio.pause();
        if (p && typeof p.then === "function") p.catch(() => {});
      } catch {
        // element not ready — harmless
      }
    },
  }));

  // Bring the AudioContext up *before* the element starts. resume() is async,
  // so firing it and calling play() in the same tick races — the deck can come
  // up silent because the <audio> is routed through the still-suspended graph.
  // (This was why the first manual play after a page load was hit-or-miss.)
  async function resumeAndPlay() {
    const audio = audioRef.current;
    if (!audio) return;
    const ctx = ensureAudioContext();
    if (ctx.state !== "running") {
      try {
        await ctx.resume();
      } catch {
        // No user activation yet, or already resuming — try to play regardless.
      }
    }
    try {
      await audio.play();
    } catch {
      // Autoplay rejection or a load race; hitting play again will work.
    }
  }

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

    // Three-band EQ, unity (0 dB) by default so it's transparent until touched.
    const lowShelf = audioCtx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = EQ_LOW_HZ;
    const midPeak = audioCtx.createBiquadFilter();
    midPeak.type = "peaking";
    midPeak.frequency.value = EQ_MID_HZ;
    midPeak.Q.value = 0.8;
    const highShelf = audioCtx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = EQ_HIGH_HZ;

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

    // filter → EQ chain → (dry + every FX send), so the EQ shapes everything.
    source.connect(filter);
    filter.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(dryGain).connect(deckGain);
    highShelf.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wetGain).connect(deckGain);
    highShelf.connect(convolver).connect(reverbWetGain).connect(deckGain);
    highShelf.connect(flangerDelay);
    flangerDelay.connect(flangerFeedback).connect(flangerDelay);
    flangerDelay.connect(flangerWetGain).connect(deckGain);
    deckGain.connect(audioCtx.destination);

    graphRef.current = {
      filter,
      eqLow: lowShelf,
      eqMid: midPeak,
      eqHigh: highShelf,
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
    graph.deckGain.gain.setTargetAtTime(
      gain * fx.trim,
      audioCtx.currentTime,
      0.01,
    );
  }, [gain, fx.trim, audioCtx]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (fx.filter === 0) {
      graph.filter.type = "lowpass";
      graph.filter.frequency.value = FILTER_NEUTRAL_FREQ;
    } else if (fx.filter < 0) {
      graph.filter.type = "lowpass";
      const t = -fx.filter; // 0..1
      graph.filter.frequency.value =
        FILTER_NEUTRAL_FREQ + t * (FILTER_MIN_LOWPASS - FILTER_NEUTRAL_FREQ);
    } else {
      graph.filter.type = "highpass";
      graph.filter.frequency.value = 20 + fx.filter * (FILTER_MAX_HIGHPASS - 20);
    }
  }, [fx.filter]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !audioCtx) return;
    const now = audioCtx.currentTime;
    graph.eqLow.gain.setTargetAtTime(fx.eqLow, now, 0.01);
    graph.eqMid.gain.setTargetAtTime(fx.eqMid, now, 0.01);
    graph.eqHigh.gain.setTargetAtTime(fx.eqHigh, now, 0.01);
  }, [fx.eqLow, fx.eqMid, fx.eqHigh, audioCtx]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.wetGain.gain.value = fx.echoOn ? fx.echoMix : 0;
  }, [fx.echoOn, fx.echoMix]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.reverbWetGain.gain.value = fx.reverbOn ? fx.reverbMix : 0;
  }, [fx.reverbOn, fx.reverbMix]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.flangerWetGain.gain.value = fx.flangerOn ? fx.flangerMix : 0;
  }, [fx.flangerOn, fx.flangerMix]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = tempo;
  }, [tempo]);

  // Loop watcher: while a loop is set, poll the playhead every animation
  // frame and snap it back to the loop start once it reaches the end. A
  // rAF poll (rather than the audio element's coarser `timeupdate`) keeps
  // the seam tight enough to sound like a real loop, not a stutter.
  useEffect(() => {
    if (!loopRange) return;
    const audio = audioRef.current;
    if (!audio) return;
    let raf: number;
    const check = () => {
      if (audio.currentTime >= loopRange.end) {
        audio.currentTime = loopRange.start;
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, [loopRange]);

  // Load a new song into this deck. FX + tempo are reset by DjBoard (they're
  // lifted props now); this only handles the deck-local + audio-element side.
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
    setCuePoint(0);
    setHasCue(false);
    setLoopRange(null);
    setLoopInPoint(null);
    setDuration(0);
    setBeatOffset(0);
    setBuffer(null);
  }, [song]);

  // Decode the track for the waveform + scratch buffer. Runs whenever there's a
  // song and a context but no buffer yet — including a song that was restored
  // from a previous session before the AudioContext existed.
  useEffect(() => {
    if (!song || !audioCtx || buffer) return;
    const songId = song.id;
    let cancelled = false;
    loadTrack(audioCtx, song.audioUrl)
      .then(({ buffer: buf }) => {
        if (cancelled || loadedSongIdRef.current !== songId) return;
        setBuffer(buf);
      })
      .catch(() => {
        // The waveform is a nice-to-have; playback still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, [song, audioCtx, buffer]);

  // Stop any in-flight scratch gesture when the deck unmounts.
  useEffect(() => {
    return () => scratchStopRef.current?.();
  }, []);

  function handlePlayButton() {
    const audio = audioRef.current;
    if (!audio || !song || disabled) return;
    if (audio.paused) {
      void resumeAndPlay();
      onAction?.({ k: "play" });
    } else {
      audio.pause();
      onAction?.({ k: "pause" });
    }
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

  // Best available track length in seconds: the <audio> element's own clock
  // (what the playhead is measured against) with the decoded buffer as a
  // fallback before metadata has loaded. Keeping every marker on this one
  // denominator is what makes the cue/loop lines sit under the red playhead.
  function trackDuration(): number {
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      return audio.duration;
    }
    return duration || buffer?.duration || 0;
  }

  function clampLoop({ start, end }: Loop): Loop {
    const max = trackDuration();
    const lo = Math.max(0, start);
    const hiCeil = max > 0 ? max : lo + end - start + MIN_LOOP_SEC;
    const hi = Math.min(hiCeil, Math.max(lo + MIN_LOOP_SEC, end));
    return { start: lo, end: hi };
  }

  function commitLoop(next: Loop) {
    const clamped = clampLoop(next);
    setLoopRange(clamped);
    onAction?.({ k: "loopSet", start: clamped.start, end: clamped.end });
  }

  // Cue jump. Unlike a CDJ's temporary cue (which stops the deck), this keeps
  // the track running from the marker when it was already playing — the
  // hot-cue behaviour, which is what you want mid-mix. Preview-while-paused is
  // handled separately by the button's press-and-hold.
  function jumpToCue() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = cuePoint;
  }

  function setCueAt(fraction?: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = trackDuration();
    const t =
      fraction != null && dur > 0
        ? Math.min(dur, Math.max(0, fraction * dur))
        : audio.currentTime;
    setCuePoint(t);
    setHasCue(true);
  }

  function clearCue() {
    setCuePoint(0);
    setHasCue(false);
  }

  // --- Cue button gestures (mouse/touch). Keyboard activation goes through
  //     onKeyDown, which just does a plain jump.
  function handleCuePointerDown() {
    const audio = audioRef.current;
    if (!audio || !song || disabled) return;
    if (audio.paused) {
      // Momentary preview: audition from the cue for as long as the button is
      // held, then snap back and stay paused on release.
      cuePreviewRef.current = true;
      audio.currentTime = cuePoint;
      void audio.play().catch(() => {});
    } else {
      audio.currentTime = cuePoint;
      onAction?.({ k: "cue" });
    }
  }

  function handleCuePointerUp() {
    const audio = audioRef.current;
    if (!cuePreviewRef.current || !audio) return;
    cuePreviewRef.current = false;
    audio.pause();
    audio.currentTime = cuePoint;
    onAction?.({ k: "cue" });
  }

  function handleCueKey(e: React.KeyboardEvent) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!song || disabled) return;
    jumpToCue();
    onAction?.({ k: "cue" });
  }

  function handleSetCue() {
    const audio = audioRef.current;
    if (!audio || !song || disabled) return;
    const dur = trackDuration();
    const t = Math.max(0, snapToGrid(audio.currentTime));
    setCuePoint(t);
    setHasCue(true);
    onAction?.({ k: "cueSet", pos: dur > 0 ? t / dur : undefined });
  }

  function handleClearCue() {
    if (disabled) return;
    clearCue();
    onAction?.({ k: "cueClear" });
  }

  function seekTo(fraction: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = fraction * audio.duration;
  }

  const beatLen = bpm && bpm > 0 ? 60 / bpm : null;
  const loopBeatLen = beatLen;

  function loopBeatCount(l: Loop): number | null {
    return loopBeatLen ? Math.round((l.end - l.start) / loopBeatLen) : null;
  }

  // Round a time to the nearest grid beat when Quantize is on and a grid
  // exists; otherwise pass it through untouched.
  function snapToGrid(t: number): number {
    if (!quantize || !beatLen) return t;
    return beatOffset + Math.round((t - beatOffset) / beatLen) * beatLen;
  }

  // Re-anchor the beat grid so a downbeat lands on the current playhead.
  function setGridHere() {
    const audio = audioRef.current;
    if (!audio || !beatLen || disabled) return;
    setBeatOffset(mod(audio.currentTime, beatLen));
  }

  // Jump by whole beats without breaking stride. Re-snaps to the grid
  // afterward (when quantizing) so repeated jumps stay locked even if the
  // playhead started slightly off.
  function beatJump(beats: number) {
    const audio = audioRef.current;
    if (!audio || !song || disabled || !beatLen) return;
    const dur = trackDuration();
    let t = audio.currentTime + beats * beatLen;
    t = snapToGrid(t);
    t = Math.max(0, dur > 0 ? Math.min(dur - 0.05, t) : t);
    audio.currentTime = t;
    onAction?.({ k: "seek", pos: dur > 0 ? t / dur : 0 });
  }

  // The prominent "Loop" button: a one-tap 4-beat loop from the playhead (or a
  // 2-second loop when the BPM is unknown), and the exit toggle once one's set.
  function toggleLoop() {
    if (loopRange) {
      setLoopRange(null);
      setLoopInPoint(null);
      onAction?.({ k: "loopExit" });
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    const len = loopBeatLen
      ? DEFAULT_LOOP_BEATS * loopBeatLen
      : DEFAULT_LOOP_FALLBACK_SEC;
    const start = Math.max(0, snapToGrid(audio.currentTime));
    commitLoop({ start, end: start + len });
  }

  function adjustLoopLength(factor: number) {
    if (!loopRange) return;
    const len = Math.max(MIN_LOOP_SEC, (loopRange.end - loopRange.start) * factor);
    commitLoop({ start: loopRange.start, end: loopRange.start + len });
  }

  // Snap the loop to an exact beat count, anchored at the existing loop start
  // (or the playhead if no loop is running yet).
  function setLoopBeats(beats: number) {
    if (!loopBeatLen) return;
    const anchor = loopRange?.start ?? audioRef.current?.currentTime ?? 0;
    commitLoop({ start: anchor, end: anchor + beats * loopBeatLen });
  }

  // Fine nudge: shift the whole loop earlier/later by a fraction of a beat to
  // tighten it against the downbeat without changing its length.
  function nudgeLoop(dir: -1 | 1) {
    if (!loopRange) return;
    const step = (loopBeatLen ? loopBeatLen / 16 : LOOP_NUDGE_FALLBACK_SEC) * dir;
    const max = trackDuration();
    let start = loopRange.start + step;
    let end = loopRange.end + step;
    if (start < 0) {
      end -= start;
      start = 0;
    }
    if (max > 0 && end > max) {
      start -= end - max;
      end = max;
      start = Math.max(0, start);
    }
    setLoopRange({ start, end });
    onAction?.({ k: "loopSet", start, end });
  }

  // Manual loop by ear: "Loop In" drops a start point while the track keeps
  // playing, "Loop Out" closes it at the current playhead.
  function setLoopIn() {
    const audio = audioRef.current;
    if (!audio || !song || disabled) return;
    setLoopInPoint(Math.max(0, snapToGrid(audio.currentTime)));
  }

  function setLoopOut() {
    const audio = audioRef.current;
    if (!audio || loopInPoint == null || disabled) return;
    const out = Math.max(0, snapToGrid(audio.currentTime));
    const start = Math.min(loopInPoint, out);
    const end = Math.max(loopInPoint, out);
    setLoopInPoint(null);
    commitLoop({ start, end });
  }

  // Drag of a green handle on the waveform. `committed` is false during the
  // drag (local state only) and true on release (recorded).
  function handleLoopDrag(next: Loop, committed: boolean) {
    const clamped = clampLoop(next);
    setLoopRange(clamped);
    if (committed) {
      onAction?.({ k: "loopSet", start: clamped.start, end: clamped.end });
    }
  }

  // Drag of the blue cue marker on the waveform.
  function handleCueDrag(fraction: number, committed: boolean) {
    const dur = trackDuration();
    if (dur <= 0) return;
    setCuePoint(Math.min(dur, Math.max(0, fraction * dur)));
    setHasCue(true);
    if (committed) onAction?.({ k: "cueSet", pos: fraction });
  }

  function handleSeek(fraction: number) {
    if (disabled) return;
    seekTo(fraction);
    onAction?.({ k: "seek", pos: fraction });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const id = e.dataTransfer.getData(DJ_DRAG_MIME);
    if (id) onDropSong(id);
  }

  const buttonClass =
    "flex items-center justify-center rounded-lg border border-black/15 text-[10px] font-medium hover:bg-black/5 disabled:opacity-30 dark:border-white/20 dark:hover:bg-white/10";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onPointerDownCapture={() => !disabled && onFocusRequest?.()}
      className={`flex flex-col gap-2 rounded-2xl border p-3 transition-colors ${
        isDragOver
          ? "border-foreground bg-black/5 dark:bg-white/10"
          : focused
            ? "border-foreground/40 ring-1 ring-foreground/25"
            : "border-black/10 dark:border-white/10"
      }`}
    >
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="auto"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) && d > 0 ? d : 0);
        }}
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
          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium">
            <span className="min-w-0 truncate">
              {song.title}{" "}
              <span className="text-black/50 dark:text-white/50">
                — {song.artistName}
              </span>
            </span>
            {song.podcastEpisodeUrl && (
              <a
                href={song.podcastEpisodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackPodcastClick(
                    song.id,
                    song.podcastEpisodeUrl!,
                    pathname ?? "/dj",
                  )
                }
                title={
                  song.podcastEpisodeTitle
                    ? `First heard on: ${song.podcastEpisodeTitle}`
                    : "Hear this on the podcast"
                }
                className="shrink-0 rounded-full border border-violet-400/50 bg-violet-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-600/20 dark:text-violet-300"
              >
                {song.firstHeardOnEpisode != null
                  ? `Ep ${song.firstHeardOnEpisode}`
                  : "Podcast"}{" "}
                ↗
              </a>
            )}
          </span>
        ) : (
          <span className="truncate text-xs text-black/40 dark:text-white/40">
            Drop a song, or use &ldquo;→ {label}&rdquo;
          </span>
        )}
        {song && (
          <div className="flex shrink-0 items-center gap-1">
            {bpm != null ? (
              <span
                title={
                  tempo !== 1
                    ? `${bpm} BPM · playing at ${(bpm * tempo).toFixed(1)}`
                    : `${bpm} BPM (set in admin)`
                }
                className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-black/60 dark:bg-white/10 dark:text-white/60"
              >
                {tempo !== 1 ? `${(bpm * tempo).toFixed(1)} BPM` : `${bpm} BPM`}
              </span>
            ) : (
              <span
                title="No BPM set for this track — Sync, the beat grid, Snap and beat jump need one (set it in the admin panel)"
                className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-black/35 dark:bg-white/10 dark:text-white/35"
              >
                no BPM
              </span>
            )}
            {bpm != null && (
              <>
                <button
                  type="button"
                  onClick={() => setQuantize((q) => !q)}
                  disabled={disabled}
                  aria-pressed={quantize}
                  title={
                    quantize
                      ? "Snap is on — cue, loop and beat-jump land on the grid"
                      : "Snap is off — cue and loop points land exactly where you set them"
                  }
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-40 ${
                    quantize
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-black/15 text-black/50 dark:border-white/20 dark:text-white/50"
                  }`}
                >
                  Snap
                </button>
                <button
                  type="button"
                  onClick={setGridHere}
                  disabled={disabled}
                  title="Re-anchor the beat grid so a downbeat sits on the playhead"
                  className="rounded-full border border-black/15 px-1.5 py-0.5 text-[10px] font-medium text-black/50 hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:text-white/50 dark:hover:bg-white/10"
                >
                  Grid
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Turntable song={song} isPlaying={isPlaying} tempo={tempo} />
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handlePlayButton}
            disabled={!song || disabled}
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
            onClick={() => onSyncRequest?.()}
            disabled={!song || !otherSong || disabled}
            title={
              syncActive
                ? `Following Deck ${label === "A" ? "B" : "A"}'s tempo — click to release`
                : `Match tempo (half/double-time aware) and beat-align to Deck ${label === "A" ? "B" : "A"}, then follow it${bpm && otherBpm ? "" : " — both decks need a BPM for the beat-align"}`
            }
            className={`${buttonClass} h-8 ${syncActive ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : ""}`}
          >
            {syncActive ? "Synced" : "Sync"}
          </button>
          <button
            type="button"
            onPointerDown={handleCuePointerDown}
            onPointerUp={handleCuePointerUp}
            onPointerLeave={handleCuePointerUp}
            onPointerCancel={handleCuePointerUp}
            onKeyDown={handleCueKey}
            disabled={!song || disabled}
            title={
              hasCue
                ? `Cue ${cuePoint.toFixed(2)}s — tap to jump (keeps playing), hold to preview while paused`
                : "Jump to the start — hold to preview while paused"
            }
            className={`${buttonClass} h-8 touch-none select-none`}
          >
            Cue
          </button>
          <button
            type="button"
            onClick={handleSetCue}
            disabled={!song || disabled}
            title="Set the cue point here — drops a blue marker you can drag on the waveform"
            className={`${buttonClass} h-8`}
          >
            Set Cue
          </button>
          <button
            type="button"
            onClick={setLoopIn}
            disabled={!song || disabled}
            title="Mark the loop's start at the playhead (the track keeps playing)"
            className={`${buttonClass} h-8 ${loopInPoint != null ? "border-amber-500 text-amber-600 dark:text-amber-400" : ""}`}
          >
            Loop In
          </button>
          <button
            type="button"
            onClick={setLoopOut}
            disabled={!song || disabled || loopInPoint == null}
            title="Close the loop at the playhead"
            className={`${buttonClass} h-8`}
          >
            Loop Out
          </button>
          <button
            type="button"
            onClick={toggleLoop}
            disabled={!song || disabled}
            title={
              loopRange
                ? "Exit the loop and let the track keep playing"
                : "One-tap 4-beat loop from here — then drag the green handles or use the beat / nudge buttons"
            }
            className={`${buttonClass} col-span-2 h-8 ${loopRange ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : ""}`}
          >
            {loopRange ? "Exit Loop" : "Loop"}
          </button>
        </div>
      </div>

      {song && beatLen && (
        <div className="-mt-1 flex items-center gap-1.5 text-[10px] text-black/45 dark:text-white/45">
          <span>Beat jump</span>
          {[...BEAT_JUMP_SIZES].map((b) => (
            <button
              key={`b-${b}`}
              type="button"
              onClick={() => beatJump(-b)}
              disabled={disabled}
              title={`Jump back ${b} beat${b === 1 ? "" : "s"}`}
              className={`${buttonClass} h-6 w-8`}
            >
              «{b}
            </button>
          ))}
          {[...BEAT_JUMP_SIZES].reverse().map((b) => (
            <button
              key={`f-${b}`}
              type="button"
              onClick={() => beatJump(b)}
              disabled={disabled}
              title={`Jump forward ${b} beat${b === 1 ? "" : "s"}`}
              className={`${buttonClass} h-6 w-8`}
            >
              {b}»
            </button>
          ))}
        </div>
      )}

      {hasCue && (
        <div className="-mt-1 flex items-center gap-2 text-[10px] text-black/45 dark:text-white/45">
          <span className="tabular-nums">Cue {cuePoint.toFixed(2)}s</span>
          <span className="text-black/30 dark:text-white/30">
            drag the blue marker to fine-tune
          </span>
          <button
            type="button"
            onClick={handleClearCue}
            disabled={disabled}
            title="Clear the cue point"
            className={`${buttonClass} ml-auto h-6 px-2`}
          >
            Clear
          </button>
        </div>
      )}

      {loopRange && (
        <div className="-mt-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] text-black/45 dark:text-white/45">
            <span className="tabular-nums">
              Loop{" "}
              {loopBeatCount(loopRange) != null &&
                `${loopBeatCount(loopRange)} beat${
                  loopBeatCount(loopRange) === 1 ? "" : "s"
                } · `}
              {(loopRange.end - loopRange.start).toFixed(2)}s
            </span>
            <span className="text-black/30 dark:text-white/30">
              drag the green handles
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => nudgeLoop(-1)}
              disabled={disabled}
              title="Nudge the whole loop earlier"
              className={`${buttonClass} h-6 w-7`}
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => adjustLoopLength(0.5)}
              disabled={disabled}
              title="Halve the loop length"
              className={`${buttonClass} h-6 w-7`}
            >
              ½
            </button>
            <button
              type="button"
              onClick={() => adjustLoopLength(2)}
              disabled={disabled}
              title="Double the loop length"
              className={`${buttonClass} h-6 w-7`}
            >
              2×
            </button>
            <button
              type="button"
              onClick={() => nudgeLoop(1)}
              disabled={disabled}
              title="Nudge the whole loop later"
              className={`${buttonClass} h-6 w-7`}
            >
              ▶
            </button>
            {loopBeatLen && (
              <>
                <span className="pl-1 text-[10px] text-black/30 dark:text-white/30">
                  beats
                </span>
                {LOOP_BEAT_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setLoopBeats(b)}
                    disabled={disabled}
                    title={`Set a ${b}-beat loop`}
                    className={`${buttonClass} h-6 w-7 ${
                      loopBeatCount(loopRange) === b
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : ""
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <Waveform
        buffer={buffer}
        progress={song ? progress : null}
        onSeek={handleSeek}
        disabled={disabled}
        cuePoint={
          hasCue && trackDuration() > 0 ? cuePoint / trackDuration() : null
        }
        loop={
          loopRange && trackDuration() > 0
            ? {
                start: loopRange.start / trackDuration(),
                end: loopRange.end / trackDuration(),
              }
            : null
        }
        pendingLoopIn={
          loopInPoint != null && trackDuration() > 0
            ? loopInPoint / trackDuration()
            : null
        }
        beatGrid={
          beatLen && trackDuration() > 0
            ? {
                offset: mod(beatOffset, beatLen) / trackDuration(),
                spacing: beatLen / trackDuration(),
                barBeats: BAR_BEATS,
              }
            : null
        }
        onCueChange={disabled ? undefined : handleCueDrag}
        onLoopChange={disabled ? undefined : handleLoopDrag}
      />

      <div className="grid grid-cols-3 gap-2">
        <MiniSlider
          label="Tempo"
          valueLabel={`${Math.round(tempo * 100)}%`}
          min={0.5}
          max={1.5}
          step={0.01}
          value={tempo}
          disabled={disabled}
          onChange={(e) => onTempoChange(Number(e.target.value))}
          onDoubleClick={() => !disabled && onTempoChange(1)}
        />
        <MiniSlider
          label="Volume"
          valueLabel={`${Math.round(fx.trim * 100)}%`}
          min={0}
          max={1}
          step={0.01}
          value={fx.trim}
          disabled={disabled}
          onChange={(e) => onFx("trim", Number(e.target.value))}
          onDoubleClick={() => !disabled && onFx("trim", 1)}
        />
        <MiniSlider
          label="Filter"
          valueLabel={`${fx.filter > 0 ? "+" : ""}${Math.round(fx.filter * 100)}%`}
          title="Low ← neutral → high"
          min={-1}
          max={1}
          step={0.01}
          value={fx.filter}
          disabled={disabled}
          onChange={(e) => onFx("filter", Number(e.target.value))}
          onDoubleClick={() => !disabled && onFx("filter", 0)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniSlider
          label="EQ Low"
          valueLabel={`${fx.eqLow > 0 ? "+" : ""}${fx.eqLow} dB`}
          title="Low shelf — double-click to reset"
          min={EQ_MIN_DB}
          max={EQ_MAX_DB}
          step={1}
          value={fx.eqLow}
          disabled={disabled}
          onChange={(e) => onFx("eqLow", Number(e.target.value))}
          onDoubleClick={() => !disabled && onFx("eqLow", 0)}
        />
        <MiniSlider
          label="EQ Mid"
          valueLabel={`${fx.eqMid > 0 ? "+" : ""}${fx.eqMid} dB`}
          title="Mid peak — double-click to reset"
          min={EQ_MIN_DB}
          max={EQ_MAX_DB}
          step={1}
          value={fx.eqMid}
          disabled={disabled}
          onChange={(e) => onFx("eqMid", Number(e.target.value))}
          onDoubleClick={() => !disabled && onFx("eqMid", 0)}
        />
        <MiniSlider
          label="EQ High"
          valueLabel={`${fx.eqHigh > 0 ? "+" : ""}${fx.eqHigh} dB`}
          title="High shelf — double-click to reset"
          min={EQ_MIN_DB}
          max={EQ_MAX_DB}
          step={1}
          value={fx.eqHigh}
          disabled={disabled}
          onChange={(e) => onFx("eqHigh", Number(e.target.value))}
          onDoubleClick={() => !disabled && onFx("eqHigh", 0)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <FxToggle
          label="Echo"
          on={fx.echoOn}
          disabled={disabled}
          onToggle={() => onFx("echoOn", !fx.echoOn)}
          mix={fx.echoMix}
          onMixChange={(v) => onFx("echoMix", v)}
        />
        <FxToggle
          label="Reverb"
          on={fx.reverbOn}
          disabled={disabled}
          onToggle={() => onFx("reverbOn", !fx.reverbOn)}
          mix={fx.reverbMix}
          onMixChange={(v) => onFx("reverbMix", v)}
        />
        <FxToggle
          label="Flanger"
          on={fx.flangerOn}
          disabled={disabled}
          onToggle={() => onFx("flangerOn", !fx.flangerOn)}
          mix={fx.flangerMix}
          onMixChange={(v) => onFx("flangerMix", v)}
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
                onClick={() => {
                  triggerScratch(key);
                  onAction?.({ k: "scratch", pattern: key });
                }}
                disabled={!song || !buffer || scratching || disabled}
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
