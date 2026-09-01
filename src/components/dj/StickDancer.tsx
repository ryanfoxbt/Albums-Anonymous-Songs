"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { RawMixEvent } from "./mixTypes";

// Kall of Booty — the parody rapper from card 001 (see /public/cards/
// kall-of-booty.png) reborn as the DJ booth's hype dancer: backwards cap,
// gold chains, mic in one hand, pointing with the other, permanent deep
// squat over a giant booty. In "live" mode he takes keyboard input and a
// self-driving AUTO freestyle, and reports events so a recorded set keeps
// the dance. In "replay" mode he's driven entirely by those events.
//
// The wire format ({ move, x, facing }) is unchanged from the old stick
// figure, so mixes recorded before this rework still replay — legacy move
// names (jump, drop, jiggle, hairflip, buttslam, kicks, punches,
// diaperThrow) are kept alive and mapped onto the new choreography.

const FIGURE_W = 132;
const FIGURE_H = 176;

// Every one-shot move and how long its animation runs (kept in sync with
// the CSS below). Canonical moves first, then legacy aliases.
const MOVE_MS = {
  // canonical
  spin: 620,
  backflip: 780,
  helicopter: 1000,
  headSpin: 900,
  breakdance: 900,
  moonwalk: 640,
  theWorm: 860,
  cabbagePatch: 640,
  moonJump: 820,
  levitate: 1000,
  pancake: 620,
  rubberband: 560,
  gorillaStomp: 560,
  earthquake: 720,
  dab: 540,
  splitKick: 540,
  bootyquake: 620,
  twerkClimb: 1000,
  bootyBlast: 720,
  warp: 480,
  vibrate: 600,
  strobeRave: 900,
  phaseShift: 700,
  // legacy aliases — old recorded mixes reference these
  jump: 600,
  drop: 620,
  jiggle: 560,
  hairflip: 560,
  buttslam: 680,
  leftKick: 460,
  rightKick: 460,
  leftPunch: 420,
  rightPunch: 420,
  diaperThrow: 780,
} as const;

type ActiveMove = keyof typeof MOVE_MS;
type Move = "idle" | "strut" | ActiveMove;

// Deliberately NOT the arrow keys.
const KEY_MOVE: Record<string, ActiveMove | "left" | "right"> = {
  a: "left",
  d: "right",
  w: "moonJump",
  q: "backflip",
  e: "spin",
  r: "helicopter",
  f: "headSpin",
  b: "breakdance",
  z: "moonwalk",
  x: "theWorm",
  c: "cabbagePatch",
  v: "levitate",
  t: "bootyBlast",
  g: "bootyquake",
  h: "twerkClimb",
  j: "dab",
  k: "splitKick",
  l: "gorillaStomp",
  y: "earthquake",
  u: "warp",
  i: "vibrate",
  o: "strobeRave",
  p: "phaseShift",
  m: "rubberband",
  s: "pancake",
};

// Moves that physically travel across the floor. The number is a direction
// multiplier: positive = the way he's facing, negative = away from it.
const TRAVEL: Partial<Record<ActiveMove, number>> = {
  moonwalk: -1,
  theWorm: 1,
  breakdance: 0.5,
  bootyBlast: -0.55,
};

const STRUT_MS = 230;
const DEFAULT_BEAT_MS = 545; // ~110 BPM, used when no track BPM is known

// Size control: each level targets a fraction of the viewport height.
const SIZE_FRACS = [0.3, 0.46, 0.64, 0.84, 1.06, 1.4];
const SIZE_LABELS = ["S", "M", "L", "XL", "XXL", "MEGA"];
const DEFAULT_SIZE = 1;
const SIZE_KEY = "aa-dancer-size";
const AUTO_KEY = "aa-dancer-auto";

// Auto-freestyle pools.
const AUTO_QUICK: ActiveMove[] = [
  "dab",
  "splitKick",
  "gorillaStomp",
  "bootyquake",
  "cabbagePatch",
  "warp",
  "spin",
  "rubberband",
];
const AUTO_FULL: ActiveMove[] = [
  "bootyquake",
  "bootyquake",
  "twerkClimb",
  "spin",
  "backflip",
  "moonwalk",
  "theWorm",
  "cabbagePatch",
  "moonJump",
  "dab",
  "splitKick",
  "gorillaStomp",
  "bootyBlast",
  "rubberband",
  "vibrate",
  "phaseShift",
];
const AUTO_FLOURISH: ActiveMove[] = [
  "helicopter",
  "headSpin",
  "breakdance",
  "levitate",
  "earthquake",
  "strobeRave",
];

export const DANCER_HINT =
  "Kall of Booty — A/D strut · W moon-jump · Q backflip · E spin · R helicopter · F head-spin · B breakdance · Z moonwalk · X the worm · C cabbage patch · V levitate · T booty-blast · G booty-quake · H twerk-climb · J dab · K split-kick · L gorilla-stomp · Y earthquake · U warp · I vibrate · O rave · P phase-shift · M rubber-band · S pancake. Hit AUTO to let him freestyle — resize him with – / +.";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function detectTouch(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches
  );
}

