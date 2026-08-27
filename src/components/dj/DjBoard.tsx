"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { crossfadeGains } from "./audioEngine";
import { DjDeck, type DjDeckHandle } from "./DjDeck";
import { LiveInput } from "./LiveInput";
import { SongBrowser } from "./SongBrowser";
import type { DjSong } from "./types";
import type { SaveSongBpmResult } from "@/app/(main)/admin/dj/actions";

const AUTO_DJ_TRANSITION_MS = 5000;
const STORAGE_KEY = "dj-board-state-v1";

// Only the loaded tracks are restored across a refresh. The crossfader stays
// at its neutral default so a deck never comes back silently parked.
type PersistedState = {
  deckASongId: string | null;
  deckBSongId: string | null;
};

export function DjBoard({
  songs,
  onSaveBpm,
}: {
  songs: DjSong[];
  onSaveBpm?: (songId: string, bpm: number) => Promise<SaveSongBpmResult>;
}) {
  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const [deckASong, setDeckASong] = useState<DjSong | null>(null);
  const [deckBSong, setDeckBSong] = useState<DjSong | null>(null);
  const [tempoA, setTempoA] = useState(1);
  const [tempoB, setTempoB] = useState(1);
  const [bpmA, setBpmA] = useState<number | null>(null);
  const [bpmB, setBpmB] = useState<number | null>(null);
  const [crossfader, setCrossfader] = useState(0.5);
  const [autoDj, setAutoDj] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const deckARef = useRef<DjDeckHandle>(null);
  const deckBRef = useRef<DjDeckHandle>(null);
  const transitionRef = useRef<number | null>(null);
  const kickstartedRef = useRef(false);
  const hydratedRef = useRef(false);
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

  function loadSong(deck: "A" | "B", songId: string) {
    const song = songsById.get(songId);
    if (!song) return;
    ensureAudioContext();
    if (deck === "A") setDeckASong(song);
    else setDeckBSong(song);
  }

  // Restore the loaded decks from the last visit so a refresh doesn't wipe the
  // session. Runs once, after mount, so server and first client render still
  // match. Tracks are only re-cued, never auto-played.
  /* eslint-disable react-hooks/set-state-in-effect --
     one-shot hydration from localStorage on mount, guarded by hydratedRef */
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<PersistedState>;
      // Re-cue by setting state only — no ensureAudioContext() here. The
      // AudioContext must be created from a real user gesture (the first Play),
      // or it starts suspended and the first play comes up silent.
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
  }, [songsById]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      const state: PersistedState = {
        deckASongId: deckASong?.id ?? null,
        deckBSongId: deckBSong?.id ?? null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked — persistence is best-effort.
    }
  }, [deckASong, deckBSong]);

  // Picks the next Auto DJ track from the shuffle bag: never replays a song
  // until the whole library has cycled. `excludeIds` (the decks currently in
  // play) are always skipped, so even the moment the bag wraps around can't
  // land on a track that's already spinning.
  function pickNextSong(excludeIds: (string | undefined)[]): DjSong | null {
    if (songs.length === 0) return null;
    const played = playedIdsRef.current;

    let pool = songs.filter((s) => !played.has(s.id) && !excludeIds.includes(s.id));
    if (pool.length === 0) {
      // Every song has played this cycle — reshuffle, still skipping the decks in play.
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
    const from = crossfader;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / AUTO_DJ_TRANSITION_MS);
      setCrossfader(from + (target - from) * t);
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
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect --
     intentionally reacting to a deck going song-less, not deriving render state */
  useEffect(() => {
    if (!autoDj) return;
    if (!deckASong) {
      const next = pickNextSong([deckBSong?.id]);
      if (next) loadSong("A", next.id);
    } else if (!deckBSong) {
      const next = pickNextSong([deckASong?.id]);
      if (next) loadSong("B", next.id);
    }
  }, [autoDj, deckASong, deckBSong]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  // First time both decks are stocked after turning Auto DJ on, kick things
  // off by playing Deck A — from then on, handoffs take over on their own.
  useEffect(() => {
    if (!autoDj) {
      kickstartedRef.current = false;
      // Start each Auto DJ run with a fresh shuffle bag.
      playedIdsRef.current.clear();
      return;
    }
    if (kickstartedRef.current || !deckASong || !deckBSong) return;
    kickstartedRef.current = true;
    deckARef.current?.play();
    setCrossfader(0);
  }, [autoDj, deckASong, deckBSong]);

  function handleDeckEnded(deck: "A" | "B") {
    if (!autoDj) return;
    const finishedRef = deck === "A" ? deckARef : deckBRef;
    const target = deck === "A" ? "B" : "A";
    const targetRef = target === "A" ? deckARef : deckBRef;
    const targetSong = target === "A" ? deckASong : deckBSong;
    if (!targetSong) return;

    targetRef.current?.play();
    animateCrossfadeTo(target === "A" ? 0 : 1, () => {
      finishedRef.current?.pause();
      const next = pickNextSong([targetSong.id]);
      if (next) loadSong(deck, next.id);
    });
  }

  const { gainA, gainB } = crossfadeGains(crossfader);
  // Whichever deck the crossfader currently favours drives Live Input's delay sync.
  const activeDeckBpm = crossfader <= 0.5 ? (bpmA ?? bpmB) : (bpmB ?? bpmA);

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
            onTempoChange={setTempoA}
            otherTempo={tempoB}
            otherBpm={bpmB}
            otherSong={deckBSong}
            onDropSong={(id) => loadSong("A", id)}
            onBpmChange={setBpmA}
            onEnded={() => handleDeckEnded("A")}
            onSaveBpm={onSaveBpm}
          />
          <DjDeck
            ref={deckBRef}
            label="B"
            song={deckBSong}
            audioCtx={audioCtx}
            ensureAudioContext={ensureAudioContext}
            gain={gainB}
            tempo={tempoB}
            onTempoChange={setTempoB}
            otherTempo={tempoA}
            otherBpm={bpmA}
            otherSong={deckASong}
            onDropSong={(id) => loadSong("B", id)}
            onBpmChange={setBpmB}
            onEnded={() => handleDeckEnded("B")}
            onSaveBpm={onSaveBpm}
          />
        </div>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex w-full max-w-md items-center justify-between">
            <span className="text-[10px] font-medium text-black/50 dark:text-white/50">
              Crossfader
            </span>
            <button
              type="button"
              onClick={() => setAutoDj((v) => !v)}
              title="Automatically crossfade into a new track whenever the current one ends"
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
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
              onChange={(e) => setCrossfader(Number(e.target.value))}
              onDoubleClick={() => setCrossfader(0.5)}
              className="flex-1 accent-foreground"
            />
            <span className="text-xs font-bold">B</span>
          </div>
          {autoDj && (
            <p className="text-[10px] text-black/40 dark:text-white/40">
              Auto DJ is on — tracks crossfade automatically, and none repeats until
              every song has played.
            </p>
          )}
        </div>

        <LiveInput
          audioCtx={audioCtx}
          ensureAudioContext={ensureAudioContext}
          activeDeckBpm={activeDeckBpm}
        />
      </div>

      <div className="flex min-h-0 flex-col gap-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72 lg:shrink-0">
        <SongBrowser songs={songs} onLoad={loadSong} />
      </div>
    </div>
  );
}
