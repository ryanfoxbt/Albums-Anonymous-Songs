"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DELAY_DIVISIONS,
  describeMediaError,
  getCabinetImpulse,
  getImpulseResponse,
  makeDriveCurve,
  type AudioContextWithSink,
} from "./audioEngine";
import { FxToggle, MiniSlider } from "./controls";

// A guitar (or any line input) plugged into a USB audio interface, captured
// with getUserMedia and run through a small pedalboard of native Web Audio
// nodes, then mixed into the same AudioContext the decks use so it blends
// with whatever is playing. Collapsed and inert by default — nothing touches
// the microphone until "Enable guitar input" is pressed.

type Chain = {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  inputTrim: GainNode;
  gateAnalyser: AnalyserNode;
  gateGain: GainNode;
  compressor: DynamicsCompressorNode;
  compMakeup: GainNode;
  preHighpass: BiquadFilterNode;
  shaper: WaveShaperNode;
  tone: BiquadFilterNode;
  cabConvolver: ConvolverNode;
  cabWet: GainNode;
  cabDry: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  coreOut: GainNode;
  ampGain: GainNode;
  chorusDelay: DelayNode;
  chorusLfo: OscillatorNode;
  chorusDepth: GainNode;
  chorusWet: GainNode;
  delay: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  reverbConvolver: ConvolverNode;
  reverbWet: GainNode;
  master: GainNode;
};

type Preset = {
  name: string;
  gateOn: boolean;
  compOn: boolean;
  driveOn: boolean;
  drive: number;
  tone: number;
  cabOn: boolean;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  chorusOn: boolean;
  chorusMix: number;
  delayOn: boolean;
  delayMix: number;
  delayDivision: number;
  delayFeedback: number;
  reverbOn: boolean;
  reverbMix: number;
};

const PRESETS: Preset[] = [
  {
    name: "Clean DI",
    gateOn: false, compOn: true, driveOn: false, drive: 0.15, tone: 0.7,
    cabOn: false, eqLow: 0, eqMid: 0, eqHigh: 1,
    chorusOn: false, chorusMix: 0.25,
    delayOn: false, delayMix: 0.2, delayDivision: 3, delayFeedback: 0.3,
    reverbOn: true, reverbMix: 0.16,
  },
  {
    name: "Crunch",
    gateOn: true, compOn: true, driveOn: true, drive: 0.4, tone: 0.55,
    cabOn: true, eqLow: 2, eqMid: -1, eqHigh: 1,
    chorusOn: false, chorusMix: 0.25,
    delayOn: true, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.3,
    reverbOn: true, reverbMix: 0.2,
  },
  {
    name: "Ambient Lead",
    gateOn: false, compOn: true, driveOn: true, drive: 0.55, tone: 0.5,
    cabOn: true, eqLow: 1, eqMid: 2, eqHigh: 3,
    chorusOn: true, chorusMix: 0.35,
    delayOn: true, delayMix: 0.3, delayDivision: 2, delayFeedback: 0.42,
    reverbOn: true, reverbMix: 0.4,
  },
];

const SELECT_CLS =
  "rounded-lg border border-black/15 bg-transparent px-1.5 py-1 text-[10px] disabled:opacity-40 dark:border-white/20";

function fxBtn(on: boolean) {
  return `w-16 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
    on
      ? "border-foreground bg-foreground text-background"
      : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
  }`;
}

