"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { crossfadeGains } from "./audioEngine";
import { DjDeck, type DeckAction, type DjDeckHandle } from "./DjDeck";
import { SongBrowser } from "./SongBrowser";
import { DEFAULT_DECK_FX, type DeckFx, type DjSong } from "./types";
import type { DeckId, RawMixEvent } from "./mixTypes";
import type { SaveSongBpmResult } from "@/app/(main)/admin/dj/actions";

const AUTO_DJ_TRANSITION_MS = 5000;
const STORAGE_KEY = "dj-board-state-v1";

// Only the loaded tracks are restored across a refresh. The crossfader stays
// at its neutral default so a deck never comes back silently parked.
type PersistedState = {
  deckASongId: string | null;
  deckBSongId: string | null;
};

export type DjBoardMode = "live" | "playback";

export type DjBoardHandle = {
  /** Replay entry point — performs one recorded event without re-emitting it. */
  applyEvent: (event: RawMixEvent) => void;
  ensureAudioContext: () => AudioContext;
  getAudioContext: () => AudioContext | null;
  /** Full current state as t=0 events, so a recording captures whatever was
   *  already set up before Record was pressed. */
  snapshot: () => RawMixEvent[];
  /** iOS unlock: call inside a user gesture so both decks' <audio> elements
   *  can be started programmatically by the replay scheduler afterwards. */
  primeDecks: () => void;
};

export const DjBoard = forwardRef<
  DjBoardHandle,
  {
    songs: DjSong[];
    onSaveBpm?: (songId: string, bpm: number) => Promise<SaveSongBpmResult>;
    mode?: DjBoardMode;
    /** Live-recording sink. Called for every user (or Auto DJ) control change. */
    onEvent?: (event: RawMixEvent) => void;
    /** Reports the crossfader-dominant deck's BPM (for the dancer's groove). */
    onGrooveChange?: (bpm: number | null) => void;
  }