export type StickDancerHandle = {
  /** Replay: apply one recorded dancer event. */
  applyEvent: (e: { move: string; x: number; facing: number }) => void;
  /** Live: current state as an "enter" event, for the record-start snapshot. */
  snapshot: () => RawMixEvent | null;
};

export const StickDancer = forwardRef<
  StickDancerHandle,
  {
    mode?: "live" | "replay";
    /** Live only — reports enter/exit/move so a recording can include the dance. */
    onEvent?: (e: RawMixEvent) => void;
    /** BPM of the track currently in focus — auto-dance and the idle groove
     *  lock to it. Null falls back to ~110 BPM. */
    bpm?: number | null;
  }
>(function StickDancer({ mode = "live", onEvent, bpm }, ref) {
  const replay = mode === "replay";
  const [move, setMove] = useState<Move>("idle");
  const [facing, setFacing] = useState<1 | -1>(1);
  const [x, setX] = useState(60);
  const [visible, setVisible] = useState(!replay);
  const [vp, setVp] = useState<{ w: number; h: number }>({ w: 375, h: 700 });
  const [isTouch, setIsTouch] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(DEFAULT_SIZE);
  const [autoOn, setAutoOn] = useState(false);
  const moveTimer = useRef<number | null>(null);

  const beatMs = bpm && bpm >= 40 && bpm <= 300 ? 60000 / bpm : DEFAULT_BEAT_MS;

  const scale = Math.min(
    6,
    Math.max(0.22, (SIZE_FRACS[sizeIdx] * vp.h) / FIGURE_H),
  );
  const figureW = FIGURE_W * scale;
  const strutStep =
    Math.max(12, Math.round(16 * scale)) * (isTouch ? 1.25 : 1);
  // Room for the figure plus headroom for jumps / levitation.
  const stripH = Math.min(vp.h * 1.15, FIGURE_H * scale + 170 * scale + 24);

  const xRef = useRef(x);
  useEffect(() => {
    xRef.current = x;
  }, [x]);
  const facingRef = useRef<1 | -1>(facing);
  useEffect(() => {
    facingRef.current = facing;
  }, [facing]);
  const scaleRef = useRef(scale);
  const figureWRef = useRef(figureW);
  const strutStepRef = useRef(strutStep);
  const vpRef = useRef(vp);
  useEffect(() => {
    scaleRef.current = scale;
    figureWRef.current = figureW;
    strutStepRef.current = strutStep;
    vpRef.current = vp;
  }, [scale, figureW, strutStep, vp]);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  const lastKeyRef = useRef(0);
  const placedRef = useRef(false);
  const prefsRef = useRef(false);

  const emit = useCallback((mv: string, px: number, face: 1 | -1) => {
    onEventRef.current?.({
      k: "dancer",
      move: mv,
      x: clamp01(px / (window.innerWidth || 1)),
      facing: face,
    });
  }, []);

  const clearMoveTimer = () => {
    if (moveTimer.current) window.clearTimeout(moveTimer.current);
  };

  const doMove = useCallback((next: ActiveMove) => {
    setMove(next);
    clearMoveTimer();
    moveTimer.current = window.setTimeout(() => setMove("idle"), MOVE_MS[next]);
  }, []);

  const triggerMove = useCallback(
    (next: ActiveMove) => {
      doMove(next);
      const dir = TRAVEL[next];
      let nextX = xRef.current;
      if (dir) {
        const step = dir * facingRef.current * 46 * scaleRef.current;
        const max = Math.max(0, (window.innerWidth || vpRef.current.w) - figureWRef.current);
        nextX = Math.min(max, Math.max(0, xRef.current + step));
        setX(nextX);
      }
      if (!replay) emit(next, nextX, facingRef.current);
    },
    [doMove, emit, replay],
  );

  const triggerStrut = useCallback(
    (dir: "left" | "right") => {
      const face: 1 | -1 = dir === "left" ? -1 : 1;
      const max = Math.max(0, (window.innerWidth || vpRef.current.w) - figureWRef.current);
      const nextX = Math.min(
        max,
        Math.max(0, xRef.current + face * strutStepRef.current),
      );
      setFacing(face);
      setMove("strut");
      setX(nextX);
      clearMoveTimer();
      moveTimer.current = window.setTimeout(() => setMove("idle"), STRUT_MS);
      if (!replay) emit("strut", nextX, face);
    },
    [emit, replay],
  );

  // --- Live keyboard (desktop) ---
  useEffect(() => {
    if (replay) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (isTypingTarget(ev.target)) return;
      const action = KEY_MOVE[ev.key.toLowerCase()];
      if (!action) return;
      ev.preventDefault();
      lastKeyRef.current = performance.now();
      if (action === "left" || action === "right") {
        triggerStrut(action);
      } else if (!ev.repeat) {
        triggerMove(action);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replay, triggerMove, triggerStrut]);

  // --- Auto freestyle — always on for touch screens, opt-in via AUTO elsewhere ---
  useEffect(() => {
    if (replay || !(isTouch || autoOn) || !visible) return;
    let alive = true;
    let strutDir: "left" | "right" = "right";
    let sinceFlourish = 0;
    let comboLeft = 0;
    let timer = 0;

    const pick = (pool: ActiveMove[]) =>
      pool[Math.floor(Math.random() * pool.length)];

    const step = () => {
      if (!alive) return;

      // Give a keyboard player the floor for a beat after they hit a key.
      if (performance.now() - lastKeyRef.current < 500) {
        timer = window.setTimeout(step, beatMs);
        return;
      }

      if (comboLeft > 0) {
        triggerMove(pick(AUTO_QUICK));
        comboLeft -= 1;
        timer = window.setTimeout(step, beatMs * 0.5);
        return;
      }

      const roll = Math.random();
      if (roll < 0.3) {
        // Travel — bounce off the screen edges.
        const fw = figureWRef.current;
        const st = strutStepRef.current;
        if (xRef.current > vpRef.current.w - fw - st * 2) strutDir = "left";
        else if (xRef.current < st * 2) strutDir = "right";
        triggerStrut(strutDir);
        timer = window.setTimeout(step, beatMs);
        return;
      }
      if (roll < 0.44) {
        // Rattle off a quick combo on the off-beats.
        comboLeft = 2 + (Math.random() < 0.5 ? 1 : 0);
        timer = window.setTimeout(step, beatMs * 0.5);
        return;
      }

      let mv: ActiveMove;
      if (sinceFlourish >= 5 && Math.random() < 0.6) {
        mv = pick(AUTO_FLOURISH);
        sinceFlourish = 0;
      } else {
        mv = pick(AUTO_FULL);
        sinceFlourish += 1;
      }
      triggerMove(mv);
      const gap = Math.max(MOVE_MS[mv] + 120, beatMs * (Math.random() < 0.28 ? 2 : 1));
      timer = window.setTimeout(step, gap);
    };

    timer = window.setTimeout(step, beatMs);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [replay, isTouch, autoOn, visible, beatMs, triggerMove, triggerStrut]);

  useEffect(() => {
    if (replay) return;
    emit("enter", xRef.current, facingRef.current);
    return () => {
      onEventRef.current?.({ k: "dancer", move: "exit", x: 0, facing: 1 });
    };
  }, [replay, emit]);

  // Viewport + touch tracking. Also centres the figure the first time we
  // have real measurements (a MEGA dancer parked at x=0 looks broken).
  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth || 375;
      const h = window.innerHeight || 700;
      setVp({ w, h });
      setIsTouch(detectTouch());
      if (!placedRef.current) {
        placedRef.current = true;
        const s = Math.min(
          6,
          Math.max(0.22, (SIZE_FRACS[sizeIdx] * h) / FIGURE_H),
        );
        setX(Math.max(0, (w - FIGURE_W * s) / 2));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    mq.addEventListener?.("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      mq.removeEventListener?.("change", measure);
    };
    // sizeIdx intentionally omitted — only the first measurement centres him
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore size / AUTO preference once, after mount (keeps SSR markup stable).
  useEffect(() => {
    if (replay || prefsRef.current) return;
    prefsRef.current = true;
    try {
      const raw = window.localStorage.getItem(SIZE_KEY);
      if (raw !== null) {
        const s = Number(raw);
        if (Number.isInteger(s) && s >= 0 && s < SIZE_FRACS.length) setSizeIdx(s);
      }
      if (window.localStorage.getItem(AUTO_KEY) === "1") setAutoOn(true);
    } catch {
      // storage blocked — defaults are fine
    }
  }, [replay]);

  useEffect(() => {
    if (replay || !prefsRef.current) return;
    try {
      window.localStorage.setItem(SIZE_KEY, String(sizeIdx));
      window.localStorage.setItem(AUTO_KEY, autoOn ? "1" : "0");
    } catch {
      // best-effort
    }
  }, [sizeIdx, autoOn, replay]);

  // Keep him on-screen when the size (and so his footprint) changes.
  useEffect(() => {
    setX((prev) => Math.min(prev, Math.max(0, vp.w - FIGURE_W * scale)));
  }, [scale, vp.w]);

  useEffect(() => clearMoveTimer, []);

  useImperativeHandle(ref, () => ({
    applyEvent: (e) => {
      if (e.move === "enter") {
        setVisible(true);
        setX(clamp01(e.x) * (window.innerWidth || 1));
        setFacing(e.facing < 0 ? -1 : 1);
        setMove("idle");
        return;
      }
      if (e.move === "exit") {
        setVisible(false);
        return;
      }
      setVisible(true);
      setX(clamp01(e.x) * (window.innerWidth || 1));
      setFacing(e.facing < 0 ? -1 : 1);
      if (e.move === "strut") {
        setMove("strut");
        clearMoveTimer();
        moveTimer.current = window.setTimeout(() => setMove("idle"), STRUT_MS);
      } else {
        setMove(e.move as Move);
        clearMoveTimer();
        const ms = MOVE_MS[e.move as ActiveMove] ?? 500;
        moveTimer.current = window.setTimeout(() => setMove("idle"), ms);
      }
    },
    snapshot: () =>
      replay
        ? null
        : {
            k: "dancer",
            move: "enter",
            x: clamp01(xRef.current / (window.innerWidth || 1)),
            facing: facingRef.current,
          },
  }));

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="kb-root"
      style={
        { height: stripH, "--beat": `${Math.round(beatMs)}ms` } as React.CSSProperties
      }
    >
      <style>{DANCER_CSS}</style>
      <div className="kb-pos" style={{ transform: `translateX(${x}px)` }}>
        <div className="kb-scale" style={{ transform: `scale(${scale})` }}>
          <div className="kb-face" style={{ transform: `scaleX(${facing})` }}>
            <div className="kb-dancer" data-move={move}>
              <div className="kb-shadow" />
              <div className="kb-fx">
                <svg
                  viewBox="0 0 132 176"
                  width={132}
                  height={176}
                  className="kb-svg"
                >
                  {/* giant booty (behind everything) */}
                  <g className="kb-butt">
                    <circle cx="30" cy="132" r="21" fill="#fff" stroke="#111" strokeWidth="6" />
                    <circle cx="52" cy="134" r="24" fill="#fff" stroke="#111" strokeWidth="6" />
                    <circle cx="20" cy="126" r="4.2" fill="none" stroke="#111" strokeWidth="3" />
                    <circle cx="35" cy="130" r="3.6" fill="none" stroke="#111" strokeWidth="3" />
                    <circle cx="13" cy="141" r="1.7" fill="#111" />
                  </g>

                  {/* deep-squat legs */}
                  <g
                    className="kb-legs"
                    fill="none"
                    stroke="#111"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path className="kb-leg-l" d="M62 122 L44 126 L47 150 L31 164 L41 164" />
                    <path className="kb-leg-r" d="M62 122 L98 128 L93 150 L104 164 L114 164" />
                  </g>

                  {/* torso */}
                  <path
                    className="kb-torso"
                    d="M60 124 L66 78"
                    stroke="#111"
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* gold chains */}
                  <g className="kb-chains" fill="none" strokeLinecap="round">
                    <path d="M63 72 Q50 100 61 122" stroke="#E8B923" strokeWidth="3.6" />
                    <path d="M70 72 Q85 98 71 120" stroke="#E8B923" strokeWidth="3.6" />
                    <path d="M63 72 Q50 100 61 122" stroke="#F6DE7B" strokeWidth="1.3" />
                    <path d="M70 72 Q85 98 71 120" stroke="#F6DE7B" strokeWidth="1.3" />
                  </g>

                  {/* pointing arm */}
                  <g
                    className="kb-arm-point"
                    fill="none"
                    stroke="#111"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M66 82 L88 92 L106 96" />
                    <path d="M106 96 l10 -2" strokeWidth="4" />
                    <path d="M112 94 l1.5 5" strokeWidth="4" />
                  </g>

                  {/* head + backwards cap */}
                  <g className="kb-head">
                    <circle cx="68" cy="52" r="18" fill="#fff" stroke="#111" strokeWidth="5" />
                    <circle cx="75" cy="51" r="2.6" fill="#111" />
                    <path
                      d="M73 60 q4 3 8 0"
                      fill="none"
                      stroke="#111"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <g className="kb-cap">
                      <path
                        d="M50 48 A19 19 0 0 1 87 48 Q68 41 50 48 Z"
                        fill="#fff"
                        stroke="#111"
                        strokeWidth="5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M50 48 q-19 0 -24 6 q11 6 25 1 Z"
                        fill="#fff"
                        stroke="#111"
                        strokeWidth="5"
                        strokeLinejoin="round"
                      />
                      <circle cx="27" cy="53" r="2.2" fill="none" stroke="#111" strokeWidth="2.2" />
                    </g>
                  </g>

                  {/* mic arm (arm + mic move together) */}
                  <g
                    className="kb-arm-mic"
                    fill="none"
                    stroke="#111"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M66 80 L82 66 L92 58" />
                    <line x1="92" y1="58" x2="99" y2="49" stroke="#111" strokeWidth="5" />
                    <circle cx="101" cy="46" r="6" fill="#fff" stroke="#111" strokeWidth="3.4" />
                    <path
                      d="M97 43 l8 0 M96.5 46 l9 0 M97 49 l8 0"
                      stroke="#111"
                      strokeWidth="1.3"
                    />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!replay && (
        <div className="kb-ctl" title="Resize the dancer · AUTO = freestyle">
          <button
            type="button"
            onClick={() => setSizeIdx((i) => Math.max(0, i - 1))}
            disabled={sizeIdx === 0}
            aria-label="Smaller dancer"
          >
            –
          </button>
          <span className="kb-ctl-size">{SIZE_LABELS[sizeIdx]}</span>
          <button
            type="button"
            onClick={() => setSizeIdx((i) => Math.min(SIZE_FRACS.length - 1, i + 1))}
            disabled={sizeIdx === SIZE_FRACS.length - 1}
            aria-label="Bigger dancer"
          >
            +
          </button>
          <button
            type="button"
            data-on={autoOn}
            aria-pressed={autoOn}
            onClick={() => setAutoOn((v) => !v)}
          >
            AUTO
          </button>
        </div>
      )}
    </div>
  );
});

