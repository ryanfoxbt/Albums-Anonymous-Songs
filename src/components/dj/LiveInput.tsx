"use client";

import { useState } from "react";
import { DrumInput } from "./DrumInput";
import { GuitarInput } from "./GuitarInput";
import type { LiveStatus } from "./useLiveCapture";
import { VocalInput } from "./VocalInput";

// One live input at a time — captured with getUserMedia and mixed into the
// same AudioContext the decks use. Switching instrument unmounts the previous
// one, which tears down its stream and nodes, so picking Drums (or Vocals)
// automatically releases the guitar and vice versa.

type Instrument = "guitar" | "drums" | "vocals";

const INSTRUMENTS: { id: Instrument; label: string; icon: string }[] = [
  { id: "guitar", label: "Guitar", icon: "🎸" },
  { id: "drums", label: "Drums", icon: "🥁" },
  { id: "vocals", label: "Vocals", icon: "🎤" },
];

export function LiveInput({
  audioCtx,
  ensureAudioContext,
  activeDeckBpm,
}: {
  audioCtx: AudioContext | null;
  ensureAudioContext: () => AudioContext;
  /** BPM of whichever deck the crossfader currently favours, for delay sync. */
  activeDeckBpm: number | null;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [status, setStatus] = useState<LiveStatus>({
    enabled: false,
    latencyMs: null,
  });

  const active = INSTRUMENTS.find((i) => i.id === instrument)!;

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
      >
        <span className="flex items-center gap-2 text-[10px] font-medium text-black/50 dark:text-white/50">
          <span aria-hidden>{active.icon}</span>
          Live Input
          {status.enabled && (
            <span
              className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-semibold text-background"
              title={
                status.latencyMs != null
                  ? `Browser audio runs ~${status.latencyMs} ms behind real time. If you record the dry guitar off your interface separately, add roughly this as a sync offset to the decks / browser-audio source in your streaming software.`
                  : undefined
              }
            >
              On
              {status.latencyMs != null ? ` · ~${status.latencyMs} ms` : ""}
            </span>
          )}
        </span>
        <span className="text-black/30 dark:text-white/30">
          {panelOpen ? "▾" : "▸"}
        </span>
      </button>

      {panelOpen && (
        <div className="flex flex-col gap-3 border-t border-black/10 p-3 dark:border-white/10">
          <div className="flex gap-1">
            {INSTRUMENTS.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => {
                  setStatus({ enabled: false, latencyMs: null });
                  setInstrument(i.id);
                }}
                className={`flex-1 rounded-lg border px-2 py-1 text-[10px] font-medium ${
                  i.id === instrument
                    ? "border-foreground bg-foreground text-background"
                    : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                }`}
              >
                <span aria-hidden className="mr-1">
                  {i.icon}
                </span>
                {i.label}
              </button>
            ))}
          </div>

          {instrument === "guitar" && (
            <GuitarInput
              key="guitar"
              audioCtx={audioCtx}
              ensureAudioContext={ensureAudioContext}
              activeDeckBpm={activeDeckBpm}
              onStatusChange={setStatus}
            />
          )}
          {instrument === "drums" && (
            <DrumInput
              key="drums"
              audioCtx={audioCtx}
              ensureAudioContext={ensureAudioContext}
              onStatusChange={setStatus}
            />
          )}
          {instrument === "vocals" && (
            <VocalInput
              key="vocals"
              audioCtx={audioCtx}
              ensureAudioContext={ensureAudioContext}
              activeDeckBpm={activeDeckBpm}
              onStatusChange={setStatus}
            />
          )}
        </div>
      )}
    </div>
  );
}