>(function DjBoard(
  { songs, onSaveBpm, mode = "live", onEvent, onGrooveChange },
  ref,
) {
  const isPlayback = mode === "playback";
  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const [deckASong, setDeckASong] = useState<DjSong | null>(null);
  const [deckBSong, setDeckBSong] = useState<DjSong | null>(null);
  const [tempoA, setTempoA] = useState(1);
  const [tempoB, setTempoB] = useState(1);
  const [bpmA, setBpmA] = useState<number | null>(null);
  const [bpmB, setBpmB] = useState<number | null>(null);
  const [fxA, setFxA] = useState<DeckFx>(DEFAULT_DECK_FX);
  const [fxB, setFxB] = useState<DeckFx>(DEFAULT_DECK_FX);
  const [crossfader, setCrossfader] = useState(0.5);
  const [autoDj, setAutoDj] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const deckARef = useRef<DjDeckHandle>(null);
  const deckBRef = useRef<DjDeckHandle>(null);
  const transitionRef = useRef<number | null>(null);
  const kickstartedRef = useRef(false);
  const hydratedRef = useRef(false);
  // While true (replay), control helpers apply state but never emit.
  const applyingRef = useRef(false);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  const crossfaderRef = useRef(crossfader);
  useEffect(() => {
    crossfaderRef.current = crossfader;
  }, [crossfader]);

  // Report the "dominant" BPM — whichever deck the crossfader favours, falling
  // back to the other. Drives the dancer's tempo-locked groove.
  const onGrooveRef = useRef(onGrooveChange);
  useEffect(() => {
    onGrooveRef.current = onGrooveChange;
  }, [onGrooveChange]);
  useEffect(() => {
    const dominant = crossfader <= 0.5 ? (bpmA ?? bpmB) : (bpmB ?? bpmA);
    onGrooveRef.current?.(dominant);
  }, [bpmA, bpmB, crossfader]);
  // Auto DJ shuffle bag: ids already played in the current cycle. A track
  // won't be picked again until every song has had a turn.
  const playedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (transitionRef.current) cancelAnimationFrame(transitionRef.current);
    };
  }, []);

  function ensureAudioContext(): AudioContext {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      audioCtxRef.current = ctx;
      setAudioCtx(ctx);
    }
    return audioCtxRef.current;
  }

  function emit(event: RawMixEvent) {
    if (!applyingRef.current) onEventRef.current?.(event);
  }

  function deckRefFor(deck: DeckId) {
    return deck === "A" ? deckARef : deckBRef;
  }

  // --- Control surface: the single set of functions both the UI and replay
  //     drive. Each applies local state and (unless replaying) emits an event.

  function loadSong(deck: DeckId, songId: string) {
    const song = songsById.get(songId);
    if (!song) return;
    if (!isPlayback) ensureAudioContext();
    if (deck === "A") {
      setDeckASong(song);
      setFxA(DEFAULT_DECK_FX);
      setTempoA(1);
    } else {
      setDeckBSong(song);
      setFxB(DEFAULT_DECK_FX);
      setTempoB(1);
    }
    emit({ k: "load", deck, songId });
  }

  function changeCrossfader(v: number) {
    setCrossfader(v);
    emit({ k: "crossfader", v });
  }

  function changeTempo(deck: DeckId, v: number) {
    if (deck === "A") setTempoA(v);
    else setTempoB(v);
    emit({ k: "tempo", deck, v });
  }

  function changeFx(deck: DeckId, key: keyof DeckFx, value: number | boolean) {
    const setter = deck === "A" ? setFxA : setFxB;
    setter((prev) => ({ ...prev, [key]: value }));
    emit({
      k: "fx",
      deck,
      key,
      v: typeof value === "boolean" ? (value ? 1 : 0) : value,
    });
  }

  function toggleAutoDj(next: boolean) {
    setAutoDj(next);
    emit({ k: "autoDj", v: next ? 1 : 0 });
  }

  function deckPlay(deck: DeckId) {
    deckRefFor(deck).current?.play();
    emit({ k: "play", deck });
  }

  function deckPause(deck: DeckId) {
    deckRefFor(deck).current?.pause();
    emit({ k: "pause", deck });
  }

  // DjDeck already performed the audio side of a momentary action; the board
  // only needs to log it (with the deck attached).
  function handleDeckAction(deck: DeckId, action: DeckAction) {
    switch (action.k) {
      case "play":
      case "pause":
      case "cue":
      case "cueSet":
        emit({ k: action.k, deck });
        break;
      case "seek":
        emit({ k: "seek", deck, pos: action.pos });
        break;
      case "scratch":
        emit({ k: "scratch", deck, pattern: action.pattern });
        break;
    }
  }

  function snapshot(): RawMixEvent[] {
    const out: RawMixEvent[] = [];
    const decks: [DeckId, DjSong | null, DeckFx, number][] = [
      ["A", deckASong, fxA, tempoA],
      ["B", deckBSong, fxB, tempoB],
    ];
    for (const [deck, song, fx, tempoValue] of decks) {
      if (!song) continue;
      out.push({ k: "load", deck, songId: song.id });
      for (const key of Object.keys(fx) as (keyof DeckFx)[]) {
        if (fx[key] === DEFAULT_DECK_FX[key]) continue;
        const value = fx[key];
        out.push({
          k: "fx",
          deck,
          key,
          v: typeof value === "boolean" ? (value ? 1 : 0) : value,
        });
      }
      if (tempoValue !== 1) out.push({ k: "tempo", deck, v: tempoValue });
      const handle = deckRefFor(deck).current;
      const pos = handle?.currentPos() ?? 0;
      if (pos > 0) out.push({ k: "seek", deck, pos });
      if (handle?.isPlaying()) out.push({ k: "play", deck });
    }
    if (crossfader !== 0.5) out.push({ k: "crossfader", v: crossfader });
    if (autoDj) out.push({ k: "autoDj", v: 1 });
    return out;
  }

  useImperativeHandle(ref, () => ({
    ensureAudioContext,
    getAudioContext: () => audioCtxRef.current,
    snapshot,
    primeDecks: () => {
      deckARef.current?.primeAudio();
      deckBRef.current?.primeAudio();
    },
    applyEvent: (event: RawMixEvent) => {
      applyingRef.current = true;
      try {
        switch (event.k) {
          case "load":
            loadSong(event.deck, event.songId);
            break;
          case "play":
            deckRefFor(event.deck).current?.play();
            break;
          case "pause":
            deckRefFor(event.deck).current?.pause();
            break;
          case "seek":
            deckRefFor(event.deck).current?.seek(event.pos);
            break;
          case "cue":
            deckRefFor(event.deck).current?.jumpToCue();
            break;
          case "cueSet":
            deckRefFor(event.deck).current?.setCueHere();
            break;
          case "scratch":
            deckRefFor(event.deck).current?.triggerScratch(event.pattern);
            break;
          case "tempo":
            changeTempo(event.deck, event.v);
            break;
          case "fx":
            changeFx(
              event.deck,
              event.key,
              event.key.endsWith("On") ? event.v === 1 : event.v,
            );
            break;
          case "crossfader":
            setCrossfader(event.v);
            break;
          case "autoDj":
            // Auto DJ isn't re-run on replay — its concrete load/play/
            // crossfader events are already in the stream. Ignored on purpose.
            break;
        }
      } finally {
        applyingRef.current = false;
      }
    },
  }));

  // Restore the loaded decks from the last visit so a refresh doesn't wipe the
  // session. Live board only. Runs once, after mount, so server and first
  // client render still match. Tracks are only re-cued, never auto-played.
  useEffect(() => {
    if (isPlayback || hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<PersistedState>;
      const restoredA = saved.deckASongId
        ? songsById.get(saved.deckASongId)
        : undefined;
      const restoredB = saved.deckBSongId
        ? songsById.get(saved.deckBSongId)
        : undefined;
      if (restoredA) setDeckASong(restoredA);
      if (restoredB) setDeckBSong(restoredB);
    } catch {
      // Corrupt or unavailable storage — start fresh.
    }
  }, [songsById, isPlayback]);

  useEffect(() => {
    if (isPlayback || !hydratedRef.current) return;
    try {
      const state: PersistedState = {
        deckASongId: deckASong?.id ?? null,
        deckBSongId: deckBSong?.id ?? null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked — persistence is best-effort.
    }
  }, [deckASong, deckBSong, isPlayback]);

  // Picks the next Auto DJ track from the shuffle bag: never replays a song
  // until the whole library has cycled. `excludeIds` (the decks currently in
  // play) are always skipped, so even the moment the bag wraps around can't
  // land on a track that's already spinning.
  function pickNextSong(excludeIds: (string | undefined)[]): DjSong | null {
    if (songs.length === 0) return null;
    const played = playedIdsRef.current;

    let pool = songs.filter((s) => !played.has(s.id) && !excludeIds.includes(s.id));
    if (pool.length === 0) {
      played.clear();
      pool = songs.filter((s) => !excludeIds.includes(s.id));
    }
    if (pool.length === 0) pool = songs;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    played.add(pick.id);
    return pick;
  }

  function animateCrossfadeTo(target: 0 | 1, onComplete?: () => void) {
    if (transitionRef.current) cancelAnimationFrame(transitionRef.current);
    const start = performance.now();
    const from = crossfaderRef.current;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / AUTO_DJ_TRANSITION_MS);
      changeCrossfader(from + (target - from) * t);
      if (t < 1) {
        transitionRef.current = requestAnimationFrame(step);
      } else {
        transitionRef.current = null;
        onComplete?.();
      }
    };
    transitionRef.current = requestAnimationFrame(step);
  }

  // While Auto DJ is on, keep both decks stocked with a track so a handoff
  // never has to cold-load — the standby deck is always cued and ready.
  /* eslint-disable react-hooks/exhaustive-deps --
     intentionally reacting to a deck going song-less, not deriving render state */
  useEffect(() => {
    if (isPlayback || !autoDj) return;
    if (!deckASong) {
      const next = pickNextSong([deckBSong?.id]);
      if (next) loadSong("A", next.id);
    } else if (!deckBSong) {
      const next = pickNextSong([deckASong?.id]);
      if (next) loadSong("B", next.id);
    }
  }, [autoDj, deckASong, deckBSong, isPlayback]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // First time both decks are stocked after turning Auto DJ on, kick things
  // off by playing Deck A — from then on, handoffs take over on their own.
  useEffect(() => {
    if (isPlayback) return;
    if (!autoDj) {
      kickstartedRef.current = false;
      playedIdsRef.current.clear();
      return;
    }
    if (kickstartedRef.current || !deckASong || !deckBSong) return;
    kickstartedRef.current = true;
    deckPlay("A");
    changeCrossfader(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDj, deckASong, deckBSong, isPlayback]);

  function handleDeckEnded(deck: DeckId) {
    if (isPlayback || !autoDj) return;
    const target: DeckId = deck === "A" ? "B" : "A";
    const targetSong = target === "A" ? deckASong : deckBSong;
    if (!targetSong) return;

    deckPlay(target);
    animateCrossfadeTo(target === "A" ? 0 : 1, () => {
      deckPause(deck);
      const next = pickNextSong([targetSong.id]);
      if (next) loadSong(deck, next.id);
    });
  }

  const { gainA, gainB } = crossfadeGains(crossfader);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <DjDeck
            ref={deckARef}
            label="A"
            song={deckASong}
            audioCtx={audioCtx}
            ensureAudioContext={ensureAudioContext}
            gain={gainA}
            tempo={tempoA}
            onTempoChange={(v) => changeTempo("A", v)}
            otherTempo={tempoB}
            otherBpm={bpmB}
            otherSong={deckBSong}
            onDropSong={(id) => loadSong("A", id)}
            onBpmChange={setBpmA}
            onEnded={() => handleDeckEnded("A")}
            onSaveBpm={onSaveBpm}
            fx={fxA}
            onFx={(key, value) => changeFx("A", key, value)}
            onAction={(a) => handleDeckAction("A", a)}
            disabled={isPlayback}
          />
          <DjDeck
            ref={deckBRef}
            label="B"
            song={deckBSong}
            audioCtx={audioCtx}
            ensureAudioContext={ensureAudioContext}
            gain={gainB}
            tempo={tempoB}
            onTempoChange={(v) => changeTempo("B", v)}
            otherTempo={tempoA}
            otherBpm={bpmA}
            otherSong={deckASong}
            onDropSong={(id) => loadSong("B", id)}
            onBpmChange={setBpmB}
            onEnded={() => handleDeckEnded("B")}
            onSaveBpm={onSaveBpm}
            fx={fxB}
            onFx={(key, value) => changeFx("B", key, value)}
            onAction={(a) => handleDeckAction("B", a)}
            disabled={isPlayback}
          />
        </div>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex w-full max-w-md items-center justify-between">
            <span className="text-[10px] font-medium text-black/50 dark:text-white/50">
              Crossfader
            </span>
            <button
              type="button"
              onClick={() => toggleAutoDj(!autoDj)}
              disabled={isPlayback}
              title="Automatically crossfade into a new track whenever the current one ends"
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold disabled:opacity-40 ${
                autoDj
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              Auto DJ {autoDj ? "On" : "Off"}
            </button>
          </div>
          <div className="flex w-full max-w-md items-center gap-3">
            <span className="text-xs font-bold">A</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={crossfader}
              disabled={isPlayback}
              onChange={(e) => changeCrossfader(Number(e.target.value))}
              onDoubleClick={() => !isPlayback && changeCrossfader(0.5)}
              className="flex-1 accent-foreground disabled:opacity-60"
            />
            <span className="text-xs font-bold">B</span>
          </div>
          {autoDj && !isPlayback && (
            <p className="text-[10px] text-black/40 dark:text-white/40">
              Auto DJ is on — tracks crossfade automatically, and none repeats until
              every song has played.
            </p>
          )}
        </div>
      </div>

      {!isPlayback && (
        <div className="flex min-h-0 flex-col gap-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72 lg:shrink-0">
          <SongBrowser songs={songs} onLoad={loadSong} />
        </div>
      )}
    </div>
  );
});
