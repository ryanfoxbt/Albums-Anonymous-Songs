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

const AUTO_DJ_TRANSITION_MS = 5000;
const STORAGE_KEY = "dj-board-state-v1";

function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

// Fold a tempo ratio by octaves into the window around 1× where two tracks
// count as the same pulse, so a 174-BPM track syncs to an 87-BPM one at 100%
// rather than being dragged to half speed. Bounds are the geometric midpoints
// (1/√2 … √2), then a hard clamp to the tempo slider's range.
function foldTempoRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  let r = ratio;
  while (r < Math.SQRT1_2) r *= 2;
  while (r >= Math.SQRT2) r /= 2;
  return Math.min(1.5, Math.max(0.5, r));
}

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
    mode?: DjBoardMode;
    /** Live-recording sink. Called for every user (or Auto DJ) control change. */
    onEvent?: (event: RawMixEvent) => void;
    /** Reports the crossfader-dominant deck's BPM (for the dancer's groove). */
    onGrooveChange?: (bpm: number | null) => void;
    /** When the Kall of Booty dancer is up it owns the keyboard, so the deck
     *  shortcuts stand down. */
    dancerActive?: boolean;
    /** Show the Listed/Unlisted filter in the song browser (admin booth). */
    allowUnlisted?: boolean;
  }
