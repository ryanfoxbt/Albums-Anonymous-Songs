"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackMixPlay } from "@/lib/analyticsClient";
import { DjBoard, type DjBoardHandle } from "./DjBoard";
import { StickDancer, type StickDancerHandle } from "./StickDancer";
import type { MixEvent } from "./mixTypes";
import type { DjSong } from "./types";

type Phase = "idle" | "playing" | "ended";

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MixPlayer({
  slug,
  songs,
  program,
}: {
  slug: string;
  songs: DjSong[];
  program: { durationMs: number; events: MixEvent[] };
}) {
  const boardRef = useRef<DjBoardHandle>(null);
  const dancerRef = useRef<StickDancerHandle>(null);
  const hasDancer = useMemo(
    () => program.events.some((e) => e.k === "dancer"),
    [program],
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [runId, setRunId] = useState(0);
  const [grooveBpm, setGrooveBpm] = useState<number | null>(null);

  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const t0Ref = useRef(0);
  const cursorRef = useRef(0);
  const playTrackedRef = useRef(false);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const start = useCallback(async () => {
    const board = boardRef.current;
    if (!board) return;
    if (!playTrackedRef.current) {
      playTrackedRef.current = true;
      trackMixPlay(slug);
    }
    const ctx = board.ensureAudioContext();
    // iOS: while the tap's user activation is still fresh, unlock BOTH deck
    // <audio> elements and resume the context. Without the prime, deck B's
    // play() — issued seconds later by the scheduler — is silently blocked
    // (its scratch still works because that's a buffer source, not a media
    // element). The graph is already built (warm-up creates the context on
    // mount), so this play() happens after createMediaElementSource.
    board.primeDecks();
    try {
      if (ctx.state !== "running") await ctx.resume();
    } catch {
      // no user activation — play() below will still try
    }
    // Let the decks settle before the scheduler drives them.
    await new Promise((r) => requestAnimationFrame(r));

    cursorRef.current = 0;
    t0Ref.current = performance.now();
    setElapsed(0);
    setPhase("playing");
    runningRef.current = true;

    const frame = () => {
      if (!runningRef.current) return;
      const b = boardRef.current;
      const now = performance.now() - t0Ref.current;
      const { events, durationMs } = program;

      while (
        cursorRef.current < events.length &&
        events[cursorRef.current].t <= now
      ) {
        const ev = events[cursorRef.current];
        if (ev.k === "dancer") dancerRef.current?.applyEvent(ev);
        else b?.applyEvent(ev);
        cursorRef.current += 1;
      }
      setElapsed(now);

      if (cursorRef.current >= events.length && now >= durationMs) {
        runningRef.current = false;
        b?.applyEvent({ k: "pause", deck: "A" });
        b?.applyEvent({ k: "pause", deck: "B" });
        setElapsed(durationMs);
        setPhase("ended");
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
  }, [program, slug]);

  const restart = useCallback(() => {
    stopLoop();
    cursorRef.current = 0;
    setElapsed(0);
    setPhase("idle");
    setRunId((n) => n + 1); // remount DjBoard for a clean slate
  }, [stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  // Warm up: build the audio graph now (it stays suspended until the Play
  // gesture) so each deck's <audio> is routed through a MediaElementSource
  // *before* the prime/play calls, and cue each deck's opening track so it's
  // already buffering. Re-runs after a restart remount.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    try {
      board.ensureAudioContext();
    } catch {
      // a browser refusing a pre-gesture AudioContext — start() will retry
    }
    const seenDecks = new Set<string>();
    for (const e of program.events) {
      if (e.k === "load" && !seenDecks.has(e.deck)) {
        seenDecks.add(e.deck);
        board.applyEvent(e);
        if (seenDecks.size === 2) break;
      }
    }
  }, [program, runId]);

  const pct =
    program.durationMs > 0
      ? Math.min(100, (elapsed / program.durationMs) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-background p-3 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {phase === "playing" ? (
            <span className="text-sm font-medium">
              <span className="text-[#F760D6]">●</span> Playing the mix…
            </span>
          ) : (
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background hover:opacity-90"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M4 2.5v11l10-5.5-10-5.5z" />
              </svg>
              {phase === "ended" ? "Replay" : "Play the mix"}
            </button>
          )}
          {phase === "ended" && (
            <button
              type="button"
              onClick={restart}
              className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Restart
            </button>
          )}
          <span className="text-sm tabular-nums text-black/50 dark:text-white/50">
            {fmt(elapsed)} / {fmt(program.durationMs)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full bg-[#F760D6] transition-[width] duration-100"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <DjBoard
        key={runId}
        ref={boardRef}
        songs={songs}
        mode="playback"
        onGrooveChange={setGrooveBpm}
      />

      {hasDancer && (
        <StickDancer
          key={`dancer-${runId}`}
          ref={dancerRef}
          mode="replay"
          bpm={grooveBpm}
        />
      )}
    </div>
  );
}
