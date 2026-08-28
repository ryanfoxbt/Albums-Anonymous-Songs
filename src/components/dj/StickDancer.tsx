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

// An optional, controllable 90s-video-game stick figure that busts moves along
// the bottom of the DJ booth. Emo fringe, oversized pink-lined hairy butt.
// In "live" mode it takes keyboard input and reports events (so a recorded DJ
// set can include the dance). In "replay" mode it's driven by those events.

type Move =
  | "idle"
  | "strut"
  | "jump"
  | "drop"
  | "jiggle"
  | "spin"
  | "hairflip"
  | "buttslam"
  | "leftKick"
  | "rightKick"
  | "leftPunch"
  | "rightPunch"
  | "diaperThrow";

type ActiveMove = Exclude<Move, "idle" | "strut">;

// Deliberately NOT the arrow keys.
const KEY_MOVE: Record<string, ActiveMove | "left" | "right"> = {
  a: "left",
  d: "right",
  w: "jump",
  s: "drop",
  q: "leftPunch",
  e: "rightPunch",
  z: "leftKick",
  x: "rightKick",
  t: "diaperThrow",
  j: "jiggle",
  g: "buttslam",
  h: "hairflip",
  l: "spin",
};

const MOVE_MS: Record<ActiveMove, number> = {
  jump: 600,
  drop: 720,
  jiggle: 520,
  spin: 660,
  hairflip: 480,
  buttslam: 760,
  leftKick: 420,
  rightKick: 420,
  leftPunch: 360,
  rightPunch: 360,
  diaperThrow: 820,
};

const STRUT_MS = 240;
const BASE_SCALE = 0.52; // desktop / keyboard mode
const AUTO_MIN_SCALE = 0.3;
const DEFAULT_BEAT_MS = 545; // ~110 BPM, used when no track BPM is known

// Weighted pool for the touch-screen auto-dance. Struts are scheduled
// separately so the figure travels; flourishes (spin/slam/throw) stay rare.
const AUTO_MOVES: ActiveMove[] = [
  "jump",
  "jump",
  "jiggle",
  "jiggle",
  "hairflip",
  "leftKick",
  "rightKick",
  "buttslam",
  "spin",
  "diaperThrow",
];
const FLOURISHES = new Set<ActiveMove>(["spin", "buttslam", "diaperThrow"]);

export const DANCER_HINT =
  "Dancer — A/D strut · W jump · S drop · Q/E punch · Z/X kick · T diaper throw · J jiggle butt · G butt slam · H hair flip · L spin. On touch screens it dances to the beat on its own.";

type Layout = {
  auto: boolean;
  scale: number;
  figureW: number;
  strutStep: number;
  stripH: number;
};

