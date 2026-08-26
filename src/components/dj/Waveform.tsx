"use client";

import { useCallback, useEffect, useRef } from "react";
import { extractPeaks, type WaveformPeaks } from "./audioEngine";

export function Waveform({
  buffer,
  progress,
  onSeek,
}: {
  buffer: AudioBuffer | null;
  /** 0..1 playback position, or null when nothing is loaded/playing. */
  progress: number | null;
  onSeek: (fraction: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<WaveformPeaks | null>(null);

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

    if (progress !== null) {
      const x = Math.round(progress * width);
      ctx.fillStyle = "rgb(239 68 68)";
      ctx.fillRect(x, 0, 2, height);
    }
  }, [progress]);

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

  function handleSeek(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(fraction);
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={(e) => handleSeek(e.clientX)}
      className="h-16 w-full cursor-pointer rounded-lg bg-black/5 text-foreground dark:bg-white/10"
    />
  );
}
