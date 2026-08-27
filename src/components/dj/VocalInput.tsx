"use client";

import { useEffect, useRef, useState } from "react";
import {
  connectOutputBus,
  DELAY_DIVISIONS,
  getImpulseResponse,
  makeDriveCurve,
} from "./audioEngine";
import { CaptureShell } from "./CaptureShell";
import { FxToggle, MiniSlider, MixControls } from "./controls";
import { useLiveCapture } from "./useLiveCapture";

// A vocal mic run through a broadcast-style chain — highpass, gate, compressor,
// static de-esser, 3-band EQ, optional lo-fi grit — then parallel doubler,
// tempo-synced delay and reverb sends, mixed into the decks.

type Chain = {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  inputTrim: GainNode;
  gateAnalyser: AnalyserNode;
  gateGain: GainNode;
  comp: DynamicsCompressorNode;
  compMakeup: GainNode;
  highpass: BiquadFilterNode;
  deEss: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  shaper: WaveShaperNode;
  coreOut: GainNode;
  dryGain: GainNode;
  doubleDelayA: DelayNode;
  doubleLfoA: OscillatorNode;
  doubleDepthA: GainNode;
  doubleDelayB: DelayNode;
  doubleLfoB: OscillatorNode;
  doubleDepthB: GainNode;
  doubleWet: GainNode;
  delay: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  reverbConvolver: ConvolverNode;
  reverbWet: GainNode;
  master: GainNode;
  panner: StereoPannerNode;
  limiter: WaveShaperNode;
};

type Preset = {
  name: string;
  gateOn: boolean;
  gateThreshold: number;
  compOn: boolean;
  deEssOn: boolean;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  driveOn: boolean;
  drive: number;
  doubleOn: boolean;
  doubleMix: number;
  delayOn: boolean;
  delayMix: number;
  delayDivision: number;
  delayFeedback: number;
  reverbOn: boolean;
  reverbMix: number;
};