const DANCER_CSS = `
.kb-root {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 30;
  overflow: hidden;
  pointer-events: none;
}
.kb-pos {
  position: absolute;
  bottom: 4px;
  left: 0;
  transform-origin: bottom left;
  will-change: transform;
  transition: transform 160ms steps(4, end);
}
.kb-scale {
  transform-origin: bottom left;
  transition: transform 240ms ease;
}
.kb-face { transform-origin: bottom center; }
.kb-dancer { position: relative; width: 132px; height: 176px; transform-origin: bottom center; }
.kb-fx { position: absolute; left: 0; bottom: 0; width: 132px; height: 176px; }
.kb-svg { display: block; overflow: visible; }
.kb-shadow {
  position: absolute; left: 50%; bottom: 0;
  width: 96px; height: 14px; margin-left: -48px;
  background: rgba(0,0,0,0.22); border-radius: 50%;
}

/* --- idle groove — locked to the track beat via --beat (default ~110 BPM) --- */
.kb-svg { animation: kb-bob var(--beat, 545ms) steps(2, end) infinite alternate; }
.kb-butt { transform-origin: 40px 132px; animation: kb-butt-idle calc(var(--beat, 545ms) / 2) steps(2,end) infinite alternate; }
.kb-arm-mic { transform-origin: 66px 80px; animation: kb-mic-idle var(--beat, 545ms) steps(2,end) infinite alternate; }
.kb-arm-point { transform-origin: 66px 82px; animation: kb-point-idle calc(var(--beat, 545ms) * 2) ease-in-out infinite alternate; }
.kb-cap { transform-origin: 68px 40px; animation: kb-cap-idle calc(var(--beat, 545ms) * 1.5) ease-in-out infinite alternate; }
.kb-chains { transform-origin: 66px 72px; animation: kb-chain-idle calc(var(--beat, 545ms) * 1.3) ease-in-out infinite alternate; }
.kb-legs { transform-origin: 62px 122px; animation: kb-legs-idle var(--beat, 545ms) steps(2,end) infinite alternate; }

@keyframes kb-bob { from { transform: translateY(0) rotate(-1.5deg); } to { transform: translateY(-5px) rotate(1.5deg); } }
@keyframes kb-butt-idle { from { transform: scaleX(1) skewX(0deg); } to { transform: scaleX(1.1) skewX(-5deg); } }
@keyframes kb-mic-idle { from { transform: rotate(-6deg); } to { transform: rotate(9deg); } }
@keyframes kb-point-idle { from { transform: rotate(3deg); } to { transform: rotate(-4deg); } }
@keyframes kb-cap-idle { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }
@keyframes kb-chain-idle { from { transform: rotate(-3deg) translateY(0); } to { transform: rotate(4deg) translateY(1px); } }
@keyframes kb-legs-idle { from { transform: translateY(0); } to { transform: translateY(-2px); } }

/* --- strut --- */
.kb-dancer[data-move="strut"] .kb-legs { animation: kb-strut 230ms steps(3,end) 1; }
@keyframes kb-strut { 0% { transform: skewX(0); } 50% { transform: skewX(15deg); } 100% { transform: skewX(0); } }

/* --- moon jump / jump --- */
.kb-dancer[data-move="moonJump"] .kb-svg,
.kb-dancer[data-move="jump"] .kb-svg { animation: kb-moonjump 820ms cubic-bezier(.3,-0.4,.5,1.4) 1; }
@keyframes kb-moonjump { 0%,100% { transform: translateY(0) rotate(0); } 45% { transform: translateY(-120px) rotate(8deg); } 55% { transform: translateY(-120px) rotate(-8deg); } }
.kb-dancer[data-move="moonJump"] .kb-shadow,
.kb-dancer[data-move="jump"] .kb-shadow,
.kb-dancer[data-move="levitate"] .kb-shadow { animation: kb-shadow-far 900ms ease-in-out 1; }
@keyframes kb-shadow-far { 0%,100% { transform: scale(1); opacity: .22; } 50% { transform: scale(.45); opacity: .1; } }

/* --- spin --- */
.kb-dancer[data-move="spin"] .kb-svg { animation: kb-spin 620ms steps(8,end) 1; }
@keyframes kb-spin { from { transform: rotateY(0); } to { transform: rotateY(360deg); } }

/* --- backflip --- */
.kb-dancer[data-move="backflip"] .kb-svg { animation: kb-backflip 780ms ease-in-out 1; }
@keyframes kb-backflip { 0% { transform: translateY(0) rotate(0); } 45% { transform: translateY(-90px) rotate(-200deg); } 100% { transform: translateY(0) rotate(-360deg); } }

/* --- helicopter --- */
.kb-dancer[data-move="helicopter"] .kb-svg { animation: kb-heli 1000ms linear 1; }
@keyframes kb-heli { 0% { transform: translateY(0) rotate(0); } 20% { transform: translateY(-40px) rotate(180deg); } 80% { transform: translateY(-40px) rotate(650deg); } 100% { transform: translateY(0) rotate(720deg); } }

/* --- head spin --- */
.kb-dancer[data-move="headSpin"] .kb-svg { animation: kb-headspin 900ms ease-in-out 1; transform-origin: 68px 34px; }
@keyframes kb-headspin { 0% { transform: rotate(0); } 18% { transform: rotate(180deg) translateY(6px); } 70% { transform: rotate(900deg) translateY(6px); } 100% { transform: rotate(1080deg); } }

/* --- breakdance windmill --- */
.kb-dancer[data-move="breakdance"] .kb-svg { animation: kb-break 900ms linear 1; transform-origin: 60px 150px; }
@keyframes kb-break { 0% { transform: rotate(0) skewX(0) translateY(20px); } 50% { transform: rotate(180deg) skewX(12deg) translateY(20px); } 100% { transform: rotate(360deg) skewX(0) translateY(0); } }

/* --- moonwalk --- */
.kb-dancer[data-move="moonwalk"] .kb-svg { animation: kb-moonwalk 640ms cubic-bezier(.2,.6,.2,1) 1; }
@keyframes kb-moonwalk { 0% { transform: translateX(0) rotate(0); } 20% { transform: translateX(-8px) rotate(-3deg); } 100% { transform: translateX(0) rotate(0); } }
.kb-dancer[data-move="moonwalk"] .kb-legs { animation: kb-shimmy 150ms steps(2,end) 4; }
@keyframes kb-shimmy { from { transform: skewX(-9deg); } to { transform: skewX(9deg); } }

/* --- the worm --- */
.kb-dancer[data-move="theWorm"] .kb-svg,
.kb-dancer[data-move="diaperThrow"] .kb-svg { animation: kb-worm 860ms ease-in-out 1; }
@keyframes kb-worm { 0%,100% { transform: skewX(0) translateY(0); } 20% { transform: skewX(-18deg) translateY(-6px); } 40% { transform: skewX(16deg) translateY(8px); } 60% { transform: skewX(-12deg) translateY(-4px); } 80% { transform: skewX(10deg) translateY(4px); } }

/* --- cabbage patch --- */
.kb-dancer[data-move="cabbagePatch"] .kb-svg { animation: kb-cabbage 640ms linear 1; }
@keyframes kb-cabbage { 0% { transform: translate(0,0); } 25% { transform: translate(10px,-8px); } 50% { transform: translate(0,-14px); } 75% { transform: translate(-10px,-8px); } 100% { transform: translate(0,0); } }

/* --- levitate --- */
.kb-dancer[data-move="levitate"] .kb-svg { animation: kb-levi 1000ms ease-in-out 1; }
@keyframes kb-levi { 0%,100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-70px) rotate(6deg); } 60% { transform: translateY(-70px) rotate(-6deg); } }
.kb-dancer[data-move="levitate"] .kb-fx { animation: kb-glow 1000ms ease-in-out 1; }
@keyframes kb-glow { 0%,100% { filter: none; } 50% { filter: drop-shadow(0 0 10px rgba(247,96,214,.8)) drop-shadow(0 0 22px rgba(247,96,214,.5)); } }

/* --- pancake / drop --- */
.kb-dancer[data-move="pancake"] .kb-svg,
.kb-dancer[data-move="drop"] .kb-svg { animation: kb-pancake 620ms cubic-bezier(.3,0,.2,1) 1; transform-origin: 60px 164px; }
@keyframes kb-pancake { 0%,100% { transform: scaleY(1) scaleX(1); } 40%,60% { transform: scaleY(.18) scaleX(1.5); } 80% { transform: scaleY(1.12) scaleX(.9); } }

/* --- rubber band --- */
.kb-dancer[data-move="rubberband"] .kb-svg { animation: kb-rubber 560ms ease-in-out 1; transform-origin: 60px 164px; }
@keyframes kb-rubber { 0%,100% { transform: scaleY(1) scaleX(1); } 30% { transform: scaleY(1.8) scaleX(.6); } 55% { transform: scaleY(.6) scaleX(1.4); } 80% { transform: scaleY(1.15) scaleX(.9); } }

/* --- gorilla stomp / punches --- */
.kb-dancer[data-move="gorillaStomp"] .kb-svg,
.kb-dancer[data-move="leftPunch"] .kb-svg,
.kb-dancer[data-move="rightPunch"] .kb-svg { animation: kb-stomp 560ms steps(4,end) 1; }
@keyframes kb-stomp { 0%,100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(-14px) rotate(-6deg); } 50% { transform: translateY(4px) rotate(0); } 75% { transform: translateY(-10px) rotate(6deg); } }
.kb-dancer[data-move="gorillaStomp"] .kb-arm-mic { animation: kb-arm-pump 190ms steps(2,end) 3; }
.kb-dancer[data-move="gorillaStomp"] .kb-arm-point { animation: kb-arm-pump 190ms steps(2,end) 3 reverse; }
@keyframes kb-arm-pump { from { transform: rotate(-30deg); } to { transform: rotate(20deg); } }

/* --- earthquake --- */
.kb-dancer[data-move="earthquake"] .kb-svg { animation: kb-quake 720ms steps(2,end) 1; transform-origin: 60px 164px; }
@keyframes kb-quake { 0% { transform: translateY(-34px) scaleY(1.1); } 20% { transform: translateY(0) scaleY(.8) scaleX(1.2); } 24% { transform: translateY(0) scaleY(.8); } 100% { transform: translateY(0) scaleY(1); } }
.kb-dancer[data-move="earthquake"] .kb-shadow,
.kb-dancer[data-move="bootyBlast"] .kb-shadow { animation: kb-shock 720ms ease-out 1; }
@keyframes kb-shock { 0%,16% { transform: scale(.6); opacity: .3; } 30% { transform: scale(2.4); opacity: .15; } 100% { transform: scale(3.2); opacity: 0; } }
.kb-root:has(.kb-dancer[data-move="earthquake"]) { animation: kb-screenshake 420ms steps(2,end) 2; }
.kb-root:has(.kb-dancer[data-move="bootyquake"]) { animation: kb-screenshake 180ms steps(2,end) 3; }
@keyframes kb-screenshake { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-4px,2px); } 50% { transform: translate(4px,-2px); } 75% { transform: translate(-3px,-1px); } }

/* --- dab --- */
.kb-dancer[data-move="dab"] .kb-svg { animation: kb-dab 540ms cubic-bezier(.2,1.4,.4,1) 1; }
@keyframes kb-dab { 0%,100% { transform: rotate(0); } 35%,70% { transform: rotate(-24deg); } }
.kb-dancer[data-move="dab"] .kb-arm-mic { animation: kb-dab-up 540ms cubic-bezier(.2,1.4,.4,1) 1; }
@keyframes kb-dab-up { 0%,100% { transform: rotate(0); } 35%,70% { transform: rotate(-70deg); } }
.kb-dancer[data-move="dab"] .kb-arm-point { animation: kb-dab-across 540ms cubic-bezier(.2,1.4,.4,1) 1; }
@keyframes kb-dab-across { 0%,100% { transform: rotate(0) translateX(0); } 35%,70% { transform: rotate(-38deg) translateX(-6px); } }

/* --- split kick / kicks --- */
.kb-dancer[data-move="splitKick"] .kb-legs,
.kb-dancer[data-move="leftKick"] .kb-legs,
.kb-dancer[data-move="rightKick"] .kb-legs { animation: kb-split 540ms steps(3,end) 1; }
@keyframes kb-split { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(2); } }
.kb-dancer[data-move="splitKick"] .kb-svg { animation: kb-split-drop 540ms ease-out 1; }
@keyframes kb-split-drop { 0%,100% { transform: translateY(0); } 50% { transform: translateY(14px); } }

/* --- booty quake / jiggle / butt slam — the signature --- */
.kb-dancer[data-move="bootyquake"] .kb-butt,
.kb-dancer[data-move="jiggle"] .kb-butt,
.kb-dancer[data-move="buttslam"] .kb-butt { animation: kb-bootyquake 620ms steps(2,end) 1; }
@keyframes kb-bootyquake {
  0% { transform: scale(1) skewX(0); }
  12% { transform: scale(1.4,.9) skewX(-18deg); }
  30% { transform: scale(1.32,1.05) skewX(16deg); }
  50% { transform: scale(1.42,.92) skewX(-15deg); }
  70% { transform: scale(1.3,1.06) skewX(12deg); }
  88% { transform: scale(1.34,.98) skewX(-8deg); }
  100% { transform: scale(1) skewX(0); }
}
.kb-dancer[data-move="bootyquake"] .kb-svg,
.kb-dancer[data-move="strobeRave"] .kb-svg { animation: kb-hipwork 155ms steps(2,end) 4; }
@keyframes kb-hipwork { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-5px) rotate(-3deg); } 75% { transform: translateX(5px) rotate(3deg); } }

/* --- twerk climb --- */
.kb-dancer[data-move="twerkClimb"] .kb-svg { animation: kb-climb 1000ms steps(4,end) 1; }
@keyframes kb-climb { 0% { transform: translateY(0); } 25% { transform: translateY(-26px); } 50% { transform: translateY(-52px); } 75%,90% { transform: translateY(-78px); } 100% { transform: translateY(0); } }
.kb-dancer[data-move="twerkClimb"] .kb-butt { animation: kb-bootyquake 250ms steps(2,end) 4; }

/* --- booty blast (recoil + shockwave) --- */
.kb-dancer[data-move="bootyBlast"] .kb-svg { animation: kb-blast 720ms cubic-bezier(.2,0,.1,1) 1; }
@keyframes kb-blast { 0% { transform: translateX(0) rotate(0); } 30% { transform: translateX(10px) rotate(6deg); } 42% { transform: translateX(-40px) rotate(-14deg); } 70% { transform: translateX(6px) rotate(3deg); } 100% { transform: translateX(0) rotate(0); } }
.kb-dancer[data-move="bootyBlast"] .kb-butt { animation: kb-blast-butt 720ms cubic-bezier(.2,0,.1,1) 1; }
@keyframes kb-blast-butt { 0% { transform: scale(1); } 30% { transform: scale(1.1,.9) translateX(6px); } 44% { transform: scale(2,1.7) translateX(-14px); } 100% { transform: scale(1); } }

/* --- diaper throw (legacy) → mic fling --- */
.kb-dancer[data-move="diaperThrow"] .kb-arm-mic { animation: kb-throw 780ms ease-out 1; }
@keyframes kb-throw { 0% { transform: rotate(0); } 30% { transform: rotate(-120deg); } 55% { transform: rotate(40deg); } 100% { transform: rotate(0); } }

/* --- hair flip (legacy) → cap flip --- */
.kb-dancer[data-move="hairflip"] .kb-cap { animation: kb-capflip 560ms ease-out 1; }
@keyframes kb-capflip { 0%,100% { transform: rotate(0); } 40% { transform: rotate(-60deg) translateY(-6px); } }
.kb-dancer[data-move="hairflip"] .kb-head { animation: kb-headnod 560ms ease-out 1; transform-origin: 68px 60px; }
@keyframes kb-headnod { 0%,100% { transform: rotate(0); } 40% { transform: rotate(-14deg); } }

/* --- warp / glitch --- */
.kb-dancer[data-move="warp"] .kb-svg { animation: kb-warp 480ms steps(1,end) 1; }
@keyframes kb-warp { 0% { transform: scaleX(1); } 20% { transform: scaleX(.05) translateX(30px); } 21% { transform: scaleX(.05) translateX(-60px); } 40% { transform: scaleX(1) translateX(0); } 60% { transform: scaleX(.05) translateX(40px); } 61% { transform: scaleX(1) translateX(0); } }
.kb-dancer[data-move="warp"] .kb-fx { animation: kb-chromab 480ms steps(2,end) 1; }
@keyframes kb-chromab { 0%,100% { filter: none; } 50% { filter: drop-shadow(3px 0 0 rgba(255,0,120,.9)) drop-shadow(-3px 0 0 rgba(0,200,255,.9)); } }

/* --- vibrate --- */
.kb-dancer[data-move="vibrate"] .kb-svg { animation: kb-vibe 40ms steps(2,end) 15; }
@keyframes kb-vibe { from { transform: translate(-2px,1px); } to { transform: translate(2px,-1px); } }
.kb-dancer[data-move="vibrate"] .kb-fx { animation: kb-blurpulse 600ms ease-in-out 1; }
@keyframes kb-blurpulse { 0%,100% { filter: none; } 50% { filter: blur(1.4px); } }

/* --- strobe rave --- */
.kb-dancer[data-move="strobeRave"] .kb-fx { animation: kb-rave 900ms steps(1,end) 1; }
@keyframes kb-rave { 0% { filter: none; } 20% { filter: hue-rotate(90deg) brightness(1.6) saturate(3); } 40% { filter: hue-rotate(200deg) brightness(.7); } 60% { filter: hue-rotate(300deg) brightness(1.8) saturate(4); } 80% { filter: hue-rotate(60deg) brightness(1); } 100% { filter: none; } }

/* --- phase shift --- */
.kb-dancer[data-move="phaseShift"] .kb-fx { animation: kb-phase 700ms steps(1,end) 1; }
@keyframes kb-phase { 0%,100% { opacity: 1; filter: none; } 25% { opacity: .4; filter: drop-shadow(14px 0 0 rgba(120,120,255,.5)) drop-shadow(-14px 0 0 rgba(255,120,120,.5)); } 50% { opacity: .85; filter: drop-shadow(26px 0 0 rgba(120,120,255,.35)); } 75% { opacity: .5; filter: drop-shadow(-20px 0 0 rgba(255,120,120,.4)); } }

/* --- size / AUTO control --- */
.kb-ctl {
  position: absolute;
  right: 8px; bottom: 8px;
  display: flex; align-items: center; gap: 4px;
  padding: 3px 4px;
  border-radius: 999px;
  background: rgba(0,0,0,.4);
  opacity: .38;
  transition: opacity .15s ease;
  font: 600 11px/1 ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
  color: #fff;
  pointer-events: auto;
}
.kb-ctl:hover { opacity: 1; }
.kb-ctl button {
  min-width: 22px; height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.35);
  background: transparent;
  color: #fff;
  cursor: pointer;
  line-height: 1;
}
.kb-ctl button:hover { background: rgba(255,255,255,.18); }
.kb-ctl button:disabled { opacity: .35; cursor: default; }
.kb-ctl button[data-on="true"] { background: #F760D6; border-color: #F760D6; color: #0a0a0a; }
.kb-ctl-size { min-width: 36px; text-align: center; opacity: .9; letter-spacing: .04em; }

@media (prefers-reduced-motion: reduce) {
  .kb-svg, .kb-butt, .kb-arm-mic, .kb-arm-point, .kb-cap, .kb-chains,
  .kb-legs, .kb-fx, .kb-shadow, .kb-root, .kb-head { animation: none !important; }
}
`;