const dbLabel = (v: number) => `${v > 0 ? "+" : ""}${v} dB`;

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
  const [pedalsOpen, setPedalsOpen] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [inputId, setInputId] = useState("");
  const [outputId, setOutputId] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [level, setLevel] = useState(0.8);
  const [ampOn, setAmpOn] = useState(true);
  const [gateOn, setGateOn] = useState(false);
  const [gateThreshold, setGateThreshold] = useState(-55);
  const [compOn, setCompOn] = useState(true);
  const [driveOn, setDriveOn] = useState(false);
  const [drive, setDrive] = useState(0.3);
  const [tone, setTone] = useState(0.6);
  const [cabOn, setCabOn] = useState(false);
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);
  const [chorusOn, setChorusOn] = useState(false);
  const [chorusMix, setChorusMix] = useState(0.3);
  const [delayOn, setDelayOn] = useState(false);
  const [delayMix, setDelayMix] = useState(0.25);
  const [delayDivision, setDelayDivision] = useState(3);
  const [delayFreeMs, setDelayFreeMs] = useState(300);
  const [delayFeedback, setDelayFeedback] = useState(0.35);
  const [reverbOn, setReverbOn] = useState(false);
  const [reverbMix, setReverbMix] = useState(0.25);

  const chainRef = useRef<Chain | null>(null);
  const rafRef = useRef<number | null>(null);
  const appliedInputRef = useRef<string | null>(null);
  // Mirrored into refs so the gate's rAF loop reads the latest values
  // without needing to be torn down and restarted on every tweak.
  const gateOnRef = useRef(gateOn);
  const gateThresholdRef = useRef(gateThreshold);
  useEffect(() => {
    gateOnRef.current = gateOn;
  }, [gateOn]);
  useEffect(() => {
    gateThresholdRef.current = gateThreshold;
  }, [gateThreshold]);

  const sinkSupported = useMemo(
    () =>
      typeof AudioContext !== "undefined" &&
      "setSinkId" in AudioContext.prototype,
    [],
  );

  function teardown() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const chain = chainRef.current;
    if (chain) {
      try {
        chain.chorusLfo.stop();
      } catch {
        // already stopped
      }
      chain.stream.getTracks().forEach((track) => track.stop());
      const nodes: AudioNode[] = [
        chain.source, chain.inputTrim, chain.gateAnalyser, chain.gateGain,
        chain.compressor, chain.compMakeup, chain.preHighpass, chain.shaper,
        chain.tone, chain.cabConvolver, chain.cabWet, chain.cabDry, chain.eqLow,
        chain.eqMid, chain.eqHigh, chain.coreOut, chain.ampGain, chain.chorusDelay,
        chain.chorusDepth, chain.chorusWet, chain.delay, chain.delayFeedback,
        chain.delayWet, chain.reverbConvolver, chain.reverbWet, chain.master,
      ];
      for (const node of nodes) {
        try {
          node.disconnect();
        } catch {
          // fine
        }
      }
    }
    chainRef.current = null;
    appliedInputRef.current = null;
  }

  // Teardown on unmount.
  useEffect(() => () => teardown(), []);

  function buildChain(ctx: AudioContext, stream: MediaStream) {
    const source = ctx.createMediaStreamSource(stream);
    const inputTrim = ctx.createGain();

    const gateAnalyser = ctx.createAnalyser();
    gateAnalyser.fftSize = 1024;
    const gateGain = ctx.createGain();

    const compressor = ctx.createDynamicsCompressor();
    const compMakeup = ctx.createGain();

    const preHighpass = ctx.createBiquadFilter();
    preHighpass.type = "highpass";
    preHighpass.frequency.value = 85;
    const shaper = ctx.createWaveShaper();
    shaper.oversample = "2x";
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 20000;

    const cabConvolver = ctx.createConvolver();
    const cabWet = ctx.createGain();
    cabWet.gain.value = 0;
    const cabDry = ctx.createGain();
    cabDry.gain.value = 1;

    const eqLowNode = ctx.createBiquadFilter();
    eqLowNode.type = "lowshelf";
    eqLowNode.frequency.value = 220;
    const eqMidNode = ctx.createBiquadFilter();
    eqMidNode.type = "peaking";
    eqMidNode.frequency.value = 1000;
    eqMidNode.Q.value = 0.8;
    const eqHighNode = ctx.createBiquadFilter();
    eqHighNode.type = "highshelf";
    eqHighNode.frequency.value = 3800;

    const coreOut = ctx.createGain();
    const master = ctx.createGain();
    master.gain.value = level;
    const ampGain = ctx.createGain();
    ampGain.gain.value = ampOn ? 1 : 0;

    const chorusDelay = ctx.createDelay(0.05);
    chorusDelay.delayTime.value = 0.025;
    const chorusLfo = ctx.createOscillator();
    chorusLfo.frequency.value = 0.6;
    const chorusDepth = ctx.createGain();
    chorusDepth.gain.value = 0.003;
    chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime);
    chorusLfo.start();
    const chorusWet = ctx.createGain();
    chorusWet.gain.value = 0;

    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.3;
    const delayFeedbackNode = ctx.createGain();
    delayFeedbackNode.gain.value = delayFeedback;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0;

    const reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = getImpulseResponse(ctx);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0;

    // Series core: input → gate → comp → amp/cab → EQ → coreOut.
    source.connect(inputTrim);
    inputTrim.connect(gateAnalyser);
    inputTrim.connect(gateGain);
    gateGain.connect(compressor).connect(compMakeup);
    compMakeup.connect(preHighpass).connect(shaper).connect(tone);
    tone.connect(cabConvolver).connect(cabWet);
    tone.connect(cabDry);
    cabWet.connect(eqLowNode);
    cabDry.connect(eqLowNode);
    eqLowNode.connect(eqMidNode).connect(eqHighNode).connect(coreOut);

    // coreOut → dry amp path + parallel time-based effect sends → master.
    coreOut.connect(ampGain).connect(master);
    coreOut.connect(chorusDelay).connect(chorusWet).connect(master);
    coreOut.connect(delay);
    delay.connect(delayFeedbackNode).connect(delay);
    delay.connect(delayWet).connect(master);
    coreOut.connect(reverbConvolver).connect(reverbWet).connect(master);
    master.connect(ctx.destination);

    getCabinetImpulse(ctx)
      .then((buf) => {
        cabConvolver.buffer = buf;
      })
      .catch(() => {
        // Cab is optional colour; the chain still passes audio without it.
      });

    appliedInputRef.current =
      stream.getAudioTracks()[0]?.getSettings().deviceId ?? "";

    chainRef.current = {
      stream, source, inputTrim, gateAnalyser, gateGain, compressor, compMakeup,
      preHighpass, shaper, tone, cabConvolver, cabWet, cabDry,
      eqLow: eqLowNode, eqMid: eqMidNode, eqHigh: eqHighNode, coreOut, ampGain,
      chorusDelay, chorusLfo, chorusDepth, chorusWet, delay,
      delayFeedback: delayFeedbackNode, delayWet, reverbConvolver, reverbWet, master,
    };
  }

  function startGateLoop(ctx: AudioContext) {
    const buffer = new Float32Array(chainRef.current?.gateAnalyser.fftSize ?? 1024);
    const tick = () => {
      const chain = chainRef.current;
      if (!chain) return;
      chain.gateAnalyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      const rms = Math.sqrt(sum / buffer.length);
      const db = 20 * Math.log10(rms || 1e-8);
      const open = !gateOnRef.current || db > gateThresholdRef.current;
      chain.gateGain.gain.setTargetAtTime(
        open ? 1 : 0,
        ctx.currentTime,
        open ? 0.005 : 0.06,
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function refreshDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setInputDevices(devices.filter((d) => d.kind === "audioinput"));
    setOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
  }

  async function enable() {
    setStarting(true);
    setError(null);
    try {
      const ctx = ensureAudioContext();
      await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: inputId ? { exact: inputId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      buildChain(ctx, stream);
      startGateLoop(ctx);
      await refreshDevices();
      const actualId = stream.getAudioTracks()[0]?.getSettings().deviceId;
      if (actualId) setInputId(actualId);
      setLatencyMs(
        Math.round((ctx.baseLatency + (ctx.outputLatency || 0)) * 1000),
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
    setError(null);
  }

  // Swap the capture device without rebuilding the pedalboard.
  useEffect(() => {
    if (!enabled || !audioCtx) return;
    if (inputId === appliedInputRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: inputId ? { exact: inputId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
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
  }, [inputId, enabled, audioCtx]);

  // Route the whole context (decks + guitar) to the chosen output device.
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

  // --- Parameter updates: mirror React state onto the live nodes. ---
  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.master.gain.setTargetAtTime(level, now, 0.02);
    chain.ampGain.gain.setTargetAtTime(ampOn ? 1 : 0, now, 0.02);
  }, [level, ampOn, enabled, audioCtx]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    const c = chain.compressor;
    if (compOn) {
      c.threshold.value = -24;
      c.knee.value = 30;
      c.ratio.value = 4;
      c.attack.value = 0.003;
      c.release.value = 0.25;
      chain.compMakeup.gain.value = 1.6;
    } else {
      c.threshold.value = 0;
      c.knee.value = 0;
      c.ratio.value = 1;
      chain.compMakeup.gain.value = 1;
    }
  }, [compOn, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.shaper.curve = driveOn ? makeDriveCurve(drive) : null;
    chain.tone.frequency.value = driveOn ? 1400 + tone * 6000 : 20000;
  }, [driveOn, drive, tone, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.cabWet.gain.setTargetAtTime(cabOn ? 1 : 0, now, 0.02);
    chain.cabDry.gain.setTargetAtTime(cabOn ? 0 : 1, now, 0.02);
  }, [cabOn, enabled, audioCtx]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.eqLow.gain.setTargetAtTime(eqLow, now, 0.02);
    chain.eqMid.gain.setTargetAtTime(eqMid, now, 0.02);
    chain.eqHigh.gain.setTargetAtTime(eqHigh, now, 0.02);
  }, [eqLow, eqMid, eqHigh, enabled, audioCtx]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.chorusWet.gain.value = chorusOn ? chorusMix : 0;
  }, [chorusOn, chorusMix, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.delayWet.gain.value = delayOn ? delayMix : 0;
    chain.delayFeedback.gain.setTargetAtTime(delayFeedback, now, 0.02);
    const division = DELAY_DIVISIONS[delayDivision];
    const seconds =
      division.beats > 0 && activeDeckBpm && activeDeckBpm > 0
        ? (60 / activeDeckBpm) * division.beats
        : delayFreeMs / 1000;
    chain.delay.delayTime.setTargetAtTime(
      Math.min(1.95, Math.max(0.02, seconds)),
      now,
      0.05,
    );
  }, [
    delayOn, delayMix, delayFeedback, delayDivision, delayFreeMs,
    activeDeckBpm, enabled, audioCtx,
  ]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.reverbWet.gain.value = reverbOn ? reverbMix : 0;
  }, [reverbOn, reverbMix, enabled]);

  function applyPreset(preset: Preset) {
    setGateOn(preset.gateOn);
    setCompOn(preset.compOn);
    setDriveOn(preset.driveOn);
    setDrive(preset.drive);
    setTone(preset.tone);
    setCabOn(preset.cabOn);
    setEqLow(preset.eqLow);
    setEqMid(preset.eqMid);
    setEqHigh(preset.eqHigh);
    setChorusOn(preset.chorusOn);
    setChorusMix(preset.chorusMix);
    setDelayOn(preset.delayOn);
    setDelayMix(preset.delayMix);
    setDelayDivision(preset.delayDivision);
    setDelayFeedback(preset.delayFeedback);
    setReverbOn(preset.reverbOn);
    setReverbMix(preset.reverbMix);
  }

  const freeTime = DELAY_DIVISIONS[delayDivision].beats === 0;

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
      >
        <span className="flex items-center gap-2 text-[10px] font-medium text-black/50 dark:text-white/50">
          <span aria-hidden>🎸</span>
          Live Input
          {enabled && (
            <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-semibold text-background">
              On{latencyMs != null ? ` · ~${latencyMs} ms` : ""}
            </span>
          )}
        </span>
        <span className="text-black/30 dark:text-white/30">
          {panelOpen ? "▾" : "▸"}
        </span>
      </button>

      {panelOpen && (
        <div className="flex flex-col gap-3 border-t border-black/10 p-3 dark:border-white/10">
          {!enabled ? (
            <>
              <p className="text-[10px] leading-relaxed text-black/40 dark:text-white/40">
                Plug a guitar into your audio interface and jam over the decks.
                Effects run in the browser (~15–40&nbsp;ms of monitoring
                latency) — for the tightest feel, monitor your dry tone on the
                interface and use this for effects, with &ldquo;Amp to
                output&rdquo; off.
              </p>
              <button
                type="button"
                onClick={enable}
                disabled={starting}
                className="self-start rounded-full border border-foreground bg-foreground px-3 py-1.5 text-[10px] font-semibold text-background disabled:opacity-50"
              >
                {starting ? "Starting…" : "Enable guitar input"}
              </button>
              {error && (
                <p className="text-[10px] text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-0.5 text-[10px] text-black/50 dark:text-white/50">
                  Input
                  <select
                    value={inputId}
                    onChange={(e) => setInputId(e.target.value)}
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
                    onChange={(e) => setOutputId(e.target.value)}
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
                  This browser can&rsquo;t pick the output — set the interface as
                  your system default output device.
                </p>
              )}

              <div className="grid grid-cols-2 items-end gap-2">
                <MiniSlider
                  label="Input level"
                  valueLabel={`${Math.round(level * 100)}%`}
                  min={0}
                  max={1}
                  step={0.01}
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  onDoubleClick={() => setLevel(0.8)}
                />
                <button
                  type="button"
                  onClick={() => setAmpOn((v) => !v)}
                  title="Send the amp/dry guitar to the output. Turn off when monitoring dry on the interface — delay and reverb tails still come through."
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                    ampOn
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  }`}
                >
                  Amp to output {ampOn ? "On" : "Off"}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full border border-black/15 px-2 py-1 text-[10px] font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPedalsOpen((v) => !v)}
                className="flex items-center gap-1 self-start text-[10px] font-medium text-black/50 dark:text-white/50"
              >
                {pedalsOpen ? "▾" : "▸"} Pedalboard
              </button>

              {pedalsOpen && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGateOn((v) => !v)}
                      className={fxBtn(gateOn)}
                    >
                      Gate
                    </button>
                    <input
                      type="range"
                      min={-75}
                      max={-20}
                      step={1}
                      value={gateThreshold}
                      disabled={!gateOn}
                      onChange={(e) => setGateThreshold(Number(e.target.value))}
                      className="flex-1 accent-foreground disabled:opacity-30"
                    />
                    <span className="w-12 text-right text-[10px] tabular-nums text-black/40 dark:text-white/40">
                      {gateThreshold} dB
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCompOn((v) => !v)}
                      className={fxBtn(compOn)}
                    >
                      Comp
                    </button>
                    <span className="flex-1 text-[10px] text-black/40 dark:text-white/40">
                      Evens out pick attack &amp; sustain
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDriveOn((v) => !v)}
                      className={fxBtn(driveOn)}
                    >
                      Amp
                    </button>
                    <button
                      type="button"
                      onClick={() => setCabOn((v) => !v)}
                      className={fxBtn(cabOn)}
                    >
                      Cab {cabOn ? "On" : "Off"}
                    </button>
                    <span className="flex-1 text-right text-[10px] text-black/40 dark:text-white/40">
                      drive / tone / cabinet
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniSlider
                      label="Drive"
                      valueLabel={`${Math.round(drive * 100)}%`}
                      min={0}
                      max={1}
                      step={0.01}
                      value={drive}
                      onChange={(e) => setDrive(Number(e.target.value))}
                    />
                    <MiniSlider
                      label="Tone"
                      valueLabel={`${Math.round(tone * 100)}%`}
                      min={0}
                      max={1}
                      step={0.01}
                      value={tone}
                      onChange={(e) => setTone(Number(e.target.value))}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <MiniSlider
                      label="EQ Low"
                      valueLabel={dbLabel(eqLow)}
                      min={-18}
                      max={12}
                      step={1}
                      value={eqLow}
                      onChange={(e) => setEqLow(Number(e.target.value))}
                      onDoubleClick={() => setEqLow(0)}
                    />
                    <MiniSlider
                      label="EQ Mid"
                      valueLabel={dbLabel(eqMid)}
                      min={-18}
                      max={12}
                      step={1}
                      value={eqMid}
                      onChange={(e) => setEqMid(Number(e.target.value))}
                      onDoubleClick={() => setEqMid(0)}
                    />
                    <MiniSlider
                      label="EQ High"
                      valueLabel={dbLabel(eqHigh)}
                      min={-18}
                      max={12}
                      step={1}
                      value={eqHigh}
                      onChange={(e) => setEqHigh(Number(e.target.value))}
                      onDoubleClick={() => setEqHigh(0)}
                    />
                  </div>

                  <FxToggle
                    label="Chorus"
                    on={chorusOn}
                    onToggle={() => setChorusOn((v) => !v)}
                    mix={chorusMix}
                    onMixChange={setChorusMix}
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDelayOn((v) => !v)}
                      className={fxBtn(delayOn)}
                    >
                      Delay
                    </button>
                    <select
                      value={delayDivision}
                      onChange={(e) => setDelayDivision(Number(e.target.value))}
                      disabled={!delayOn}
                      className={SELECT_CLS}
                      title={
                        freeTime
                          ? "Free-running delay time"
                          : "Synced to the playing deck's BPM"
                      }
                    >
                      {DELAY_DIVISIONS.map((d, i) => (
                        <option key={d.label} value={i}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.01}
                      value={delayMix}
                      disabled={!delayOn}
                      onChange={(e) => setDelayMix(Number(e.target.value))}
                      className="flex-1 accent-foreground disabled:opacity-30"
                    />
                  </div>
                  {delayOn && freeTime && (
                    <div className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-right text-[10px] text-black/40 dark:text-white/40">
                        Time
                      </span>
                      <input
                        type="range"
                        min={20}
                        max={800}
                        step={5}
                        value={delayFreeMs}
                        onChange={(e) => setDelayFreeMs(Number(e.target.value))}
                        className="flex-1 accent-foreground"
                      />
                      <span className="w-12 text-right text-[10px] tabular-nums text-black/40 dark:text-white/40">
                        {delayFreeMs} ms
                      </span>
                    </div>
                  )}
                  {delayOn && !freeTime && activeDeckBpm == null && (
                    <p className="text-[10px] text-black/40 dark:text-white/40">
                      Load a track with a known BPM to sync the delay, or pick
                      &ldquo;Free&rdquo;.
                    </p>
                  )}

                  <FxToggle
                    label="Reverb"
                    on={reverbOn}
                    onToggle={() => setReverbOn((v) => !v)}
                    mix={reverbMix}
                    onMixChange={setReverbMix}
                  />
                </div>
              )}

              {error && (
                <p className="text-[10px] text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={disable}
                className="self-start text-[10px] font-medium text-black/40 underline underline-offset-2 dark:text-white/40"
              >
                Disable input
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
