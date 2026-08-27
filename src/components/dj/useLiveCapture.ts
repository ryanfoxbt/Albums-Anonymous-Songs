"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  describeMediaError,
  pickAudioInterface,
  type AudioContextWithSink,
} from "./audioEngine";

// Shared plumbing for every live input (guitar / drums / vocals): device
// discovery + auto-selecting a plugged-in interface, getUserMedia capture,
// enable/disable, hot-swapping the capture device without rebuilding the
// processing graph, and routing the whole AudioContext to a chosen output.
// Each instrument supplies its own `build` (create + wire its nodes, returning
// a chain that at minimum exposes `source` and `inputTrim`) and `teardownChain`
// (stop oscillators, disconnect nodes).

export type BaseChain = {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  inputTrim: AudioNode;
};

// What each instrument reports up to the <LiveInput> wrapper.
export type LiveStatus = {
  enabled: boolean;
  latencyMs: number | null;
  recommendedSyncMs: number | null;
};

export type CaptureControls = {
  enabled: boolean;
  starting: boolean;
  error: string | null;
  latencyMs: number | null;
  /** Estimated ms the decks should be delayed to line up with this live input. */
  recommendedSyncMs: number | null;
  inputDevices: MediaDeviceInfo[];
  outputDevices: MediaDeviceInfo[];
  inputId: string;
  outputId: string;
  sinkSupported: boolean;
  selectInput: (id: string) => void;
  selectOutput: (id: string) => void;
  enable: () => void;
  disable: () => void;
  setError: (message: string | null) => void;
};

