"use client";

import { useEffect, useRef, useState } from "react";
import { connectOutputBus, getImpulseResponse } from "./audioEngine";
import { CaptureShell } from "./CaptureShell";
import { MiniSlider, MixControls } from "./controls";
import { useLiveCapture } from "./useLiveCapture";

// An electronic drum kit already makes its own sounds, so this stays minimal:
// capture the module's stereo output, glue it with a light bus compressor +
// 3-band EQ, and offer a room-reverb blend before it mixes into the decks.

type Chain = {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  inputTrim: GainNode;
  comp: DynamicsCompressorNode;
  compMakeup: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  dryGain: GainNode;
  reverbConvolver: ConvolverNode;
  reverbWet: GainNode;
  master: GainNode;
  panner: StereoPannerNode;
  limiter: WaveShaperNode;
};

type Preset = {
  name: string;
  compOn: boolean;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  reverbOn: boolean;
  reverbMix: number;
};

const PRESETS: Preset[] = [
  { name: "Natural", compOn: false, eqLow: 0, eqMid: 0, eqHigh: 0, reverbOn: true, reverbMix: 0.12 },
  { name: "Punchy", compOn: true, eqLow: 3, eqMid: -2, eqHigh: 2, reverbOn: true, reverbMix: 0.08 },
  { name: "Roomy", compOn: true, eqLow: 1, eqMid: 0, eqHigh: 1, reverbOn: true, reverbMix: 0.34 },
  { name: "Lo-Fi", compOn: true, eqLow: -4, eqMid: 4, eqHigh: -10, reverbOn: true, reverbMix: 0.1 },
];

const dbLabel = (v: number) => `${v > 0 ? "+" : ""}${v} dB`;

export function DrumInput({
  audioCtx,
  ensureAudioContext,
  onStatusChange,
}: {
  audioCtx: AudioContext | null;
  ensureAudioContext: () => AudioContext;
  onStatusChange?: (s: { enabled: boolean; latencyMs: number | null }) => void;
}) {
  const [level, setLevel] = useState(0.8);
  const [compOn, setCompOn] = useState(false);
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);
  const [reverbOn, setReverbOn] = useState(true);
  const [reverbMix, setReverbMix] = useState(0.12);
  const [pan, setPan] = useState(0);

  const chainRef = useRef<Chain | null>(null);

  function build(ctx: AudioContext, stream: MediaStream): Chain {
    const source = ctx.createMediaStreamSource(stream);
    const inputTrim = ctx.createGain();

    const comp = ctx.createDynamicsCompressor();
    const compMakeup = ctx.createGain();

    const eqLowNode = ctx.createBiquadFilter();
    eqLowNode.type = "lowshelf";
    eqLowNode.frequency.value = 110;
    const eqMidNode = ctx.createBiquadFilter();
    eqMidNode.type = "peaking";
    eqMidNode.frequency.value = 900;
    eqMidNode.Q.value = 0.7;
    const eqHighNode = ctx.createBiquadFilter();
    eqHighNode.type = "highshelf";
    eqHighNode.frequency.value = 5500;

    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;

    const reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = getImpulseResponse(ctx);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0;

    const { input: master, panner, limiter } = connectOutputBus(ctx, level);

    source.connect(inputTrim);
    inputTrim.connect(comp).connect(compMakeup);
    compMakeup.connect(eqLowNode).connect(eqMidNode).connect(eqHighNode);
    eqHighNode.connect(dryGain).connect(master);
    eqHighNode.connect(reverbConvolver).connect(reverbWet).connect(master);

    return {
      stream, source, inputTrim, comp, compMakeup,
      eqLow: eqLowNode, eqMid: eqMidNode, eqHigh: eqHighNode,
      dryGain, reverbConvolver, reverbWet, master, panner, limiter,
    };
  }

  function teardownChain(chain: Chain) {
    const nodes: AudioNode[] = [
      chain.source, chain.inputTrim, chain.comp, chain.compMakeup,
      chain.eqLow, chain.eqMid, chain.eqHigh, chain.dryGain,
      chain.reverbConvolver, chain.reverbWet, chain.master, chain.panner,
      chain.limiter,
    ];
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {
        // fine
      }
    }
  }

  const capture = useLiveCapture<Chain>({
    audioCtx,
    ensureAudioContext,
    chainRef,
    build,
    teardownChain,
    constraints: { channelCount: { ideal: 2 } },
  });
  const enabled = capture.enabled;

  useEffect(() => {
    onStatusChange?.({
      enabled: capture.enabled,
      latencyMs: capture.latencyMs,
    });
  }, [capture.enabled, capture.latencyMs, onStatusChange]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.master.gain.setTargetAtTime(level, now, 0.02);
    chain.panner.pan.setTargetAtTime(pan, now, 0.02);
  }, [level, pan, audioCtx, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    const c = chain.comp;
    if (compOn) {
      c.threshold.value = -20;
      c.knee.value = 24;
      c.ratio.value = 4;
      c.attack.value = 0.004;
      c.release.value = 0.18;
      chain.compMakeup.gain.value = 1.5;
    } else {
      c.threshold.value = 0;
      c.knee.value = 0;
      c.ratio.value = 1;
      chain.compMakeup.gain.value = 1;
    }
  }, [compOn, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.eqLow.gain.setTargetAtTime(eqLow, now, 0.02);
    chain.eqMid.gain.setTargetAtTime(eqMid, now, 0.02);
    chain.eqHigh.gain.setTargetAtTime(eqHigh, now, 0.02);
  }, [eqLow, eqMid, eqHigh, audioCtx, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.reverbWet.gain.value = reverbOn ? reverbMix : 0;
  }, [reverbOn, reverbMix, enabled]);

  function applyPreset(preset: Preset) {
    setCompOn(preset.compOn);
    setEqLow(preset.eqLow);
    setEqMid(preset.eqMid);
    setEqHigh(preset.eqHigh);
    setReverbOn(preset.reverbOn);
    setReverbMix(preset.reverbMix);
  }

  return (
    <CaptureShell
      controls={capture}
      enableLabel="Enable drum input"
      intro={
        <>
          Feed your electronic kit&rsquo;s stereo output into the interface. The
          module keeps making its own sounds — this just adds a little bus
          compression, EQ and room before it mixes in with the decks.
        </>
      }
    >
      <MixControls
        level={level}
        pan={pan}
        levelDefault={0.8}
        onLevel={setLevel}
        onPan={setPan}
      />

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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCompOn((v) => !v)}
          className={`w-16 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
            compOn
              ? "border-foreground bg-foreground text-background"
              : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          }`}
        >
          Comp
        </button>
        <span className="flex-1 text-[10px] text-black/40 dark:text-white/40">
          Glues the kit together and levels dynamics
        </span>
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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setReverbOn((v) => !v)}
          className={`w-16 shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
            reverbOn
              ? "border-foreground bg-foreground text-background"
              : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          }`}
        >
          Room
        </button>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.01}
          value={reverbMix}
          disabled={!reverbOn}
          onChange={(e) => setReverbMix(Number(e.target.value))}
          className="flex-1 accent-foreground disabled:opacity-30"
        />
      </div>
    </CaptureShell>
  );
}