>(function DjBoard(
  {
    songs,
    mode = "live",
    onEvent,
    onGrooveChange,
    dancerActive,
    allowUnlisted = false,
  },
  ref,
) {
  const isPlayback = mode === "playback";
  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const [deckASong, setDeckASong] = useState<DjSong | null>(null);
  const [deckBSong, setDeckBSong] = useState<DjSong | null>(null);
  const [tempoA, setTempoA] = useState(1);
  const [tempoB, setTempoB] = useState(1);
  // BPM is a fixed value on the Song record, set by hand in the admin panel.
  const bpmA = deckASong?.bpm ?? null;
  const bpmB = deckBSong?.bpm ?? null;
  const [fxA, setFxA] = useState<DeckFx>(DEFAULT_DECK_FX);
  const [fxB, setFxB] = useState<DeckFx>(DEFAULT_DECK_FX);
  const [crossfader, setCrossfader] = useState(0.5);
  const [autoDj, setAutoDj] = useState(false);
  // Which deck the keyboard shortcuts act on (live mode).
  const [focusedDeck, setFocusedDeck] = useState<DeckId>("A");
  // The deck currently following the other one's tempo via Sync (null = none).
  const [syncedDeck, setSyncedDeck] = useState<DeckId | null>(null);

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
  const focusedDeckRef = useRef(focusedDeck);
  useEffect(() => {
    focusedDeckRef.current = focusedDeck;
  }, [focusedDeck]);
  const syncedDeckRef = useRef(syncedDeck);
  useEffect(() => {
    syncedDeckRef.current = syncedDeck;
  }, [syncedDeck]);
  const dancerActiveRef = useRef(dancerActive);
  useEffect(() => {
    dancerActiveRef.current = dancerActive;
  }, [dancerActive]);

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
    setSyncedDeck(null); // a fresh track breaks any tempo lock
    emit({ k: "load", deck, songId });
  }

  function changeCrossfader(v: number) {
    setCrossfader(v);
    emit({ k: "crossfader", v });
  }

  function changeTempo(deck: DeckId, v: number, fromSync = false) {
    if (deck === "A") setTempoA(v);
    else setTempoB(v);
    // A hand-moved tempo on the synced deck releases the lock (matches how a
    // real Sync drops out when you touch the pitch fader).
    if (!fromSync && syncedDeckRef.current === deck) setSyncedDeck(null);
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

  // Sync: match this deck's tempo to the other's (octave-aware), align the
  // downbeats, and latch — the deck then follows the other one's tempo until
  // Sync is pressed again or its pitch is moved by hand. Pressing Sync on the
  // deck that's already synced releases it.
  function syncDeck(deck: DeckId) {
    if (syncedDeckRef.current === deck) {
      setSyncedDeck(null);
      return;
    }

    const thisBpm = deck === "A" ? bpmA : bpmB;
    const otherBpm = deck === "A" ? bpmB : bpmA;
    const otherTempo = deck === "A" ? tempoB : tempoA;

    if (!thisBpm || !otherBpm) {
      // Without both BPMs there's nothing to lock to — copy the other deck's
      // pitch as a rough start and leave Sync off.
      if (thisBpm == null) changeTempo(deck, otherTempo);
      return;
    }

    const target = foldTempoRatio((otherBpm * otherTempo) / thisBpm);
    changeTempo(deck, target, true);
    setSyncedDeck(deck);

    // Phase-align the downbeats. Work in real (wall-clock) seconds so the
    // octave-folded tempo falls out naturally: `mod(otherPhase, thisBeat)`
    // maps a slower master beat onto whichever of the faster follower beats
    // it should sit on.
    const thisHandle = deckRefFor(deck).current;
    const otherHandle = deckRefFor(deck === "A" ? "B" : "A").current;
    const a = thisHandle?.getBeatAnchor();
    const b = otherHandle?.getBeatAnchor();
    if (!thisHandle || !a || !b) return;

    const tbThis = 60 / thisBpm / target; // follower's sounding beat (real sec)
    const tbOther = 60 / otherBpm / otherTempo; // master's sounding beat
    const pOther = mod((b.positionSec - b.gridOffsetSec) / otherTempo, tbOther);
    const pThis = mod((a.positionSec - a.gridOffsetSec) / target, tbThis);
    let dReal = mod(pOther, tbThis) - pThis;
    dReal = mod(dReal + tbThis / 2, tbThis) - tbThis / 2; // shortest nudge
    const newPos = Math.max(0, a.positionSec + dReal * target); // real → track sec

    thisHandle.seekSeconds(newPos);
    emit({ k: "seek", deck, pos: thisHandle.currentPos() });
  }

  // While a deck is synced, keep its tempo tracking the master's — so nudging
  // the master's pitch fader carries the follower along. Live board only;
  // replay just re-applies the recorded tempo events.
  useEffect(() => {
    if (isPlayback || !syncedDeck) return;
    const followerBpm = syncedDeck === "A" ? bpmA : bpmB;
    const otherBpm = syncedDeck === "A" ? bpmB : bpmA;
    if (!followerBpm || !otherBpm) return;
    const otherTempo = syncedDeck === "A" ? tempoB : tempoA;
    const followerTempo = syncedDeck === "A" ? tempoA : tempoB;
    const target = foldTempoRatio((otherBpm * otherTempo) / followerBpm);
    if (Math.abs(target - followerTempo) > 0.0015) {
      changeTempo(syncedDeck, target, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempoA, tempoB, bpmA, bpmB, syncedDeck, isPlayback]);

  // The single "2x Play" button: sends both decks back to their cue points
  // (start of track if none was set) and starts them together.
  function playBothFromCues() {
    (["A", "B"] as DeckId[]).forEach((deck) => {
      const song = deck === "A" ? deckASong : deckBSong;
      if (!song) return;
      deckRefFor(deck).current?.jumpToCue();
      emit({ k: "cue", deck });
      deckPlay(deck);
    });
  }

  function toggleDeckPlay(deck: DeckId) {
    if (deckRefFor(deck).current?.isPlaying()) deckPause(deck);
    else deckPlay(deck);
  }

  // Keyboard shortcuts (live board only). The handler lives in a ref that's
  // refreshed every render so it always sees current state, while the actual
  // window listener is attached just once.
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    onKeyRef.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (dancerActiveRef.current) return; // the dancer owns the keyboard
      const el = e.target;
      if (
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      ) {
        return;
      }

      const f = focusedDeckRef.current;
      const other: DeckId = f === "A" ? "B" : "A";
      const clampX = (v: number) => Math.min(1, Math.max(0, v));

      switch (e.key) {
        case "1":
          setFocusedDeck("A");
          break;
        case "2":
          setFocusedDeck("B");
          break;
        case "a":
          toggleDeckPlay(f);
          break;
        case "A":
          toggleDeckPlay(other);
          break;
        case "c":
          deckRefFor(f).current?.jumpToCue();
          emit({ k: "cue", deck: f });
          break;
        case "x":
          deckRefFor(f).current?.setCueHereUser();
          break;
        case "s":
          syncDeck(f);
          break;
        case "d":
          deckRefFor(f).current?.toggleLoop();
          break;
        // Shift+[ arrives as "{" (and Shift+] as "}"), so the shifted keys
        // double as the ±4-beat jumps.
        case "[":
        case "{":
          deckRefFor(f).current?.beatJump(e.shiftKey ? -4 : -1);
          break;
        case "]":
        case "}":
          deckRefFor(f).current?.beatJump(e.shiftKey ? 4 : 1);
          break;
        case ",":
          changeCrossfader(clampX(crossfaderRef.current - 0.05));
          break;
        case ".":
          changeCrossfader(clampX(crossfaderRef.current + 0.05));
          break;
        case "ArrowLeft":
          changeCrossfader(clampX(crossfaderRef.current - 0.1));
          break;
        case "ArrowRight":
          changeCrossfader(clampX(crossfaderRef.current + 0.1));
          break;
        case "m":
          changeCrossfader(0.5);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
  });
  useEffect(() => {
    if (isPlayback) return;
    const listener = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [isPlayback]);

  // DjDeck already performed the audio side of a momentary action; the board
  // only needs to log it (with the deck attached).
  function handleDeckAction(deck: DeckId, action: DeckAction) {
    switch (action.k) {
      case "play":
      case "pause":
      case "cue":
      case "cueClear":
      case "loopExit":
        emit({ k: action.k, deck });
        break;
      case "cueSet":
        emit({ k: "cueSet", deck, pos: action.pos });
        break;
      case "seek":
        emit({ k: "seek", deck, pos: action.pos });
        break;
      case "loopSet":
        emit({ k: "loopSet", deck, start: action.start, end: action.end });
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
            deckRefFor(event.deck).current?.setCueHere(event.pos);
            break;
          case "cueClear":
            deckRefFor(event.deck).current?.clearCue();
            break;
          case "loopSet":
            deckRefFor(event.deck).current?.setLoop(event.start, event.end);
            break;
          case "loopExit":
            deckRefFor(event.deck).current?.exitLoop();
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
            otherBpm={bpmB}
            otherSong={deckBSong}
            onSyncRequest={() => syncDeck("A")}
            onDropSong={(id) => loadSong("A", id)}
            onEnded={() => handleDeckEnded("A")}
            fx={fxA}
            onFx={(key, value) => changeFx("A", key, value)}
            onAction={(a) => handleDeckAction("A", a)}
            disabled={isPlayback}
            focused={!isPlayback && focusedDeck === "A"}
            onFocusRequest={() => setFocusedDeck("A")}
            syncActive={!isPlayback && syncedDeck === "A"}
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
            otherBpm={bpmA}
            otherSong={deckASong}
            onSyncRequest={() => syncDeck("B")}
            onDropSong={(id) => loadSong("B", id)}
            onEnded={() => handleDeckEnded("B")}
            fx={fxB}
            onFx={(key, value) => changeFx("B", key, value)}
            onAction={(a) => handleDeckAction("B", a)}
            disabled={isPlayback}
            focused={!isPlayback && focusedDeck === "B"}
            onFocusRequest={() => setFocusedDeck("B")}
            syncActive={!isPlayback && syncedDeck === "B"}
          />
        </div>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex w-full max-w-md items-center justify-between">
            <span className="text-[10px] font-medium text-black/50 dark:text-white/50">
              Crossfader
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playBothFromCues}
                disabled={isPlayback || !deckASong || !deckBSong}
                title="Start both decks together from their cue points"
                className="rounded-full border border-black/15 px-2.5 py-1 text-[10px] font-semibold hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10"
              >
                ▶▶ 2× Play
              </button>
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

        {!isPlayback && (
          <details className="rounded-2xl border border-black/10 px-3 py-2 text-[11px] text-black/60 [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-black/20 [&_kbd]:bg-black/5 [&_kbd]:px-1 [&_kbd]:font-mono [&_kbd]:text-[10px] dark:border-white/10 dark:text-white/60 dark:[&_kbd]:border-white/20 dark:[&_kbd]:bg-white/10">
            <summary className="cursor-pointer select-none font-medium">
              ⌨ Keyboard shortcuts
            </summary>
            <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <span>
                <kbd>1</kbd> / <kbd>2</kbd> — focus Deck A / B (click a deck too)
              </span>
              <span>
                <kbd>a</kbd> play / pause · <kbd>shift</kbd>+<kbd>a</kbd> the other
                deck
              </span>
              <span>
                <kbd>c</kbd> cue · <kbd>x</kbd> set cue · <kbd>s</kbd> sync
              </span>
              <span>
                <kbd>d</kbd> loop · <kbd>[</kbd> / <kbd>]</kbd> beat jump (
                <kbd>shift</kbd> = 4)
              </span>
              <span>
                <kbd>,</kbd> / <kbd>.</kbd> crossfader · <kbd>m</kbd> centre
              </span>
              <span>
                <kbd>←</kbd> / <kbd>→</kbd> crossfader (bigger step)
              </span>
            </div>
            <p className="mt-2 text-black/40 dark:text-white/40">
              Shortcuts pause while the 🍑 dancer is up — it takes the keyboard.
            </p>
          </details>
        )}
      </div>

      {!isPlayback && (
        <div className="flex min-h-0 flex-col gap-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-72 lg:shrink-0">
          <SongBrowser
            songs={songs}
            onLoad={loadSong}
            allowUnlisted={allowUnlisted}
          />
        </div>
      )}
    </div>
  );
});
