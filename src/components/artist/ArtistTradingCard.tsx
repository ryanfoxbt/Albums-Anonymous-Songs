"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import { CARD_SERIES, type ArtistCard } from "@/lib/artistCards";

const HOLO_BY_RARITY: Record<ArtistCard["rarity"], number> = {
  1: 0.3,
  2: 0.52,
  3: 0.74,
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ArtistTradingCard({ card }: { card: ArtistCard }) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const holoMax = HOLO_BY_RARITY[card.rarity];

  const setVars = useCallback((vars: Record<string, string>) => {
    const el = ref.current;
    if (!el) return;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  }, []);

  const rest = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setVars({
      "--rx": "0deg",
      "--ry": "0deg",
      "--mx": "50%",
      "--my": "50%",
      "--holo": "0",
      "--glare": "0",
    });
  }, [setVars]);

  const track = useCallback(
    (clientX: number, clientY: number) => {
      if (prefersReducedMotion() || frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const nx = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
        const ny = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
        setVars({
          "--ry": `${(nx - 0.5) * 12}deg`,
          "--rx": `${(0.5 - ny) * 10}deg`,
          "--mx": `${nx * 100}%`,
          "--my": `${ny * 100}%`,
          "--holo": String(holoMax),
          "--glare": "1",
        });
      });
    },
    [holoMax, setVars],
  );

  const stars =
    "★".repeat(card.rarity) + "☆".repeat(3 - card.rarity);

  return (
    <article
      ref={ref}
      tabIndex={0}
      aria-roledescription="Trading card"
      className="aacard"
      style={
        {
          "--accent": card.accent,
          "--accent-ink": card.accentInk,
        } as React.CSSProperties
      }
      onPointerMove={(e) => track(e.clientX, e.clientY)}
      onPointerLeave={rest}
      onFocus={() =>
        setVars({ "--rx": "3deg", "--ry": "-4deg", "--holo": String(holoMax * 0.7) })
      }
      onBlur={rest}
    >
      <style>{CARD_CSS}</style>

      <div className="aacard-frame">
        <div className="aacard-panel">
          <header className="aacard-head">
            <div className="aacard-id">
              <h3 className="aacard-name">{card.name}</h3>
              <p className="aacard-title">{card.title}</p>
            </div>
            <div className="aacard-stat">
              <span className="aacard-stat-label">{card.stat.label}</span>
              <span className="aacard-stat-value">{card.stat.value}</span>
            </div>
          </header>

          <span className="aacard-style">
            {card.style.icon} {card.style.label} Style
          </span>

          <div className="aacard-art">
            {card.image.endsWith(".svg") || card.image.startsWith("http") ? (
              // Inline SVG art and admin-uploaded blob URLs bypass the
              // image optimiser; the baked-in /public PNGs still use it.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.image}
                alt={card.imageAlt}
                loading="lazy"
                decoding="async"
                className="aacard-art-img aacard-art-img--fill"
              />
            ) : (
              <Image
                src={card.image}
                alt={card.imageAlt}
                fill
                sizes="(max-width: 480px) 86vw, 360px"
                className="aacard-art-img"
              />
            )}
            <span className="aacard-art-no">No. {card.number}</span>
            <span className="aacard-art-set">{CARD_SERIES.edition}</span>
          </div>

          <div className="aacard-tracks">
            {card.tracks.map((t) => (
              <div key={t.name} className="aacard-track">
                <span className="aacard-track-cost" aria-hidden>
                  {t.cost}
                </span>
                <div className="aacard-track-body">
                  <span className="aacard-track-name">{t.name}</span>
                  <span className="aacard-track-text">{t.text}</span>
                </div>
                <span className="aacard-track-hype">{t.hype}</span>
              </div>
            ))}
          </div>

          <dl className="aacard-rules">
            <div>
              <dt>Bombs at</dt>
              <dd>{card.bombsAt}</dd>
            </div>
            <div>
              <dt>Shrugs off</dt>
              <dd>{card.shrugsOff}</dd>
            </div>
            <div>
              <dt>Exit cost</dt>
              <dd>{card.exitCost}</dd>
            </div>
          </dl>

          <p className="aacard-flavor">{card.flavor}</p>

          <footer className="aacard-foot">
            <span>
              {CARD_SERIES.name} · {CARD_SERIES.edition}
            </span>
            <span>
              <span className="aacard-stars" aria-label={`Rarity ${card.rarity} of 3`}>
                {stars}
              </span>{" "}
              {card.number}/{String(CARD_SERIES.total).padStart(3, "0")}
            </span>
          </footer>
        </div>

        <div className="aacard-holo" aria-hidden />
        <div className="aacard-glare" aria-hidden />
      </div>
    </article>
  );
}