function computeLayout(): Layout {
  if (typeof window === "undefined") {
    return {
      auto: false,
      scale: BASE_SCALE,
      figureW: Math.round(120 * BASE_SCALE),
      strutStep: 34,
      stripH: 112,
    };
  }
  const auto = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const w = window.innerWidth || 375;
  const scale = auto
    ? Math.max(AUTO_MIN_SCALE, Math.min(0.5, w / 1000))
    : BASE_SCALE;
  return {
    auto,
    scale,
    figureW: Math.round(120 * scale),
    strutStep: auto ? Math.max(16, Math.round(w * 0.06)) : 34,
    stripH: Math.round(190 * scale + 10),
  };
}

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
  const [layout, setLayout] = useState<Layout>(computeLayout);
  const moveTimer = useRef<number | null>(null);

  const beatMs =
    bpm && bpm >= 40 && bpm <= 300 ? 60000 / bpm : DEFAULT_BEAT_MS;

  const xRef = useRef(x);
  useEffect(() => {
    xRef.current = x;
  }, [x]);
  const facingRef = useRef<1 | -1>(facing);
  useEffect(() => {
    facingRef.current = facing;
  }, [facing]);
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

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
      if (!replay) emit(next, xRef.current, facingRef.current);
    },
    [doMove, emit, replay],
  );

  const triggerStrut = useCallback(
    (dir: "left" | "right") => {
      const face: 1 | -1 = dir === "left" ? -1 : 1;
      const { strutStep, figureW } = layoutRef.current;
      const max = Math.max(0, window.innerWidth - figureW);
      const nextX = Math.min(
        max,
        Math.max(0, xRef.current + face * strutStep),
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
      if (action === "left" || action === "right") {
        triggerStrut(action);
      } else if (!ev.repeat) {
        triggerMove(action);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replay, triggerMove, triggerStrut]);

  // --- Auto-dance to the beat (touch screens) ---
  useEffect(() => {
    if (replay || !layout.auto || !visible) return;
    let alive = true;
    let strutDir: "left" | "right" = "right";
    let sinceFlourish = 0;
    let timer = 0;

    const step = () => {
      if (!alive) return;
      if (Math.random() < 0.5) {
        // travel — bounce off the screen edges
        const { figureW, strutStep } = layoutRef.current;
        if (xRef.current > window.innerWidth - figureW - strutStep * 2) {
          strutDir = "left";
        } else if (xRef.current < strutStep * 2) {
          strutDir = "right";
        }
        triggerStrut(strutDir);
      } else {
        const pool =
          sinceFlourish >= 4
            ? AUTO_MOVES
            : AUTO_MOVES.filter((m) => !FLOURISHES.has(m));
        const mv = pool[Math.floor(Math.random() * pool.length)];
        sinceFlourish = FLOURISHES.has(mv) ? 0 : sinceFlourish + 1;
        triggerMove(mv);
      }
      const beats = 1 + Math.floor(Math.random() * 2); // 1–2 beats apart
      timer = window.setTimeout(step, beatMs * beats);
    };

    timer = window.setTimeout(step, beatMs);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [replay, layout.auto, visible, beatMs, triggerMove, triggerStrut]);

  useEffect(() => {
    if (replay) return;
    emit("enter", xRef.current, facingRef.current);
    return () => {
      onEventRef.current?.({ k: "dancer", move: "exit", x: 0, facing: 1 });
    };
  }, [replay, emit]);

  useEffect(() => {
    const recompute = () => {
      const next = computeLayout();
      setLayout(next);
      setX((prev) =>
        Math.min(prev, Math.max(0, window.innerWidth - next.figureW)),
      );
    };
    window.addEventListener("resize", recompute);
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    mq.addEventListener?.("change", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      mq.removeEventListener?.("change", recompute);
    };
  }, []);

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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 overflow-hidden"
      style={
        { height: layout.stripH, "--beat": `${Math.round(beatMs)}ms` } as React.CSSProperties
      }
    >
      <style>{DANCER_CSS}</style>
      <div
        className="aa-dancer-pos"
        style={{ transform: `translateX(${x}px) scale(${layout.scale})` }}
      >
        <div className="aa-dancer-face" style={{ transform: `scaleX(${facing})` }}>
          <div className="aa-dancer" data-move={move}>
            <div className="aa-dancer-shadow" />
            <svg
              viewBox="0 0 120 170"
              width={120}
              height={170}
              className="aa-dancer-svg"
            >
              {/* legs */}
              <g className="aa-legs" stroke="#111" strokeWidth="7" strokeLinecap="round" fill="none">
                <path className="aa-leg-l" d="M60 108 L44 150 L36 150" />
                <path className="aa-leg-r" d="M60 108 L78 150 L86 150" />
              </g>

              {/* giant hairy butt with pink butt lines */}
              <g className="aa-butt">
                <ellipse cx="60" cy="104" rx="30" ry="22" fill="#111" />
                <ellipse cx="60" cy="102" rx="23" ry="16" fill="#242424" />
                {/* hairy strokes */}
                <g stroke="#111" strokeWidth="2.5" strokeLinecap="round" fill="none">
                  <path d="M34 96 q-6 -3 -10 -1" />
                  <path d="M32 104 q-7 0 -11 4" />
                  <path d="M36 114 q-6 4 -8 9" />
                  <path d="M86 96 q6 -3 10 -1" />
                  <path d="M88 104 q7 0 11 4" />
                  <path d="M84 114 q6 4 8 9" />
                </g>
                {/* signature-pink butt lines: centre crack + two cheeks */}
                <g stroke="#F760D6" strokeLinecap="round" fill="none">
                  <path d="M60 84 Q56 104 60 123" strokeWidth="3" />
                  <path d="M45 90 Q38 104 47 118" strokeWidth="2" opacity="0.9" />
                  <path d="M75 90 Q82 104 73 118" strokeWidth="2" opacity="0.9" />
                </g>
              </g>

              {/* torso */}
              <path
                className="aa-torso"
                d="M60 52 L60 100"
                stroke="#111"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* arms */}
              <g className="aa-arms" stroke="#111" strokeWidth="7" strokeLinecap="round" fill="none">
                <path className="aa-arm-l" d="M60 64 L40 78 L34 66" />
                <path className="aa-arm-r" d="M60 64 L80 78 L86 66" />
              </g>

              {/* the diaper projectile */}
              <g className="aa-diaper">
                <rect x="52" y="52" width="16" height="12" rx="4" fill="#fff" stroke="#F760D6" strokeWidth="2" />
                <path d="M54 52 l3 -4 M62 52 l3 -4" stroke="#F760D6" strokeWidth="1.6" strokeLinecap="round" />
              </g>

              {/* head */}
              <g className="aa-head">
                <circle cx="60" cy="38" r="16" fill="#f7d9b8" stroke="#111" strokeWidth="3" />
                <circle cx="66" cy="38" r="2.4" fill="#111" />
                <path
                  className="aa-hair"
                  d="M44 30 C42 14 60 8 76 16 C82 19 82 30 78 34 C74 26 66 24 60 27 C56 40 46 44 44 52 C40 46 40 36 44 30 Z"
                  fill="#0b0b0b"
                />
                <path
                  className="aa-fringe"
                  d="M60 24 C50 24 44 34 46 46 C40 40 40 28 48 22 C53 19 58 21 60 24 Z"
                  fill="#0b0b0b"
                />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

const DANCER_CSS = `
.aa-dancer-pos {
  position: absolute;
  bottom: 4px;
  left: 0;
  transform-origin: bottom left;
  will-change: transform;
  transition: transform 110ms steps(3, end);
}
.aa-dancer-face { transform-origin: bottom center; }
.aa-dancer { position: relative; width: 120px; height: 172px; transform-origin: bottom center; }
.aa-dancer-svg { display: block; overflow: visible; }
.aa-dancer-shadow {
  position: absolute; left: 50%; bottom: 0;
  width: 76px; height: 12px; margin-left: -38px;
  background: rgba(0,0,0,0.22); border-radius: 50%;
}

/* idle groove — locked to the track's beat via --beat (default ~110 BPM) */
.aa-dancer-svg { animation: aa-bob var(--beat, 545ms) steps(2, end) infinite alternate; }
.aa-butt { transform-origin: 60px 104px; animation: aa-butt-idle calc(var(--beat, 545ms) / 2) steps(2,end) infinite alternate; }
.aa-hair, .aa-fringe { transform-origin: 60px 20px; animation: aa-hair-sway calc(var(--beat, 545ms) * 1.6) ease-in-out infinite alternate; }
.aa-arms { transform-origin: 60px 64px; animation: aa-arm-idle var(--beat, 545ms) steps(2,end) infinite alternate; }
.aa-diaper { opacity: 0; transform-origin: 60px 58px; }

@keyframes aa-bob { from { transform: translateY(0) rotate(-1.5deg); } to { transform: translateY(-6px) rotate(1.5deg); } }
@keyframes aa-butt-idle { from { transform: scaleX(1) skewX(0deg); } to { transform: scaleX(1.12) skewX(-6deg); } }
@keyframes aa-hair-sway { from { transform: rotate(-4deg); } to { transform: rotate(5deg); } }
@keyframes aa-arm-idle { from { transform: rotate(-8deg); } to { transform: rotate(10deg); } }

/* strut */
.aa-dancer[data-move="strut"] .aa-legs { animation: aa-strut 240ms steps(3,end) 1; transform-origin: 60px 108px; }
@keyframes aa-strut { 0% { transform: skewX(0); } 50% { transform: skewX(14deg); } 100% { transform: skewX(0); } }

/* jump */
.aa-dancer[data-move="jump"] { animation: aa-jump 600ms steps(4,end) 1; }
.aa-dancer[data-move="jump"] .aa-legs { animation: aa-tuck 600ms ease-out 1; transform-origin: 60px 108px; }
@keyframes aa-jump { 0%,100% { transform: translateY(0); } 40% { transform: translateY(-58px); } }
@keyframes aa-tuck { 0%,100% { transform: scaleY(1); } 45% { transform: scaleY(0.6) translateY(-6px); } }

/* drop / splits */
.aa-dancer[data-move="drop"] .aa-legs { animation: aa-splits 720ms steps(3,end) 1; transform-origin: 60px 108px; }
.aa-dancer[data-move="drop"] .aa-dancer-svg { animation: aa-drop-body 720ms ease-out 1; }
@keyframes aa-splits { 0% { transform: scaleX(1) scaleY(1); } 60% { transform: scaleX(1.9) scaleY(0.5); } 100% { transform: scaleX(1) scaleY(1); } }
@keyframes aa-drop-body { 0%,100% { transform: translateY(0); } 60% { transform: translateY(26px); } }

/* jiggle butt / butt slam */
.aa-dancer[data-move="jiggle"] .aa-butt { animation: aa-jiggle 520ms steps(2,end) 1; }
.aa-dancer[data-move="buttslam"] .aa-butt { animation: aa-slam-butt 760ms ease-out 1; }
.aa-dancer[data-move="buttslam"] { animation: aa-slam-body 760ms ease-out 1; }
@keyframes aa-jiggle {
  0% { transform: scaleX(1) skewX(0); }
  15% { transform: scaleX(1.35) skewX(-16deg); }
  35% { transform: scaleX(1.3) skewX(16deg); }
  55% { transform: scaleX(1.28) skewX(-13deg); }
  75% { transform: scaleX(1.22) skewX(11deg); }
  100% { transform: scaleX(1) skewX(0); }
}
@keyframes aa-slam-body { 0%,100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-24px) rotate(-8deg); } 55% { transform: translateY(18px) rotate(6deg); } }
@keyframes aa-slam-butt { 0%,100% { transform: scale(1); } 30% { transform: scale(1.1,0.9); } 55% { transform: scale(1.7,1.5); } }

/* kicks */
.aa-dancer[data-move="leftKick"] .aa-leg-l { animation: aa-kick-l 420ms steps(2,end) 1; transform-origin: 60px 108px; }
.aa-dancer[data-move="rightKick"] .aa-leg-r { animation: aa-kick-r 420ms steps(2,end) 1; transform-origin: 60px 108px; }
@keyframes aa-kick-l { 0%,100% { transform: rotate(0); } 50% { transform: rotate(52deg); } }
@keyframes aa-kick-r { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-52deg); } }

/* punches */
.aa-dancer[data-move="leftPunch"] .aa-arm-l { animation: aa-punch-l 360ms steps(2,end) 1; transform-origin: 60px 64px; }
.aa-dancer[data-move="rightPunch"] .aa-arm-r { animation: aa-punch-r 360ms steps(2,end) 1; transform-origin: 60px 64px; }
.aa-dancer[data-move="leftPunch"] .aa-dancer-svg,
.aa-dancer[data-move="rightPunch"] .aa-dancer-svg { animation: aa-punch-lean 360ms ease-out 1; }
@keyframes aa-punch-l { 0%,100% { transform: rotate(0) translateX(0); } 45% { transform: rotate(38deg) translateX(-10px); } }
@keyframes aa-punch-r { 0%,100% { transform: rotate(0) translateX(0); } 45% { transform: rotate(-38deg) translateX(10px); } }
@keyframes aa-punch-lean { 0%,100% { transform: translateX(0); } 45% { transform: translateX(6px); } }

/* diaper throw */
.aa-dancer[data-move="diaperThrow"] .aa-arms { animation: aa-throw-arms 820ms ease-out 1; }
.aa-dancer[data-move="diaperThrow"] .aa-dancer-svg { animation: aa-throw-body 820ms ease-out 1; }
.aa-dancer[data-move="diaperThrow"] .aa-diaper { animation: aa-diaper-fly 820ms ease-in 1; }
@keyframes aa-throw-arms { 0% { transform: rotate(0); } 30% { transform: rotate(-120deg); } 55% { transform: rotate(40deg); } 100% { transform: rotate(0); } }
@keyframes aa-throw-body { 0%,100% { transform: rotate(0); } 30% { transform: rotate(-10deg); } 55% { transform: rotate(8deg); } }
@keyframes aa-diaper-fly {
  0% { opacity: 0; transform: translate(0,0) rotate(0) scale(0.9); }
  20% { opacity: 1; transform: translate(4px,-14px) rotate(30deg) scale(1); }
  100% { opacity: 0; transform: translate(74px,-2px) rotate(300deg) scale(0.6); }
}

/* spin / hair flip */
.aa-dancer[data-move="spin"] { animation: aa-spin 660ms steps(6,end) 1; }
@keyframes aa-spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
.aa-dancer[data-move="hairflip"] .aa-hair,
.aa-dancer[data-move="hairflip"] .aa-fringe { animation: aa-hairflip 480ms ease-out 1; }
.aa-dancer[data-move="hairflip"] .aa-head { animation: aa-headflip 480ms ease-out 1; transform-origin: 60px 44px; }
@keyframes aa-hairflip { 0%,100% { transform: rotate(0); } 40% { transform: rotate(-42deg) translateY(-6px); } }
@keyframes aa-headflip { 0%,100% { transform: rotate(0); } 40% { transform: rotate(-16deg); } }

@media (prefers-reduced-motion: reduce) {
  .aa-dancer-svg, .aa-butt, .aa-hair, .aa-fringe, .aa-arms { animation: none !important; }
}
`;
