"use client";

import type { ReactNode } from "react";
import type { CaptureControls } from "./useLiveCapture";

const SELECT_CLS =
  "rounded-lg border border-black/15 bg-transparent px-1.5 py-1 text-[10px] disabled:opacity-40 dark:border-white/20";

// The bits every live input renders the same way: an intro + "Enable" button
// while off, then the device pickers, the instrument's own body, and a
// "Disable" link while on.
export function CaptureShell({
  controls,
  enableLabel,
  intro,
  children,
}: {
  controls: CaptureControls;
  enableLabel: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  const {
    enabled,
    starting,
    error,
    inputDevices,
    outputDevices,
    inputId,
    outputId,
    sinkSupported,
    selectInput,
    selectOutput,
    enable,
    disable,
  } = controls;

  if (!enabled) {
    return (
      <>
        <p className="text-[10px] leading-relaxed text-black/40 dark:text-white/40">
          {intro}
        </p>
        <button
          type="button"
          onClick={enable}
          disabled={starting}
          className="self-start rounded-full border border-foreground bg-foreground px-3 py-1.5 text-[10px] font-semibold text-background disabled:opacity-50"
        >
          {starting ? "Starting…" : enableLabel}
        </button>
        {error && (
          <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-0.5 text-[10px] text-black/50 dark:text-white/50">
          Input
          <select
            value={inputId}
            onChange={(e) => selectInput(e.target.value)}
            className={SELECT_CLS}
          >
            <option value="">System default</option>
            {inputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "Input device"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-[10px] text-black/50 dark:text-white/50">
          Output
          <select
            value={outputId}
            onChange={(e) => selectOutput(e.target.value)}
            disabled={!sinkSupported}
            className={SELECT_CLS}
          >
            <option value="">System default</option>
            {outputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || "Output device"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!sinkSupported && (
        <p className="text-[10px] text-black/40 dark:text-white/40">
          This browser can&rsquo;t pick the output — set the interface as your
          system default output device.
        </p>
      )}

      {children}

      {error && (
        <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={disable}
        className="self-start text-[10px] font-medium text-black/40 underline underline-offset-2 dark:text-white/40"
      >
        Disable input
      </button>
    </>
  );
}
