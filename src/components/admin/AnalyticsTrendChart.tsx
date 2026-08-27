"use client";

import { useMemo, useRef, useState } from "react";
import type { DailyMetrics } from "@/lib/analyticsQueries";
import { PACIFIC_TIME_ZONE } from "@/lib/timezone";

const METRICS = [
  { key: "visitors", label: "Visitors" },
  { key: "sessions", label: "Sessions" },
  { key: "pageviews", label: "Pageviews" },
  { key: "songPlays", label: "Song plays" },
  { key: "listeningMinutes", label: "Listening minutes" },
] as const satisfies { key: keyof DailyMetrics; label: string }[];

type MetricKey = (typeof METRICS)[number]["key"];

const VIEW_W = 720;
const VIEW_H = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

const LINE_CLASS = "stroke-[#2a78d6] dark:stroke-[#3987e5]";
const FILL_CLASS = "fill-[#2a78d6]/10 dark:fill-[#3987e5]/10";
const DOT_CLASS = "fill-[#2a78d6] dark:fill-[#3987e5]";

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function formatAxisDate(dayKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(new Date(`${dayKey}T12:00:00Z`));
}

function formatTooltipDate(dayKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dayKey}T12:00:00Z`));
}

export function AnalyticsTrendChart({ data }: { data: DailyMetrics[] }) {
  const [metric, setMetric] = useState<MetricKey>("visitors");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const n = data.length;
  const values = useMemo(() => data.map((d) => d[metric]), [data, metric]);
  const max = useMemo(() => niceMax(Math.max(0, ...values)), [values]);

  const xAt = (i: number) => PAD_LEFT + (n <= 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W);
  const yAt = (v: number) => PAD_TOP + PLOT_H - (v / max) * PLOT_H;

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`)
    .join(" ");
  const areaPath =
    n > 0
      ? `${linePath} L${xAt(n - 1)},${PAD_TOP + PLOT_H} L${xAt(0)},${PAD_TOP + PLOT_H} Z`
      : "";

  const yTicks = [0, max / 2, max];

  // A handful of evenly spaced x-axis date labels — never one per day.
  const labelCount = Math.min(n, 6);
  const xLabelIndices = useMemo(() => {
    if (n === 0) return [];
    if (labelCount <= 1) return [0];
    return Array.from({ length: labelCount }, (_, i) =>
      Math.round((i / (labelCount - 1)) * (n - 1)),
    );
  }, [n, labelCount]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const wrapper = wrapperRef.current;
    if (!wrapper || n === 0) return;
    const rect = wrapper.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const svgX = fraction * VIEW_W;
    const index = Math.round(((svgX - PAD_LEFT) / PLOT_W) * (n - 1));
    setHoverIndex(Math.min(n - 1, Math.max(0, index)));
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoverFractionPct =
    hoverIndex !== null && n > 1 ? (hoverIndex / (n - 1)) * 100 : null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          Visits &amp; engagement over time
        </h2>
        <div className="flex flex-wrap gap-1 text-xs">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={`rounded-full px-2.5 py-1 font-medium ${
                metric === m.key
                  ? "bg-foreground text-background"
                  : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {n === 0 ? (
        <p className="py-8 text-center text-sm text-black/50 dark:text-white/50">
          No data in this range yet.
        </p>
      ) : (
        <div
          ref={wrapperRef}
          className="relative"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="h-56 w-full touch-none sm:h-64"
          >
            {yTicks.map((tick) => (
              <line
                key={tick}
                x1={PAD_LEFT}
                x2={VIEW_W - PAD_RIGHT}
                y1={yAt(tick)}
                y2={yAt(tick)}
                vectorEffect="non-scaling-stroke"
                className="stroke-black/10 dark:stroke-white/10"
                strokeWidth={1}
              />
            ))}
            {yTicks.map((tick) => (
              <text
                key={tick}
                x={PAD_LEFT - 6}
                y={yAt(tick)}
                dominantBaseline="middle"
                textAnchor="end"
                fontSize={10}
                className="fill-black/40 dark:fill-white/40"
              >
                {Math.round(tick).toLocaleString()}
              </text>
            ))}

            {xLabelIndices.map((i) => (
              <text
                key={i}
                x={xAt(i)}
                y={VIEW_H - 6}
                textAnchor="middle"
                fontSize={10}
                className="fill-black/40 dark:fill-white/40"
              >
                {formatAxisDate(data[i].date)}
              </text>
            ))}

            <path d={areaPath} className={FILL_CLASS} stroke="none" />
            <path
              d={linePath}
              fill="none"
              className={LINE_CLASS}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* End-of-line marker */}
            <circle cx={xAt(n - 1)} cy={yAt(values[n - 1])} r={6} className="fill-background" />
            <circle cx={xAt(n - 1)} cy={yAt(values[n - 1])} r={4} className={DOT_CLASS} />

            {hoverIndex !== null && (
              <>
                <line
                  x1={xAt(hoverIndex)}
                  x2={xAt(hoverIndex)}
                  y1={PAD_TOP}
                  y2={PAD_TOP + PLOT_H}
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={1}
                  className="stroke-black/20 dark:stroke-white/20"
                />
                <circle
                  cx={xAt(hoverIndex)}
                  cy={yAt(values[hoverIndex])}
                  r={6}
                  className="fill-background"
                />
                <circle
                  cx={xAt(hoverIndex)}
                  cy={yAt(values[hoverIndex])}
                  r={4}
                  className={DOT_CLASS}
                />
              </>
            )}
          </svg>

          {hovered && hoverFractionPct !== null && (
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-black/10 bg-background px-2 py-1 text-xs shadow-md dark:border-white/10"
              style={{
                left: `${hoverFractionPct}%`,
                maxWidth: "calc(100% - 8px)",
              }}
            >
              <p className="whitespace-nowrap font-semibold">
                {hovered[metric].toLocaleString()}
              </p>
              <p className="whitespace-nowrap text-black/50 dark:text-white/50">
                {formatTooltipDate(hovered.date)}
              </p>
            </div>
          )}
        </div>
      )}

      {n > 0 && (
        <details className="text-xs text-black/50 dark:text-white/50">
          <summary className="cursor-pointer select-none">View as table</summary>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="px-2 py-1 font-medium">Date</th>
                  {METRICS.map((m) => (
                    <th key={m.key} className="px-2 py-1 text-right font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.date} className="border-b border-black/5 dark:border-white/5">
                    <td className="px-2 py-1 tabular-nums">{formatAxisDate(row.date)}</td>
                    {METRICS.map((m) => (
                      <td key={m.key} className="px-2 py-1 text-right tabular-nums">
                        {row[m.key].toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
