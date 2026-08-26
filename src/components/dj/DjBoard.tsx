"use client";

import { useMemo, useRef, useState } from "react";
import { crossfadeGains } from "./audioEngine";
import { DjDeck } from "./DjDeck";
import { SongBrowser } from "./SongBrowser";
import type { DjSong } from "./types";

export function DjBoard({ songs }: { songs: DjSong[] }) {
  const songsById = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  const [deckASong, setDeckASong] = useState<DjSong | null>(null);
  const [deckBSong, setDeckBSong] = useState<DjSong | null>(null);
  const [tempoA, setTempoA] = useState(1);
  const [tempoB, setTempoB] = useState(1);
  const [crossfader, setCrossfader] = useState(0.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  function ensureAudioContext(): AudioContext {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
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

  const { gainA, gainB } = crossfadeGains(crossfader);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <DjDeck
          label="A"
          song={deckASong}
          audioCtx={audioCtx}
          gain={gainA}
          tempo={tempoA}
          onTempoChange={setTempoA}
          otherTempo={tempoB}
          otherSong={deckBSong}
          onDropSong={(id) => loadSong("A", id)}
        />
        <DjDeck
          label="B"
          song={deckBSong}
          audioCtx={audioCtx}
          gain={gainB}
          tempo={tempoB}
          onTempoChange={setTempoB}
          otherTempo={tempoA}
          otherSong={deckASong}
          onDropSong={(id) => loadSong("B", id)}
        />
      </div>

      <div className="flex flex-col items-center gap-1 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <span className="text-xs font-medium text-black/50 dark:text-white/50">
          Crossfader
        </span>
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
      </div>

      <SongBrowser songs={songs} onLoad={loadSong} />
    </div>
  );
}
