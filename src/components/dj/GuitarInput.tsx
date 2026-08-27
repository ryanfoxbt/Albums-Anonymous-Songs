"use client";

import { useEffect, useRef, useState } from "react";
import {
  connectOutputBus,
  DELAY_DIVISIONS,
  detectPitch,
  getCabinetImpulse,
  getImpulseResponse,
  makeDriveCurve,
  type DistModel,
} from "./audioEngine";
import { CaptureShell } from "./CaptureShell";
import { FxToggle, MiniSlider, MixControls } from "./controls";
import { type LiveStatus, useLiveCapture } from "./useLiveCapture";

// A guitar (or any line input) run through a small pedalboard of native Web
// Audio nodes, mixed into the same AudioContext the decks use so it blends
// with whatever is playing.

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
  driveMid: BiquadFilterNode;
  drivePresence: BiquadFilterNode;
  tone: BiquadFilterNode;
  cabConvolver: ConvolverNode;
  cabWet: GainNode;
  cabDry: GainNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  coreOut: GainNode;
  tremoloGain: GainNode;
  tremoloLfo: OscillatorNode;
  tremoloDepth: GainNode;
  ampGain: GainNode;
  chorusDelay: DelayNode;
  chorusLfo: OscillatorNode;
  chorusDepth: GainNode;
  chorusWet: GainNode;
  phaserAllpass: BiquadFilterNode[];
  phaserLfo: OscillatorNode;
  phaserDepth: GainNode;
  phaserWet: GainNode;
  wahFilter: BiquadFilterNode;
  wahWet: GainNode;
  delay: DelayNode;
  delayFeedback: GainNode;
  delayWet: GainNode;
  reverbConvolver: ConvolverNode;
  reverbWet: GainNode;
  octaveOsc: OscillatorNode;
  octaveTone: BiquadFilterNode;
  octaveVoiceGain: GainNode;
  master: GainNode;
  panner: StereoPannerNode;
  limiter: WaveShaperNode;
};

type Preset = {
  name: string;
  gateOn: boolean;
  compOn: boolean;
  driveOn: boolean;
  drive: number;
  distModel: DistModel;
  tone: number;
  cabOn: boolean;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  chorusOn: boolean;
  chorusMix: number;
  tremoloOn: boolean;
  tremoloRate: number;
  tremoloDepth: number;
  phaserOn: boolean;
  phaserRate: number;
  phaserMix: number;
  wahOn: boolean;
  wahAmount: number;
  octaveOn: boolean;
  octaveLevel: number;
  delayOn: boolean;
  delayMix: number;
  delayDivision: number;
  delayFeedback: number;
  reverbOn: boolean;
  reverbMix: number;
};

// Modulation defaults shared by the presets that don't lean on them, so each
// preset object only has to spell out the effects it actually changes.
const MOD_OFF = {
  tremoloOn: false, tremoloRate: 4, tremoloDepth: 0.6,
  phaserOn: false, phaserRate: 0.5, phaserMix: 0.4,
  wahOn: false, wahAmount: 0.6,
  octaveOn: false, octaveLevel: 0.7,
} as const;

