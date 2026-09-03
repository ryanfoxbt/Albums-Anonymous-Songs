"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/features";
import { DjBoard, type DjBoardHandle } from "./DjBoard";
import { MixRecorder } from "./MixRecorder";
import { MIX_MAX_MS, type RawMixEvent } from "./mixTypes";
import { DANCER_HINT, StickDancer, type StickDancerHandle } from "./StickDancer";
import type { DjSong } from "./types";

type Status = "idle" | "recording" | "saving" | "done" | "error";

type PendingMix = {
  songIds: string[];
  durationMs: number;
  events: RawMixEvent[];
};

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DjStudio({ songs }: { songs: DjSong[] }) {
  const boardRef = useRef<DjBoardHandle>(null);
  const dancerRef = useRef<StickDancerHandle>(null);
  const [recorder] = useState(() => new MixRecorder());

  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dancerOn, setDancerOn] = useState(false);
  const [grooveBpm, setGrooveBpm] = useState<number | null>(null);
  const pendingRef = useRef<PendingMix | null>(null);

  // Deep-link: /dj?load=<songId> cues that track onto Deck A.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("load");
    if (id) {
      // Ref is populated after the child mounts (this effect runs after).
      boardRef.current?.applyEvent({ k: "load", deck: "A", songId: id });
    }
  }, []);

  const handleEvent = useCallback(
    (event: RawMixEvent) => {
      recorder.record(event);
    },
    [recorder],
  );

  const submit = useCallback(async (mix: PendingMix) => {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/mixes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mix),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[dj] mix save failed", res.status, data);
        setError(
          data.error ??
            `Couldn't save your mix (${res.status}). Your recording is kept — try again.`,
        );
        setStatus("error");
        return;
      }
      setShareUrl(`${window.location.origin}/mix/${data.slug}`);
      try {
        window.localStorage.setItem(
          "aa_last_mix",
          JSON.stringify({ slug: data.slug, editToken: data.editToken }),
        );
      } catch {
        // non-essential
      }
      setStatus("done");
    } catch (err) {
      console.error("[dj] mix save threw", err);
      setError("Couldn't reach the server. Your recording is kept — try again.");
      setStatus("error");
    }
  }, []);

  const finishRecording = useCallback(() => {
    if (!recorder.isRecording) return;
    const mix = recorder.stop();
    if (mix.events.length < 2) {
      setStatus("idle");
      setError("That was too short — play something, then record.");
      return;
    }
    pendingRef.current = mix;
    void submit(mix);
  }, [recorder, submit]);

  // Timer + auto-stop while recording.
  useEffect(() => {
    if (status !== "recording") return;
    const id = window.setInterval(() => {
      setElapsed(recorder.elapsedMs);
      setEventCount(recorder.eventCount);
      if (recorder.elapsedMs >= MIX_MAX_MS) finishRecording();
    }, 250);
    return () => window.clearInterval(id);
  }, [status, recorder, finishRecording]);

  const startRecording = () => {
    setError(null);
    setShareUrl(null);
    setCopied(false);
    setElapsed(0);
    setEventCount(0);
    recorder.start();
    // Capture whatever was already loaded/tweaked before Record was pressed.
    for (const event of boardRef.current?.snapshot() ?? []) {
      recorder.record(event);
    }
    const dancerSnap = dancerRef.current?.snapshot();
    if (dancerSnap) recorder.record(dancerSnap);
    setStatus("recording");
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the input is selectable as a fallback
    }
  };

  const nativeShare = async () => {
    if (!shareUrl || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "My Albums Anonymous mix",
        text: "I DJ'd this — hear it and watch the knobs move:",
        url: shareUrl,
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-background p-3 dark:border-white/10">
        {status === "recording" ? (
          <>
            <button
              type="button"
              onClick={finishRecording}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              <span className="h-2.5 w-2.5 rounded-sm bg-white" />
              Stop &amp; share
            </button>
            <span className="text-sm font-medium tabular-nums">
              <span className="text-red-600">●</span> {fmt(elapsed)}{" "}
              <span className="text-black/40 dark:text-white/40">
                / {fmt(MIX_MAX_MS)}
              </span>
            </span>
            <span className="text-xs text-black/40 dark:text-white/40">
              {eventCount} moves captured
            </span>
          </>
        ) : status === "saving" ? (
          <span className="text-sm font-medium">Saving your mix…</span>
        ) : status === "error" ? (
          <>
            <button
              type="button"
              onClick={() => {
                const mix = pendingRef.current;
                if (mix) void submit(mix);
                else setStatus("idle");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background hover:opacity-90"
            >
              Retry share
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setError(null);
              }}
              className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              Discard
            </button>
          </>
        ) : status === "done" && shareUrl ? (
          <div className="flex w-full flex-col gap-2">
            <p className="text-sm font-semibold">
              Your mix is live — send it to the group chat 🎧
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-full border border-black/15 bg-background px-3 py-1.5 text-xs dark:border-white/20"
              />
              <button
                type="button"
                onClick={copyShare}
                className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
              {typeof navigator !== "undefined" &&
                typeof navigator.share === "function" && (
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="rounded-full bg-[#F760D6] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Share
                  </button>
                )}
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium underline"
              >
                Open
              </a>
            </div>
            <button
              type="button"
              onClick={startRecording}
              className="self-start text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              Record another
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background hover:opacity-90"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              Record my set
            </button>
            <span className="text-xs text-black/50 dark:text-white/50">
              Up to {fmt(MIX_MAX_MS)}. Free to share — no email, no login.
            </span>
          </>
        )}
        {error && (
          <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="button"
          onClick={() => setDancerOn((v) => !v)}
          aria-pressed={dancerOn}
          title={
            dancerOn
              ? `${DANCER_HINT}  ·  click to hide`
              : "Kall of Booty dancer — click, then use the keyboard (or hit AUTO)"
          }
          className={`ml-auto rounded-full px-2 py-1 text-xs transition-opacity ${
            dancerOn
              ? "text-black/50 opacity-90 dark:text-white/50"
              : "text-black/30 opacity-50 hover:opacity-100 dark:text-white/30"
          }`}
        >
          🍑{dancerOn ? " ·" : ""}
        </button>
      </div>

      <DjBoard
        ref={boardRef}
        songs={songs}
        mode="live"
        onEvent={handleEvent}
        onGrooveChange={setGrooveBpm}
        dancerActive={dancerOn}
        allowUnlisted={FEATURES.djUnlistedFilter}
      />

      {dancerOn && (
        <StickDancer
          ref={dancerRef}
          bpm={grooveBpm}
          onEvent={(e) => recorder.record(e)}
        />
      )}
    </div>
  );
}