const PRESETS: Preset[] = [
  {
    name: "Podcast",
    gateOn: true, gateThreshold: -46, compOn: true, deEssOn: true,
    eqLow: -1, eqMid: 1, eqHigh: 1, driveOn: false, drive: 0.4,
    doubleOn: false, doubleMix: 0.3,
    delayOn: false, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.2,
    reverbOn: true, reverbMix: 0.05,
  },
  {
    name: "Radio",
    gateOn: false, gateThreshold: -50, compOn: true, deEssOn: true,
    eqLow: -2, eqMid: 0, eqHigh: 3, driveOn: false, drive: 0.4,
    doubleOn: false, doubleMix: 0.3,
    delayOn: false, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.2,
    reverbOn: true, reverbMix: 0.1,
  },
  {
    name: "Rap Vocal",
    gateOn: true, gateThreshold: -44, compOn: true, deEssOn: true,
    eqLow: 0, eqMid: -1, eqHigh: 2, driveOn: false, drive: 0.4,
    doubleOn: false, doubleMix: 0.3,
    delayOn: true, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.18,
    reverbOn: true, reverbMix: 0.14,
  },
  {
    name: "Karaoke",
    gateOn: false, gateThreshold: -50, compOn: true, deEssOn: false,
    eqLow: 0, eqMid: 0, eqHigh: 1, driveOn: false, drive: 0.4,
    doubleOn: true, doubleMix: 0.3,
    delayOn: true, delayMix: 0.14, delayDivision: 1, delayFeedback: 0.28,
    reverbOn: true, reverbMix: 0.4,
  },
  {
    name: "Dreamy",
    gateOn: false, gateThreshold: -50, compOn: true, deEssOn: true,
    eqLow: -1, eqMid: 0, eqHigh: 2, driveOn: false, drive: 0.4,
    doubleOn: true, doubleMix: 0.35,
    delayOn: true, delayMix: 0.3, delayDivision: 2, delayFeedback: 0.42,
    reverbOn: true, reverbMix: 0.52,
  },
  {
    name: "Megaphone",
    gateOn: true, gateThreshold: -44, compOn: true, deEssOn: false,
    eqLow: -14, eqMid: 6, eqHigh: -8, driveOn: true, drive: 0.55,
    doubleOn: false, doubleMix: 0.3,
    delayOn: false, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.2,
    reverbOn: true, reverbMix: 0.05,
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

export function VocalInput({
  audioCtx,
  ensureAudioContext,
  activeDeckBpm,
  onStatusChange,
}: {
  audioCtx: AudioContext | null;
  ensureAudioContext: () => AudioContext;
  activeDeckBpm: number | null;
  onStatusChange?: (s: { enabled: boolean; latencyMs: number | null }) => void;
}) {
  const [level, setLevel] = useState(1);
  const [gateOn, setGateOn] = useState(false);
  const [gateThreshold, setGateThreshold] = useState(-48);
  const [compOn, setCompOn] = useState(true);
  const [deEssOn, setDeEssOn] = useState(true);
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);
  const [driveOn, setDriveOn] = useState(false);
  const [drive, setDrive] = useState(0.4);
  const [doubleOn, setDoubleOn] = useState(false);
  const [doubleMix, setDoubleMix] = useState(0.3);
  const [delayOn, setDelayOn] = useState(false);
  const [delayMix, setDelayMix] = useState(0.2);
  const [delayDivision, setDelayDivision] = useState(3);
  const [delayFreeMs, setDelayFreeMs] = useState(280);
  const [delayFeedback, setDelayFeedback] = useState(0.25);
  const [reverbOn, setReverbOn] = useState(true);
  const [reverbMix, setReverbMix] = useState(0.14);
  const [pan, setPan] = useState(0);

  const chainRef = useRef<Chain | null>(null);
  const rafRef = useRef<number | null>(null);
  const gateOnRef = useRef(gateOn);
  const gateThresholdRef = useRef(gateThreshold);
  useEffect(() => {
    gateOnRef.current = gateOn;
  }, [gateOn]);
  useEffect(() => {
    gateThresholdRef.current = gateThreshold;
  }, [gateThreshold]);

  function build(ctx: AudioContext, stream: MediaStream): Chain {
    const source = ctx.createMediaStreamSource(stream);
    const inputTrim = ctx.createGain();
    // Sum to mono so a mic on interface channel 2 isn't stuck in one ear.
    inputTrim.channelCount = 1;
    inputTrim.channelCountMode = "explicit";
    inputTrim.channelInterpretation = "speakers";

    const gateAnalyser = ctx.createAnalyser();
    gateAnalyser.fftSize = 1024;
    const gateGain = ctx.createGain();

    const comp = ctx.createDynamicsCompressor();
    const compMakeup = ctx.createGain();

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 90;
    highpass.Q.value = 0.7;

    const deEss = ctx.createBiquadFilter();
    deEss.type = "peaking";
    deEss.frequency.value = 6500;
    deEss.Q.value = 2.2;
    deEss.gain.value = 0;

    const eqLowNode = ctx.createBiquadFilter();
    eqLowNode.type = "lowshelf";
    eqLowNode.frequency.value = 200;
    const eqMidNode = ctx.createBiquadFilter();
    eqMidNode.type = "peaking";
    eqMidNode.frequency.value = 1400;
    eqMidNode.Q.value = 0.8;
    const eqHighNode = ctx.createBiquadFilter();
    eqHighNode.type = "highshelf";
    eqHighNode.frequency.value = 4200;

    const shaper = ctx.createWaveShaper();
    shaper.oversample = "2x";

    const coreOut = ctx.createGain();
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1;

    // Doubler: two slowly-wandering short delays summed in parallel — a cheap
    // thickening/ADT effect without pitch shifting.
    const doubleDelayA = ctx.createDelay(0.05);
    doubleDelayA.delayTime.value = 0.011;
    const doubleLfoA = ctx.createOscillator();
    doubleLfoA.frequency.value = 0.13;
    const doubleDepthA = ctx.createGain();
    doubleDepthA.gain.value = 0.0016;
    doubleLfoA.connect(doubleDepthA).connect(doubleDelayA.delayTime);
    doubleLfoA.start();
    const doubleDelayB = ctx.createDelay(0.05);
    doubleDelayB.delayTime.value = 0.023;
    const doubleLfoB = ctx.createOscillator();
    doubleLfoB.frequency.value = 0.09;
    const doubleDepthB = ctx.createGain();
    doubleDepthB.gain.value = 0.002;
    doubleLfoB.connect(doubleDepthB).connect(doubleDelayB.delayTime);
    doubleLfoB.start();
    const doubleWet = ctx.createGain();
    doubleWet.gain.value = 0;

    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.28;
    const delayFeedbackNode = ctx.createGain();
    delayFeedbackNode.gain.value = delayFeedback;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0;

    const reverbConvolver = ctx.createConvolver();
    reverbConvolver.buffer = getImpulseResponse(ctx);
    const reverbWet = ctx.createGain();
    reverbWet.gain.value = 0;

    const { input: master, panner, limiter } = connectOutputBus(ctx, level);

    source.connect(inputTrim);
    inputTrim.connect(gateAnalyser);
    inputTrim.connect(gateGain);
    gateGain.connect(comp).connect(compMakeup);
    compMakeup
      .connect(highpass)
      .connect(deEss)
      .connect(eqLowNode)
      .connect(eqMidNode)
      .connect(eqHighNode)
      .connect(shaper)
      .connect(coreOut);

    coreOut.connect(dryGain).connect(master);
    coreOut.connect(doubleDelayA).connect(doubleWet);
    coreOut.connect(doubleDelayB).connect(doubleWet);
    doubleWet.connect(master);
    coreOut.connect(delay);
    delay.connect(delayFeedbackNode).connect(delay);
    delay.connect(delayWet).connect(master);
    coreOut.connect(reverbConvolver).connect(reverbWet).connect(master);

    return {
      stream, source, inputTrim, gateAnalyser, gateGain, comp, compMakeup,
      highpass, deEss, eqLow: eqLowNode, eqMid: eqMidNode, eqHigh: eqHighNode,
      shaper, coreOut, dryGain,
      doubleDelayA, doubleLfoA, doubleDepthA,
      doubleDelayB, doubleLfoB, doubleDepthB, doubleWet,
      delay, delayFeedback: delayFeedbackNode, delayWet,
      reverbConvolver, reverbWet, master, panner, limiter,
    };
  }

  function teardownChain(chain: Chain) {
    for (const osc of [chain.doubleLfoA, chain.doubleLfoB]) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    const nodes: AudioNode[] = [
      chain.source, chain.inputTrim, chain.gateAnalyser, chain.gateGain,
      chain.comp, chain.compMakeup, chain.highpass, chain.deEss,
      chain.eqLow, chain.eqMid, chain.eqHigh, chain.shaper, chain.coreOut,
      chain.dryGain, chain.doubleDelayA, chain.doubleLfoA, chain.doubleDepthA,
      chain.doubleDelayB, chain.doubleLfoB, chain.doubleDepthB, chain.doubleWet,
      chain.delay, chain.delayFeedback, chain.delayWet, chain.reverbConvolver,
      chain.reverbWet, chain.master, chain.panner, chain.limiter,
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
  });
  const enabled = capture.enabled;

  useEffect(() => {
    onStatusChange?.({
      enabled: capture.enabled,
      latencyMs: capture.latencyMs,
    });
  }, [capture.enabled, capture.latencyMs, onStatusChange]);

  // Noise-gate rAF loop — runs only while the mic is live.
  useEffect(() => {
    if (!capture.enabled || !audioCtx) return;
    const ctx = audioCtx;
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
        open ? 0.008 : 0.08,
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [capture.enabled, audioCtx]);

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
      c.threshold.value = -22;
      c.knee.value = 26;
      c.ratio.value = 4.5;
      c.attack.value = 0.004;
      c.release.value = 0.22;
      // Generous makeup so a mic sits up against a mastered track.
      chain.compMakeup.gain.value = 2.8;
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
    chain.deEss.gain.setTargetAtTime(
      deEssOn ? -7 : 0,
      audioCtx.currentTime,
      0.02,
    );
  }, [deEssOn, audioCtx, enabled]);

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
    chain.shaper.curve = driveOn ? makeDriveCurve(drive, "punk") : null;
  }, [driveOn, drive, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.doubleWet.gain.value = doubleOn ? doubleMix : 0;
  }, [doubleOn, doubleMix, enabled]);

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
    activeDeckBpm, audioCtx, chainRef,
  ]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain) return;
    chain.reverbWet.gain.value = reverbOn ? reverbMix : 0;
  }, [reverbOn, reverbMix, enabled]);

  function applyPreset(preset: Preset) {
    setGateOn(preset.gateOn);
    setGateThreshold(preset.gateThreshold);
    setCompOn(preset.compOn);
    setDeEssOn(preset.deEssOn);
    setEqLow(preset.eqLow);
    setEqMid(preset.eqMid);
    setEqHigh(preset.eqHigh);
    setDriveOn(preset.driveOn);
    setDrive(preset.drive);
    setDoubleOn(preset.doubleOn);
    setDoubleMix(preset.doubleMix);
    setDelayOn(preset.delayOn);
    setDelayMix(preset.delayMix);
    setDelayDivision(preset.delayDivision);
    setDelayFeedback(preset.delayFeedback);
    setReverbOn(preset.reverbOn);
    setReverbMix(preset.reverbMix);
  }

  const freeTime = DELAY_DIVISIONS[delayDivision].beats === 0;

  return (
    <CaptureShell
      controls={capture}
      enableLabel="Enable vocal input"
      intro={
        <>
          Sing or rap over the decks through a broadcast-style chain. Use
          headphones — an open mic into speakers will feed back. Delay locks to
          the playing deck&rsquo;s BPM.
        </>
      }
    >
      <MixControls
        level={level}
        pan={pan}
        levelDefault={1}
        levelMax={2.5}
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
          <button
            type="button"
            onClick={() => setDeEssOn((v) => !v)}
            className={fxBtn(deEssOn)}
          >
            De-ess
          </button>
          <span className="flex-1 text-right text-[10px] text-black/40 dark:text-white/40">
            level &amp; sibilance control
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDriveOn((v) => !v)}
            className={fxBtn(driveOn)}
          >
            Lo-Fi
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={drive}
            disabled={!driveOn}
            onChange={(e) => setDrive(Number(e.target.value))}
            className="flex-1 accent-foreground disabled:opacity-30"
          />
          <span className="w-16 shrink-0 text-right text-[10px] text-black/40 dark:text-white/40">
            megaphone grit
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

        <FxToggle
          label="Double"
          on={doubleOn}
          onToggle={() => setDoubleOn((v) => !v)}
          mix={doubleMix}
          onMixChange={setDoubleMix}
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
    </CaptureShell>
  );
}