const PRESETS: Preset[] = [
  {
    // Fully dry — no time-based effects — so it's the honest baseline for
    // checking that the live-input sync lines up.
    name: "Clean DI",
    gateOn: false, compOn: true, driveOn: false, drive: 0.15,
    distModel: "overdrive", tone: 0.7,
    cabOn: false, eqLow: 0, eqMid: 0, eqHigh: 1,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF,
    delayOn: false, delayMix: 0.2, delayDivision: 3, delayFeedback: 0.3,
    reverbOn: false, reverbMix: 0.16,
  },
  {
    name: "Crunch",
    gateOn: true, compOn: true, driveOn: true, drive: 0.4,
    distModel: "overdrive", tone: 0.55,
    cabOn: true, eqLow: 2, eqMid: -1, eqHigh: 1,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF,
    delayOn: true, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.3,
    reverbOn: true, reverbMix: 0.2,
  },
  {
    name: "Ambient Lead",
    gateOn: false, compOn: true, driveOn: true, drive: 0.55,
    distModel: "overdrive", tone: 0.5,
    cabOn: true, eqLow: 1, eqMid: 2, eqHigh: 3,
    chorusOn: true, chorusMix: 0.35,
    ...MOD_OFF,
    delayOn: true, delayMix: 0.3, delayDivision: 2, delayFeedback: 0.42,
    reverbOn: true, reverbMix: 0.4,
  },
  {
    name: "Maiden Lead",
    gateOn: true, compOn: true, driveOn: true, drive: 0.62,
    distModel: "maiden", tone: 0.62,
    cabOn: true, eqLow: 0, eqMid: 2, eqHigh: 2,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF,
    delayOn: true, delayMix: 0.22, delayDivision: 2, delayFeedback: 0.38,
    reverbOn: true, reverbMix: 0.22,
  },
  {
    name: "90s Punk",
    gateOn: true, compOn: true, driveOn: true, drive: 0.72,
    distModel: "punk", tone: 0.7,
    cabOn: true, eqLow: 2, eqMid: -3, eqHigh: 2,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF,
    delayOn: false, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.25,
    reverbOn: true, reverbMix: 0.12,
  },
  {
    name: "Funk Wah",
    gateOn: true, compOn: true, driveOn: true, drive: 0.25,
    distModel: "overdrive", tone: 0.6,
    cabOn: true, eqLow: -1, eqMid: 2, eqHigh: 1,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF, wahOn: true, wahAmount: 0.72,
    delayOn: false, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.28,
    reverbOn: false, reverbMix: 0.12,
  },
  {
    name: "Surf Tremolo",
    gateOn: false, compOn: true, driveOn: false, drive: 0.15,
    distModel: "overdrive", tone: 0.78,
    cabOn: false, eqLow: 1, eqMid: -1, eqHigh: 2,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF, tremoloOn: true, tremoloRate: 5.5, tremoloDepth: 0.85,
    delayOn: true, delayMix: 0.18, delayDivision: 3, delayFeedback: 0.24,
    reverbOn: true, reverbMix: 0.44,
  },
  {
    name: "Shimmer Phaser",
    gateOn: false, compOn: true, driveOn: true, drive: 0.35,
    distModel: "overdrive", tone: 0.55,
    cabOn: true, eqLow: 0, eqMid: 1, eqHigh: 2,
    chorusOn: true, chorusMix: 0.3,
    ...MOD_OFF, phaserOn: true, phaserRate: 0.35, phaserMix: 0.5,
    delayOn: true, delayMix: 0.26, delayDivision: 2, delayFeedback: 0.4,
    reverbOn: true, reverbMix: 0.36,
  },
  {
    name: "Doom Riff",
    gateOn: true, compOn: true, driveOn: true, drive: 0.85,
    distModel: "fuzz", tone: 0.4,
    cabOn: true, eqLow: 4, eqMid: -2, eqHigh: 0,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF,
    delayOn: false, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.3,
    reverbOn: true, reverbMix: 0.22,
  },
  {
    name: "Sub Bass",
    gateOn: true, compOn: true, driveOn: false, drive: 0.2,
    distModel: "overdrive", tone: 0.4,
    cabOn: false, eqLow: 3, eqMid: 0, eqHigh: -2,
    chorusOn: false, chorusMix: 0.25,
    ...MOD_OFF, octaveOn: true, octaveLevel: 0.85,
    delayOn: false, delayMix: 0.16, delayDivision: 3, delayFeedback: 0.25,
    reverbOn: false, reverbMix: 0.1,
  },
];

const DIST_MODELS: { id: DistModel; label: string }[] = [
  { id: "overdrive", label: "Overdrive" },
  { id: "maiden", label: "Iron Maiden" },
  { id: "punk", label: "90s Punk" },
  { id: "fuzz", label: "Fuzz" },
];

// Per-model input tightening + post-clip voicing (mid + presence peaking EQ),
// applied to the drive stage only while the amp is engaged.
const VOICINGS: Record<
  DistModel,
  {
    highpass: number;
    mid: { freq: number; gain: number; q: number };
    presence: { freq: number; gain: number; q: number };
  }
> = {
  overdrive: {
    highpass: 85,
    mid: { freq: 800, gain: 0, q: 1 },
    presence: { freq: 4000, gain: 0, q: 1 },
  },
  maiden: {
    highpass: 120,
    mid: { freq: 3000, gain: 6, q: 1.1 },
    presence: { freq: 5200, gain: 3, q: 1.4 },
  },
  punk: {
    highpass: 100,
    mid: { freq: 600, gain: -7, q: 0.9 },
    presence: { freq: 3800, gain: 5, q: 1.2 },
  },
  fuzz: {
    highpass: 70,
    mid: { freq: 1200, gain: 3, q: 0.8 },
    presence: { freq: 3000, gain: -2, q: 1 },
  },
};

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