const CARD_CSS = `
.aacard {
  --rx: 0deg; --ry: 0deg; --mx: 50%; --my: 50%; --holo: 0; --glare: 0;
  display: block;
  width: min(360px, 86vw);
  aspect-ratio: 5 / 7;
  font-size: clamp(11.5px, 3.5vw, 15px);
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
  color: #1a1712;
  perspective: 1100px;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.aacard-frame {
  position: relative;
  height: 100%;
  border-radius: 5.4% / 3.9%;
  padding: 0.5em;
  background:
    linear-gradient(150deg, #14140f 0%, #2c2c22 46%, #14140f 100%);
  box-shadow:
    0 1px 0 rgba(255,255,255,.08) inset,
    0 18px 40px -18px rgba(0,0,0,.55),
    0 4px 12px -6px rgba(0,0,0,.4);
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transform-style: preserve-3d;
  transition: transform .2s ease;
}
@media (prefers-reduced-motion: reduce) {
  .aacard-frame { transition: none; transform: none; }
}
.aacard:focus-visible .aacard-frame {
  box-shadow:
    0 0 0 3px #fff, 0 0 0 6px var(--accent),
    0 18px 40px -18px rgba(0,0,0,.55);
}
.aacard-panel {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 3.6% / 2.6%;
  padding: 0.72em 0.72em 0.6em;
  background:
    radial-gradient(130% 90% at 50% -12%, #fffdf6 0%, #f5eedb 48%, #ece1c5 100%);
  background-color: #f4ecd8;
  border: 0.42em solid var(--accent);
  box-shadow: 0 0 0 1px rgba(0,0,0,.25) inset;
}
.aacard-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5em;
}
.aacard-id { min-width: 0; }
.aacard-name {
  margin: 0;
  font-size: 1.32em;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}
.aacard-title {
  margin: 0.18em 0 0;
  font-size: 0.58em;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  opacity: 0.62;
}
.aacard-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1;
  flex-shrink: 0;
  text-align: right;
}
.aacard-stat-label {
  font-size: 0.42em;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  opacity: 0.6;
  white-space: nowrap;
}
.aacard-stat-value {
  font-size: 1.55em;
  font-weight: 800;
  margin-top: 0.12em;
}
.aacard-style {
  align-self: flex-start;
  margin-top: 0.5em;
  padding: 0.16em 0.6em;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 0.58em;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  box-shadow: 0 1px 2px rgba(0,0,0,.25);
}
.aacard-art {
  position: relative;
  margin-top: 0.5em;
  aspect-ratio: 16 / 10;
  border: 0.3em solid var(--accent);
  border-radius: 0.35em;
  overflow: hidden;
  background: #0d0d10;
  box-shadow: 0 2px 6px -2px rgba(0,0,0,.5) inset;
}
.aacard-art-img { object-fit: cover; }
.aacard-art-img--fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.aacard-art-no,
.aacard-art-set {
  position: absolute;
  bottom: 0.3em;
  padding: 0.1em 0.4em;
  border-radius: 0.25em;
  background: rgba(0,0,0,.62);
  color: #fff;
  font-size: 0.5em;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.aacard-art-no { left: 0.3em; }
.aacard-art-set { right: 0.3em; font-weight: 500; opacity: 0.85; }
.aacard-tracks { margin-top: 0.5em; }
.aacard-track {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5em;
  align-items: center;
  padding: 0.42em 0;
}
.aacard-track + .aacard-track { border-top: 1px solid rgba(0,0,0,.13); }
.aacard-track-cost { font-size: 0.9em; white-space: nowrap; }
.aacard-track-body { display: flex; flex-direction: column; min-width: 0; }
.aacard-track-name { font-size: 0.92em; font-weight: 800; }
.aacard-track-text {
  font-size: 0.64em;
  line-height: 1.28;
  opacity: 0.8;
  margin-top: 0.14em;
}
.aacard-track-hype {
  font-size: 1.5em;
  font-weight: 800;
  line-height: 1;
}
.aacard-rules {
  margin: 0.4em 0 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4em;
  padding: 0.4em 0;
  border-top: 1px solid rgba(0,0,0,.18);
  border-bottom: 1px solid rgba(0,0,0,.18);
}
.aacard-rules div { min-width: 0; }
.aacard-rules dt {
  font-size: 0.5em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.55;
}
.aacard-rules dd {
  margin: 0.14em 0 0;
  font-size: 0.58em;
  font-weight: 600;
  line-height: 1.2;
}
.aacard-flavor {
  margin: 0.42em 0 0;
  font-size: 0.63em;
  font-style: italic;
  line-height: 1.32;
  opacity: 0.82;
}
.aacard-foot {
  margin-top: auto;
  padding-top: 0.4em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5em;
  font-size: 0.48em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.62;
}
.aacard-stars { letter-spacing: 0.06em; color: var(--accent); filter: brightness(0.8); }

/* holo + glare — pure decoration */
.aacard-holo,
.aacard-glare {
  position: absolute;
  inset: 0.5em;
  border-radius: 3.6% / 2.6%;
  pointer-events: none;
  z-index: 2;
}
.aacard-holo {
  opacity: var(--holo);
  transition: opacity .3s ease;
  mix-blend-mode: overlay;
  will-change: opacity, background-position;
  background:
    linear-gradient(110deg,
      transparent 18%,
      rgba(255,255,255,.85) 32%,
      rgba(255,255,255,.2) 38%,
      rgba(255,60,210,.55) 48%,
      rgba(120,220,255,.55) 56%,
      rgba(255,255,255,.15) 62%,
      transparent 76%),
    conic-gradient(from 210deg at 50% 50%,
      rgba(255,0,128,.55), rgba(255,200,0,.4),
      rgba(0,255,150,.5), rgba(70,110,255,.6),
      rgba(200,0,255,.5), rgba(255,0,128,.55));
  background-size: 280% 280%, 200% 200%;
  background-position:
    calc(var(--mx) * -1.4) calc(var(--my) * -1.4),
    center;
}
.aacard-glare {
  opacity: var(--glare);
  transition: opacity .2s ease;
  mix-blend-mode: overlay;
  background: radial-gradient(circle at var(--mx) var(--my),
    rgba(255,255,255,.65), rgba(255,255,255,0) 45%);
}
@media (prefers-reduced-motion: reduce) {
  .aacard-holo, .aacard-glare { transition: none; }
}
`;
