"use client";

import { useRef, useState } from "react";

// The card's art window is 16:10. This picker shows the whole source
// image with a draggable frame marking what will actually show on the
// card; drag it over the part you want, use Zoom to tighten the crop.

const CARD_ASPECT = 16 / 10;

export type Framing = { focusX: number; focusY: number; zoom: number };

export function ImageFramer({
  src,
  value,
  onChange,
}: {
  src: string;
  value: Framing;
  onChange: (next: Framing) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [imgAspect, setImgAspect] = useState(CARD_ASPECT);
  const { focusX, focusY, zoom } = value;

  const setFromPointer = (clientX: number, clientY: number) => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100));
    onChange({ focusX: Math.round(x), focusY: Math.round(y), zoom });
  };

  // Size of the crop frame as a fraction of the box.
  const wider = imgAspect >= CARD_ASPECT;
  const vw = (wider ? CARD_ASPECT / imgAspect : 1) / zoom;
  const vh = (wider ? 1 : imgAspect / CARD_ASPECT) / zoom;
  // Frame centre — clamped the same way object-position clamps the crop.
  const cx = Math.min(1 - vw / 2, Math.max(vw / 2, focusX / 100));
  const cy = Math.min(1 - vh / 2, Math.max(vh / 2, focusY / 100));

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-2">
      <span className="text-xs font-medium text-black/60 dark:text-white/60">
        Framing — drag to pick what shows on the card
      </span>
      <div
        ref={boxRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) setFromPointer(e.clientX, e.clientY);
        }}
        className="relative w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-black/15 bg-black/5 dark:border-white/20 dark:bg-white/10"
        style={{ aspectRatio: String(imgAspect) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) {
              setImgAspect(el.naturalWidth / el.naturalHeight);
            }
          }}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-white"
          style={{
            left: `${(cx - vw / 2) * 100}%`,
            top: `${(cy - vh / 2) * 100}%`,
            width: `${vw * 100}%`,
            height: `${vh * 100}%`,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
          }}
        >
          <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/40" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) =>
            onChange({ focusX, focusY, zoom: Number(e.target.value) })
          }
          className="flex-1"
        />
        <span className="tabular-nums">{zoom.toFixed(2)}×</span>
      </label>

      <button
        type="button"
        onClick={() => onChange({ focusX: 50, focusY: 50, zoom: 1 })}
        className="self-start text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
      >
        Center &amp; reset framing
      </button>
    </div>
  );
}
