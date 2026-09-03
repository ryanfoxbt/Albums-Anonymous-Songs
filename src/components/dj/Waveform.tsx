"use client";

import { useCallback, useEffect, useRef } from "react";
import { extractPeaks, type WaveformPeaks } from "./audioEngine";

export type LoopRegion = { start: number; end: number }; // 0..1 fractions
/** Beat grid, all as 0..1 fractions of the track: `offset` is the first beat,
 *  `spacing` is one beat, `barBeats` bolds every Nth line as a downbeat. */
export type BeatGrid = { offset: number; spacing: number; barBeats: number };

type DragKind = "seek" | "cue" | "loopStart" | "loopEnd";

// How close (px) the pointer must land to a marker to grab it instead of seeking.
const HANDLE_GRAB_PX = 10;
// Smallest loop a drag will allow, as a fraction of the whole track.
const MIN_LOOP_FRAC = 0.002;

export function Waveform({
  buffer,
  progress,
  onSeek,
  cuePoint,
  loop,
  pendingLoopIn,
  beatGrid,
  onCueChange,
  onLoopChange,
  disabled = false,
}: {
  buffer: AudioBuffer | null;
  /** 0..1 playback position, or null when nothing is loaded/playing. */
  progress: number | null;
  onSeek: (fraction: number) => void;
  /** 0..1 position of the deck's custom cue point, or null once nothing's set. */
  cuePoint?: number | null;
  /** 0..1 start/end of the active loop, or null when no loop is set. */
  loop?: LoopRegion | null;
  /** Beat grid to draw behind the waveform, or null when the BPM is unknown. */
  beatGrid?: BeatGrid | null;
  /** 0..1 position of a half-set manual loop ("Loop In" pressed, "Out" pending). */
  pendingLoopIn?: number | null;
  /** Drag of the blue cue marker. `committed` is false while dragging, true on release. */
  onCueChange?: (fraction: number, committed: boolean) => void;
  /** Drag of either green loop handle. `committed` is false while dragging, true on release. */
  onLoopChange?: (loop: LoopRegion, committed: boolean) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<WaveformPeaks | null>(null);
  const dragRef = useRef<DragKind | null>(null);
  // Latest marker geometry, read by the pointer handlers without re-binding them.
  const geomRef = useRef<{ cuePoint?: number | null; loop?: LoopRegion | null }>({});
  useEffect(() => {
    geomRef.current = { cuePoint, loop };
  }, [cuePoint, loop]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const peaks = peaksRef.current;
    if (!peaks) {
      ctx.fillStyle = "rgba(128,128,128,0.15)";
      ctx.fillRect(0, height / 2 - 1, width, 2);
      return;
    }

    const mid = height / 2;
    ctx.fillStyle = "currentColor";
    ctx.globalAlpha = 0.6;
    for (let x = 0; x < width && x < peaks.min.length; x++) {
      const y1 = mid + peaks.min[x] * mid;
      const y2 = mid + peaks.max[x] * mid;
      ctx.fillRect(x, Math.min(y1, y2), 1, Math.max(1, Math.abs(y2 - y1)));
    }
    ctx.globalAlpha = 1;

    if (beatGrid && beatGrid.spacing > 0) {
      const { offset, spacing, barBeats } = beatGrid;
      const beatPx = spacing * width;
      // On a whole-track overview a full beat grid collapses into a grey wash,
      // so thin it out: every beat only when there's room, otherwise just the
      // bar lines, and nothing at all once even those would be too dense.
      const everyN = beatPx >= 6 ? 1 : beatPx * barBeats >= 5 ? barBeats : 0;
      if (everyN > 0) {
        let beat = Math.ceil(-offset / spacing);
        for (let x = offset + beat * spacing; x <= 1; x += spacing, beat++) {
          if (((beat % everyN) + everyN) % everyN !== 0) continue;
          const downbeat = ((beat % barBeats) + barBeats) % barBeats === 0;
          ctx.fillStyle = downbeat
            ? "rgba(128,128,128,0.42)"
            : "rgba(128,128,128,0.16)";
          ctx.fillRect(Math.round(x * width), 0, 1, height);
        }
      }
    }

    // Small downward triangle drawn on top of a marker so it reads as grabbable.
    const cap = (x: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 4, 0);
      ctx.lineTo(x + 4, 0);
      ctx.lineTo(x, 6);
      ctx.closePath();
      ctx.fill();
    };

    if (loop) {
      const xStart = Math.round(loop.start * width);
      const xEnd = Math.round(loop.end * width);
      ctx.fillStyle = "rgba(34,197,94,0.18)";
      ctx.fillRect(xStart, 0, Math.max(1, xEnd - xStart), height);
      ctx.fillStyle = "rgb(34,197,94)";
      ctx.fillRect(xStart, 0, 3, height);
      ctx.fillRect(Math.max(xStart + 3, xEnd - 3), 0, 3, height);
      cap(xStart + 1, "rgb(34,197,94)");
      cap(xEnd - 1, "rgb(34,197,94)");
    }

    if (pendingLoopIn != null) {
      const x = Math.round(pendingLoopIn * width);
      ctx.fillStyle = "rgb(245,158,11)";
      for (let y = 0; y < height; y += 6) ctx.fillRect(x, y, 2, 3);
      cap(x + 1, "rgb(245,158,11)");
    }

    if (cuePoint != null) {
      const x = Math.round(cuePoint * width);
      ctx.fillStyle = "rgb(59,130,246)";
      ctx.fillRect(x, 0, 2, height);
      cap(x + 1, "rgb(59,130,246)");
    }

    if (progress !== null) {
      const x = Math.round(progress * width);
      ctx.fillStyle = "rgb(239 68 68)";
      ctx.fillRect(x, 0, 2, height);
    }
  }, [progress, cuePoint, loop, pendingLoopIn, beatGrid]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    peaksRef.current = buffer
      ? extractPeaks(buffer, Math.max(1, Math.floor(canvas.clientWidth)))
      : null;
    draw();
  }, [buffer, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  function fractionFromClientX(clientX: number): number {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  // Which marker (if any) a press at `fraction` should grab. Nearest wins;
  // falls back to "seek" when nothing draggable is within reach.
  function pickTarget(fraction: number): DragKind {
    const canvas = canvasRef.current;
    if (!canvas) return "seek";
    const tol = HANDLE_GRAB_PX / canvas.clientWidth;
    const { cuePoint: cp, loop: lp } = geomRef.current;
    const candidates: [DragKind, number][] = [];
    if (onLoopChange && lp) {
      candidates.push(["loopStart", Math.abs(fraction - lp.start)]);
      candidates.push(["loopEnd", Math.abs(fraction - lp.end)]);
    }
    if (onCueChange && cp != null) {
      candidates.push(["cue", Math.abs(fraction - cp)]);
    }
    let best: DragKind = "seek";
    let bestDist = tol;
    for (const [kind, dist] of candidates) {
      if (dist <= bestDist) {
        best = kind;
        bestDist = dist;
      }
    }
    return best;
  }

  function applyDrag(kind: DragKind, fraction: number, committed: boolean) {
    const { loop: lp } = geomRef.current;
    if (kind === "seek") {
      onSeek(fraction);
      return;
    }
    if (kind === "cue") {
      onCueChange?.(fraction, committed);
      return;
    }
    if (!lp) return;
    if (kind === "loopStart") {
      const start = Math.max(0, Math.min(fraction, lp.end - MIN_LOOP_FRAC));
      onLoopChange?.({ start, end: lp.end }, committed);
    } else {
      const end = Math.min(1, Math.max(fraction, lp.start + MIN_LOOP_FRAC));
      onLoopChange?.({ start: lp.start, end }, committed);
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const fraction = fractionFromClientX(e.clientX);
    const kind = pickTarget(fraction);
    dragRef.current = kind;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort.
    }
    applyDrag(kind, fraction, false);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!dragRef.current) {
      if (canvas && !disabled) {
        canvas.style.cursor =
          pickTarget(fractionFromClientX(e.clientX)) === "seek"
            ? "pointer"
            : "ew-resize";
      }
      return;
    }
    applyDrag(dragRef.current, fractionFromClientX(e.clientX), false);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const kind = dragRef.current;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (kind && kind !== "seek") {
      applyDrag(kind, fractionFromClientX(e.clientX), true);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: "none" }}
      className="h-11 w-full cursor-pointer rounded-lg bg-black/5 text-foreground dark:bg-white/10"
    />
  );
}