export function GuitarInput({
  audioCtx,
  ensureAudioContext,
  activeDeckBpm,
  onStatusChange,
}: {
  audioCtx: AudioContext | null;
  ensureAudioContext: () => AudioContext;
  activeDeckBpm: number | null;
  onStatusChange?: (s: LiveStatus) => void;
}) {
  const [pedalsOpen, setPedalsOpen] = useState(false);

  const [level, setLevel] = useState(1);
  const [pan, setPan] = useState(0);
  const [ampOn, setAmpOn] = useState(true);
  const [gateOn, setGateOn] = useState(false);
  const [gateThreshold, setGateThreshold] = useState(-55);
  const [compOn, setCompOn] = useState(true);
  const [driveOn, setDriveOn] = useState(false);
  const [drive, setDrive] = useState(0.3);
  const [distModel, setDistModel] = useState<DistModel>("overdrive");
  const [tone, setTone] = useState(0.6);
  const [cabOn, setCabOn] = useState(false);
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);
  const [chorusOn, setChorusOn] = useState(false);
  const [chorusMix, setChorusMix] = useState(0.3);
  const [tremoloOn, setTremoloOn] = useState(false);
  const [tremoloRate, setTremoloRate] = useState(4);
  const [tremoloDepth, setTremoloDepth] = useState(0.6);
  const [phaserOn, setPhaserOn] = useState(false);
  const [phaserRate, setPhaserRate] = useState(0.5);
  const [phaserMix, setPhaserMix] = useState(0.4);
  const [wahOn, setWahOn] = useState(false);
  const [wahAmount, setWahAmount] = useState(0.6);
  const [octaveOn, setOctaveOn] = useState(false);
  const [octaveLevel, setOctaveLevel] = useState(0.7);
  const [delayOn, setDelayOn] = useState(false);
  const [delayMix, setDelayMix] = useState(0.25);
  const [delayDivision, setDelayDivision] = useState(3);
  const [delayFreeMs, setDelayFreeMs] = useState(300);
  const [delayFeedback, setDelayFeedback] = useState(0.35);
  const [reverbOn, setReverbOn] = useState(false);
  const [reverbMix, setReverbMix] = useState(0.25);

  const chainRef = useRef<Chain | null>(null);
  const rafRef = useRef<number | null>(null);
  // Mirrored into refs so the gate's rAF loop reads the latest values without
  // being torn down and restarted on every tweak.
  const gateOnRef = useRef(gateOn);
  const gateThresholdRef = useRef(gateThreshold);
  const wahOnRef = useRef(wahOn);
  const wahAmountRef = useRef(wahAmount);
  const octaveOnRef = useRef(octaveOn);
  const octaveLevelRef = useRef(octaveLevel);
  useEffect(() => {
    gateOnRef.current = gateOn;
  }, [gateOn]);
  useEffect(() => {
    gateThresholdRef.current = gateThreshold;
  }, [gateThreshold]);
  useEffect(() => {
    wahOnRef.current = wahOn;
  }, [wahOn]);
  useEffect(() => {
    wahAmountRef.current = wahAmount;
  }, [wahAmount]);
  useEffect(() => {
    octaveOnRef.current = octaveOn;
  }, [octaveOn]);
  useEffect(() => {
    octaveLevelRef.current = octaveLevel;
  }, [octaveLevel]);

  function build(ctx: AudioContext, stream: MediaStream): Chain {
    const source = ctx.createMediaStreamSource(stream);
    const inputTrim = ctx.createGain();
    // Interfaces often hand us a 2-channel stream with the guitar on channel 1
    // only — force a mono sum here so it lands centred, not just in the left ear.
    inputTrim.channelCount = 1;
    inputTrim.channelCountMode = "explicit";
    inputTrim.channelInterpretation = "speakers";

    const gateAnalyser = ctx.createAnalyser();
    // 2048 gives the octave pitch tracker enough low-note periods to lock onto.
    gateAnalyser.fftSize = 2048;
    const gateGain = ctx.createGain();

    const compressor = ctx.createDynamicsCompressor();
    const compMakeup = ctx.createGain();

    const preHighpass = ctx.createBiquadFilter();
    preHighpass.type = "highpass";
    preHighpass.frequency.value = 85;
    const shaper = ctx.createWaveShaper();
    // "none" until drive is engaged — oversampling adds a little latency, and
    // there's nothing to alias while the curve is null.
    shaper.oversample = "none";
    const driveMid = ctx.createBiquadFilter();
    driveMid.type = "peaking";
    driveMid.frequency.value = 800;
    driveMid.Q.value = 1;
    driveMid.gain.value = 0;
    const drivePresence = ctx.createBiquadFilter();
    drivePresence.type = "peaking";
    drivePresence.frequency.value = 4000;
    drivePresence.Q.value = 1;
    drivePresence.gain.value = 0;
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
    const { input: master, panner, limiter } = connectOutputBus(ctx, level);
    const ampGain = ctx.createGain();
    ampGain.gain.value = ampOn ? 1 : 0;

    // Tremolo: an LFO added onto a unity gain stage in the dry amp path.
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = 1;
    const tremoloLfo = ctx.createOscillator();
    tremoloLfo.type = "sine";
    tremoloLfo.frequency.value = tremoloRate;
    const tremoloDepthGain = ctx.createGain();
    tremoloDepthGain.gain.value = 0;
    tremoloLfo.connect(tremoloDepthGain).connect(tremoloGain.gain);
    tremoloLfo.start();

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

    // Phaser: four cascaded allpass stages swept by a shared LFO.
    const phaserAllpass: BiquadFilterNode[] = [];
    for (let i = 0; i < 4; i++) {
      const ap = ctx.createBiquadFilter();
      ap.type = "allpass";
      ap.frequency.value = 800;
      ap.Q.value = 1.2;
      phaserAllpass.push(ap);
    }
    const phaserLfo = ctx.createOscillator();
    phaserLfo.type = "sine";
    phaserLfo.frequency.value = phaserRate;
    const phaserDepth = ctx.createGain();
    phaserDepth.gain.value = 640;
    phaserLfo.connect(phaserDepth);
    for (const ap of phaserAllpass) phaserDepth.connect(ap.frequency);
    phaserLfo.start();
    const phaserWet = ctx.createGain();
    phaserWet.gain.value = 0;

    // Auto-wah: an envelope-driven bandpass (swept in the gate rAF loop).
    const wahFilter = ctx.createBiquadFilter();
    wahFilter.type = "bandpass";
    wahFilter.frequency.value = 400;
    wahFilter.Q.value = 6;
    const wahWet = ctx.createGain();
    wahWet.gain.value = 0;

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

    // Sub-octave voice: a filtered saw oscillator retuned an octave below the
    // detected fundamental, gated by the input envelope in the gate rAF loop.
    const octaveOsc = ctx.createOscillator();
    octaveOsc.type = "sawtooth";
    octaveOsc.frequency.value = 80;
    const octaveTone = ctx.createBiquadFilter();
    octaveTone.type = "lowpass";
    octaveTone.frequency.value = 1800;
    octaveTone.Q.value = 0.7;
    const octaveVoiceGain = ctx.createGain();
    octaveVoiceGain.gain.value = 0;
    octaveOsc.start();

    // Series core: input → gate → comp → amp/cab → EQ → coreOut.
    source.connect(inputTrim);
    inputTrim.connect(gateAnalyser);
    inputTrim.connect(gateGain);
    gateGain.connect(compressor).connect(compMakeup);
    compMakeup
      .connect(preHighpass)
      .connect(shaper)
      .connect(driveMid)
      .connect(drivePresence)
      .connect(tone);
    tone.connect(cabConvolver).connect(cabWet);
    tone.connect(cabDry);
    cabWet.connect(eqLowNode);
    cabDry.connect(eqLowNode);
    eqLowNode.connect(eqMidNode).connect(eqHighNode).connect(coreOut);

    // coreOut → tremolo'd dry amp path + parallel modulation/time sends → master.
    coreOut.connect(tremoloGain).connect(ampGain).connect(master);
    coreOut.connect(chorusDelay).connect(chorusWet).connect(master);
    let phaserStage: AudioNode = coreOut;
    for (const ap of phaserAllpass) phaserStage = phaserStage.connect(ap);
    phaserStage.connect(phaserWet).connect(master);
    coreOut.connect(wahFilter).connect(wahWet).connect(master);
    coreOut.connect(delay);
    delay.connect(delayFeedbackNode).connect(delay);
    delay.connect(delayWet).connect(master);
    coreOut.connect(reverbConvolver).connect(reverbWet).connect(master);
    octaveOsc.connect(octaveTone).connect(octaveVoiceGain).connect(master);

    getCabinetImpulse(ctx)
      .then((buf) => {
        cabConvolver.buffer = buf;
      })
      .catch(() => {
        // Cab is optional colour; the chain still passes audio without it.
      });

    return {
      stream, source, inputTrim, gateAnalyser, gateGain, compressor, compMakeup,
      preHighpass, shaper, driveMid, drivePresence, tone,
      cabConvolver, cabWet, cabDry,
      eqLow: eqLowNode, eqMid: eqMidNode, eqHigh: eqHighNode, coreOut,
      tremoloGain, tremoloLfo, tremoloDepth: tremoloDepthGain, ampGain,
      chorusDelay, chorusLfo, chorusDepth, chorusWet,
      phaserAllpass, phaserLfo, phaserDepth, phaserWet, wahFilter, wahWet, delay,
      delayFeedback: delayFeedbackNode, delayWet, reverbConvolver, reverbWet,
      octaveOsc, octaveTone, octaveVoiceGain, master, panner, limiter,
    };
  }

  function teardownChain(chain: Chain) {
    for (const osc of [
      chain.chorusLfo, chain.tremoloLfo, chain.phaserLfo, chain.octaveOsc,
    ]) {
      try {
        osc.stop();
      } catch {
        // already stopped
      }
    }
    const nodes: AudioNode[] = [
      chain.source, chain.inputTrim, chain.gateAnalyser, chain.gateGain,
      chain.compressor, chain.compMakeup, chain.preHighpass, chain.shaper,
      chain.driveMid, chain.drivePresence,
      chain.tone, chain.cabConvolver, chain.cabWet, chain.cabDry, chain.eqLow,
      chain.eqMid, chain.eqHigh, chain.coreOut, chain.tremoloGain,
      chain.tremoloLfo, chain.tremoloDepth, chain.ampGain, chain.chorusDelay,
      chain.chorusDepth, chain.chorusWet, chain.phaserLfo, chain.phaserDepth,
      chain.phaserWet, ...chain.phaserAllpass, chain.wahFilter, chain.wahWet,
      chain.delay, chain.delayFeedback, chain.delayWet, chain.reverbConvolver,
      chain.reverbWet, chain.octaveOsc, chain.octaveTone, chain.octaveVoiceGain,
      chain.master, chain.panner, chain.limiter,
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
  // Re-run the parameter-sync effects once the chain exists.
  const enabled = capture.enabled;

  useEffect(() => {
    onStatusChange?.({
      enabled: capture.enabled,
      latencyMs: capture.latencyMs,
      recommendedSyncMs: capture.recommendedSyncMs,
    });
  }, [
    capture.enabled,
    capture.latencyMs,
    capture.recommendedSyncMs,
    onStatusChange,
  ]);

  // Gate / auto-wah / octave rAF loop — runs only while the input is live.
  useEffect(() => {
    if (!capture.enabled || !audioCtx) return;
    const ctx = audioCtx;
    const fftSize = chainRef.current?.gateAnalyser.fftSize ?? 2048;
    const buffer = new Float32Array(fftSize);
    // Gate + envelope followers read only the most recent ~1024 samples so they
    // stay responsive; pitch detection gets the full window.
    const envWindow = Math.min(1024, fftSize);
    const tick = () => {
      const chain = chainRef.current;
      if (!chain) return;
      chain.gateAnalyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = fftSize - envWindow; i < fftSize; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / envWindow);
      const db = 20 * Math.log10(rms || 1e-8);
      const open = !gateOnRef.current || db > gateThresholdRef.current;
      chain.gateGain.gain.setTargetAtTime(
        open ? 1 : 0,
        ctx.currentTime,
        open ? 0.005 : 0.06,
      );

      if (wahOnRef.current) {
        const amount = wahAmountRef.current;
        const env = Math.min(1, rms * (6 + amount * 10));
        const target = 320 + env * (500 + amount * 2600);
        chain.wahFilter.frequency.setTargetAtTime(target, ctx.currentTime, 0.03);
      }

      if (octaveOnRef.current) {
        const f0 = detectPitch(buffer, ctx.sampleRate, 70, 900);
        if (f0) {
          chain.octaveOsc.frequency.setTargetAtTime(
            Math.max(38, f0 / 2),
            ctx.currentTime,
            0.012,
          );
        }
        const env = Math.min(1, rms * 4);
        chain.octaveVoiceGain.gain.setTargetAtTime(
          env * octaveLevelRef.current,
          ctx.currentTime,
          0.02,
        );
      } else {
        chain.octaveVoiceGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [capture.enabled, audioCtx]);

  // --- Parameter updates: mirror React state onto the live nodes. ---
  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.master.gain.setTargetAtTime(level, now, 0.02);
    chain.panner.pan.setTargetAtTime(pan, now, 0.02);
    chain.ampGain.gain.setTargetAtTime(ampOn ? 1 : 0, now, 0.02);
  }, [level, pan, ampOn, audioCtx, enabled]);

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
      // Generous makeup — a compressed guitar sits well below a mastered track.
      chain.compMakeup.gain.value = 2.6;
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
    chain.shaper.curve = driveOn ? makeDriveCurve(drive, distModel) : null;
    chain.shaper.oversample = driveOn ? "2x" : "none";
    const voicing = VOICINGS[distModel];
    chain.preHighpass.frequency.value = driveOn ? voicing.highpass : 85;
    chain.driveMid.frequency.value = voicing.mid.freq;
    chain.driveMid.Q.value = voicing.mid.q;
    chain.driveMid.gain.value = driveOn ? voicing.mid.gain : 0;
    chain.drivePresence.frequency.value = voicing.presence.freq;
    chain.drivePresence.Q.value = voicing.presence.q;
    chain.drivePresence.gain.value = driveOn ? voicing.presence.gain : 0;
    chain.tone.frequency.value = driveOn ? 1400 + tone * 6000 : 20000;
  }, [driveOn, drive, tone, distModel, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.cabWet.gain.setTargetAtTime(cabOn ? 1 : 0, now, 0.02);
    chain.cabDry.gain.setTargetAtTime(cabOn ? 0 : 1, now, 0.02);
  }, [cabOn, audioCtx, enabled]);

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
    chain.chorusWet.gain.value = chorusOn ? chorusMix : 0;
  }, [chorusOn, chorusMix, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    const depth = tremoloOn ? tremoloDepth : 0;
    chain.tremoloLfo.frequency.setTargetAtTime(tremoloRate, now, 0.02);
    chain.tremoloDepth.gain.setTargetAtTime(depth / 2, now, 0.02);
    chain.tremoloGain.gain.setTargetAtTime(1 - depth / 2, now, 0.02);
  }, [tremoloOn, tremoloRate, tremoloDepth, audioCtx, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    const now = audioCtx.currentTime;
    chain.phaserLfo.frequency.setTargetAtTime(phaserRate, now, 0.02);
    chain.phaserWet.gain.setTargetAtTime(phaserOn ? phaserMix : 0, now, 0.02);
  }, [phaserOn, phaserRate, phaserMix, audioCtx, enabled]);

  useEffect(() => {
    const chain = chainRef.current;
    if (!chain || !audioCtx) return;
    chain.wahWet.gain.setTargetAtTime(
      wahOn ? 0.35 + wahAmount * 0.55 : 0,
      audioCtx.currentTime,
      0.02,
    );
  }, [wahOn, wahAmount, audioCtx, enabled]);

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
    activeDeckBpm, audioCtx, enabled,
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
    setDistModel(preset.distModel);
    setTone(preset.tone);
    setCabOn(preset.cabOn);
    setEqLow(preset.eqLow);
    setEqMid(preset.eqMid);
    setEqHigh(preset.eqHigh);
    setChorusOn(preset.chorusOn);
    setChorusMix(preset.chorusMix);
    setTremoloOn(preset.tremoloOn);
    setTremoloRate(preset.tremoloRate);
    setTremoloDepth(preset.tremoloDepth);
    setPhaserOn(preset.phaserOn);
    setPhaserRate(preset.phaserRate);
    setPhaserMix(preset.phaserMix);
    setWahOn(preset.wahOn);
    setWahAmount(preset.wahAmount);
    setOctaveOn(preset.octaveOn);
    setOctaveLevel(preset.octaveLevel);
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
      enableLabel="Enable guitar input"
      intro={
        <>
          Plug a guitar into your audio interface and jam over the decks.
          Effects run in the browser (~15–40&nbsp;ms of monitoring latency) — for
          the tightest feel, monitor your dry tone on the interface and use this
          for effects, with &ldquo;Amp to output&rdquo; off.
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
      <button
        type="button"
        onClick={() => setAmpOn((v) => !v)}
        title="Send the amp/dry guitar to the output. Turn off when monitoring dry on the interface — delay and reverb tails still come through."
        className={`self-start rounded-full border px-2.5 py-1 text-[10px] font-medium ${
          ampOn
            ? "border-foreground bg-foreground text-background"
            : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        }`}
      >
        Amp to output {ampOn ? "On" : "Off"}
      </button>

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
            <select
              value={distModel}
              onChange={(e) => setDistModel(e.target.value as DistModel)}
              disabled={!driveOn}
              title="Distortion voicing"
              className={`${SELECT_CLS} flex-1`}
            >
              {DIST_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
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
              onClick={() => setTremoloOn((v) => !v)}
              className={fxBtn(tremoloOn)}
            >
              Tremolo
            </button>
            <span className="flex-1 text-[10px] text-black/40 dark:text-white/40">
              Rhythmic volume chop on the amp signal
            </span>
          </div>
          {tremoloOn && (
            <div className="grid grid-cols-2 gap-2">
              <MiniSlider
                label="Trem rate"
                valueLabel={`${tremoloRate.toFixed(1)} Hz`}
                min={0.5}
                max={12}
                step={0.1}
                value={tremoloRate}
                onChange={(e) => setTremoloRate(Number(e.target.value))}
                onDoubleClick={() => setTremoloRate(4)}
              />
              <MiniSlider
                label="Trem depth"
                valueLabel={`${Math.round(tremoloDepth * 100)}%`}
                min={0}
                max={1}
                step={0.01}
                value={tremoloDepth}
                onChange={(e) => setTremoloDepth(Number(e.target.value))}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPhaserOn((v) => !v)}
              className={fxBtn(phaserOn)}
            >
              Phaser
            </button>
            <input
              type="range"
              min={0}
              max={0.7}
              step={0.01}
              value={phaserMix}
              disabled={!phaserOn}
              onChange={(e) => setPhaserMix(Number(e.target.value))}
              className="flex-1 accent-foreground disabled:opacity-30"
            />
          </div>
          {phaserOn && (
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-right text-[10px] text-black/40 dark:text-white/40">
                Rate
              </span>
              <input
                type="range"
                min={0.1}
                max={8}
                step={0.1}
                value={phaserRate}
                onChange={(e) => setPhaserRate(Number(e.target.value))}
                className="flex-1 accent-foreground"
              />
              <span className="w-12 text-right text-[10px] tabular-nums text-black/40 dark:text-white/40">
                {phaserRate.toFixed(1)} Hz
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWahOn((v) => !v)}
              className={fxBtn(wahOn)}
            >
              Wah
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={wahAmount}
              disabled={!wahOn}
              onChange={(e) => setWahAmount(Number(e.target.value))}
              className="flex-1 accent-foreground disabled:opacity-30"
            />
            <span className="w-16 shrink-0 text-right text-[10px] text-black/40 dark:text-white/40">
              envelope
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOctaveOn((v) => !v)}
              className={fxBtn(octaveOn)}
            >
              Octave
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={octaveLevel}
              disabled={!octaveOn}
              onChange={(e) => setOctaveLevel(Number(e.target.value))}
              className="flex-1 accent-foreground disabled:opacity-30"
            />
            <span className="w-16 shrink-0 text-right text-[10px] text-black/40 dark:text-white/40">
              −1 oct bass
            </span>
          </div>
          {octaveOn && (
            <p className="text-[10px] text-black/40 dark:text-white/40">
              Tracks one note at a time — play single-note lines for the cleanest
              bass. Blend in the dry amp for pick attack.
            </p>
          )}

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
    </CaptureShell>
  );
}
