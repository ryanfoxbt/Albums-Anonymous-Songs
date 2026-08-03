"use client";

import { useEffect, useMemo, useState } from "react";
import { StickFigure } from "./StickFigure";

const TEXT = "Troy Runsten & Ryan Fox";

type Phase = "scattered" | "shockwave" | "tornado" | "assembled";

// Integer-only hash (no Math.sin/transcendental ops) so SSR and client
// produce bit-identical values — trig-based PRNGs can differ in the last
// bits between server (Node V8) and browser (Chromium V8) builds.
function hash(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function seededRand(seed: number, min: number, max: number) {
  return min + hash(seed) * (max - min);
}

export function HeroTitleAnimation() {
  const [phase, setPhase] = useState<Phase>("scattered");
  const [fartKey] = useState(1);

  const letters = useMemo(
    () =>
      TEXT.split("").map((char, i) => ({
        char,
        scatterX: seededRand(i + 1, -46, 46),
        scatterY: seededRand(i + 7, -34, 34),
        scatterRot: seededRand(i + 13, -140, 140),
        tornadoX: seededRand(i + 3, -8, 8),
        tornadoY: ((i % 5) - 2) * 6,
        tornadoRot: 640 + i * 27 * (i % 2 === 0 ? 1 : -1),
      })),
    [],
  );

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("shockwave"), 260);
    const t2 = setTimeout(() => setPhase("tornado"), 900);
    const t3 = setTimeout(() => setPhase("assembled"), 1750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center pt-9">
      <div
        className={`absolute top-0 left-1/2 h-9 w-9 -translate-x-1/2 text-black/70 transition-opacity duration-500 dark:text-white/70 ${
          phase === "tornado" || phase === "assembled" ? "opacity-0" : "opacity-100"
        }`}
      >
        <StickFigure pose="fart" fartKey={fartKey} className="h-full w-full" />
      </div>

      <p
        aria-label={TEXT}
        className={`relative whitespace-pre text-xs text-black/40 dark:text-white/40 ${
          phase === "shockwave" ? "animate-[shockShake_0.4s_ease-in-out]" : ""
        }`}
      >
        {letters.map((l, i) => {
          let transform = "translate(0,0) rotate(0deg) scale(1)";
          if (phase === "scattered" || phase === "shockwave") {
            transform = `translate(${l.scatterX}px, ${l.scatterY}px) rotate(${l.scatterRot}deg) scale(0.85)`;
          } else if (phase === "tornado") {
            transform = `translate(${l.tornadoX}px, ${l.tornadoY}px) rotate(${l.tornadoRot}deg) scale(0.6)`;
          }
          const delay = phase === "assembled" ? `${i * 22}ms` : "0ms";
          return (
            <span
              key={i}
              aria-hidden="true"
              className="inline-block"
              style={{
                transform,
                transitionProperty: "transform",
                transitionDuration: "750ms",
                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                transitionDelay: delay,
              }}
            >
              {l.char === " " ? " " : l.char}
            </span>
          );
        })}
      </p>
    </div>
  );
}