const DEFAULT_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export function useLiveCapture<C extends BaseChain>(opts: {
  audioCtx: AudioContext | null;
  ensureAudioContext: () => AudioContext;
  /** The instrument's own chain ref — the hook fills / clears `.current`. */
  chainRef: React.MutableRefObject<C | null>;
  build: (ctx: AudioContext, stream: MediaStream) => C;
  teardownChain: (chain: C) => void;
  constraints?: MediaTrackConstraints;
}): CaptureControls {
  const { audioCtx, ensureAudioContext, chainRef } = opts;

  // `teardownChain` needs to survive into the unmount cleanup below, which
  // closes over the first render. Refresh it after every commit.
  const teardownChainRef = useRef(opts.teardownChain);
  useEffect(() => {
    teardownChainRef.current = opts.teardownChain;
  });

  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [recommendedSyncMs, setRecommendedSyncMs] = useState<number | null>(
    null,
  );

  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [inputId, setInputId] = useState("");
  const [outputId, setOutputId] = useState("");

  const appliedInputRef = useRef<string | null>(null);
  // Once the user picks an input/output by hand, stop auto-selecting the
  // detected audio interface for them.
  const manualDeviceRef = useRef(false);

  const sinkSupported = useMemo(
    () =>
      typeof AudioContext !== "undefined" &&
      "setSinkId" in AudioContext.prototype,
    [],
  );

  function audioConstraints(): MediaTrackConstraints {
    return {
      ...DEFAULT_CONSTRAINTS,
      ...opts.constraints,
      deviceId: inputId ? { exact: inputId } : undefined,
    };
  }

  function teardown() {
    const chain = chainRef.current;
    if (chain) {
      try {
        teardownChainRef.current(chain);
      } catch {
        // best effort
      }
      chain.stream.getTracks().forEach((track) => track.stop());
    }
    chainRef.current = null;
    appliedInputRef.current = null;
  }

  // Teardown on unmount (also fires when the parent swaps instruments).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => teardown(), []);

  async function refreshDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setInputDevices(devices.filter((d) => d.kind === "audioinput"));
    setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
    // Default both ends to a plugged-in audio interface when we can spot one
    // and the user hasn't overridden the choice.
    if (!manualDeviceRef.current) {
      const pick = pickAudioInterface(devices);
      if (pick.inputId) setInputId(pick.inputId);
      if (pick.outputId) setOutputId(pick.outputId);
    }
  }

  // Pre-select the interface on mount so the very first "Enable" opens it
  // directly (avoids grabbing the laptop mic + speakers, a feedback magnet).
  // Labels are only readable once mic permission was granted before — the
  // common case on a page refresh.
  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        setInputDevices(devices.filter((d) => d.kind === "audioinput"));
        setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
        if (manualDeviceRef.current) return;
        const pick = pickAudioInterface(devices);
        if (pick.inputId) setInputId(pick.inputId);
        if (pick.outputId) setOutputId(pick.outputId);
      })
      .catch(() => {});
  }, []);

  async function enable() {
    setStarting(true);
    setError(null);
    try {
      const ctx = ensureAudioContext();
      await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints(),
      });
      const chain = opts.build(ctx, stream);
      chainRef.current = chain;
      const track = stream.getAudioTracks()[0];
      const settings = track?.getSettings() as
        | (MediaTrackSettings & { latency?: number })
        | undefined;
      appliedInputRef.current = settings?.deviceId ?? "";
      if (settings?.deviceId) setInputId(settings.deviceId);
      // Permission is granted now, so device labels are readable — this may
      // upgrade the input/output to a detected interface and hot-swap the chain.
      await refreshDevices();
      setLatencyMs(
        Math.round((ctx.baseLatency + (ctx.outputLatency || 0)) * 1000),
      );
      // How far the file decks should be pushed back to meet this live input:
      // the capture (input) latency the decks don't have, plus ~12 ms for the
      // in-line compressor and capture pipeline. Fall back to ~2x the output
      // buffer when the device doesn't report its own latency.
      const inputLatency =
        typeof settings?.latency === "number" && settings.latency > 0
          ? settings.latency
          : ctx.baseLatency * 2;
      setRecommendedSyncMs(
        Math.max(0, Math.min(150, Math.round(inputLatency * 1000) + 12)),
      );
      setEnabled(true);
    } catch (err) {
      setError(describeMediaError(err));
    } finally {
      setStarting(false);
    }
  }

  function disable() {
    teardown();
    setEnabled(false);
    setLatencyMs(null);
    setRecommendedSyncMs(null);
    setError(null);
  }

  // Swap the capture device without rebuilding the processing graph.
  useEffect(() => {
    if (!enabled || !audioCtx) return;
    if (inputId === appliedInputRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints(),
        });
        const chain = chainRef.current;
        if (cancelled || !chain) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        try {
          chain.source.disconnect();
        } catch {
          // fine
        }
        chain.stream.getTracks().forEach((track) => track.stop());
        const next = audioCtx.createMediaStreamSource(stream);
        next.connect(chain.inputTrim);
        chain.source = next;
        chain.stream = stream;
        appliedInputRef.current =
          stream.getAudioTracks()[0]?.getSettings().deviceId ?? inputId;
      } catch (err) {
        if (!cancelled) setError(describeMediaError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputId, enabled, audioCtx]);

  // Route the whole context (decks + live input) to the chosen output device.
  useEffect(() => {
    if (!enabled || !audioCtx) return;
    const sink = audioCtx as AudioContextWithSink;
    if (typeof sink.setSinkId !== "function") return;
    sink.setSinkId(outputId).catch(() => {
      setError("Couldn't switch to that output device.");
    });
  }, [outputId, enabled, audioCtx]);

  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      refreshDevices().catch(() => {});
    };
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", handler);
  }, [enabled]);

  return {
    enabled,
    starting,
    error,
    latencyMs,
    recommendedSyncMs,
    inputDevices,
    outputDevices,
    inputId,
    outputId,
    sinkSupported,
    selectInput: (id: string) => {
      manualDeviceRef.current = true;
      setInputId(id);
    },
    selectOutput: (id: string) => {
      manualDeviceRef.current = true;
      setOutputId(id);
    },
    enable,
    disable,
    setError,
  };
}
