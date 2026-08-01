"use client";

import { useMemo, useRef, useState } from "react";
import { formatArtistCredit } from "@/lib/artistCredit";
import type { SongWithRelations } from "@/lib/songs";
import { usePlayer } from "./player/PlayerProvider";

const VIEW = 300;
const CENTER = { x: 150, y: 165 };
const OUTER_RADIUS = 120;
const LABEL_RADIUS = 42;
const INNER_TRACK_RADIUS = 58;
const GROOVE_ANGLE = (-40 * Math.PI) / 180;
const REST_ANGLE = (-65 * Math.PI) / 180;
const REST_RADIUS = OUTER_RADIUS + 20;
const PIVOT = { x: 258, y: 25 };

type Point = { x: number; y: number };

function pointAt(angle: number, radius: number): Point {
  return {
    x: CENTER.x + Math.cos(angle) * radius,
    y: CENTER.y + Math.sin(angle) * radius,
  };
}

function grooveRadius(index: number, total: number): number {
  if (total <= 1) return OUTER_RADIUS;
  return OUTER_RADIUS + ((INNER_TRACK_RADIUS - OUTER_RADIUS) * index) / (total - 1);
}

export function RecordPlayer({
  songs,
  slug,
}: {
  songs: SongWithRelations[];
  slug: string;
}) {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startClientRef = useRef<Point>({ x: 0, y: 0 });
  const lastAppliedRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const points = useMemo<Point[]>(() => {
    const rest = pointAt(REST_ANGLE, REST_RADIUS);
    const grooves = songs.map((_, index) =>
      pointAt(GROOVE_ANGLE, grooveRadius(index, songs.length)),
    );
    return [rest, ...grooves];
  }, [songs]);

  const activeSongIndex = currentSong
    ? songs.findIndex((song) => song.id === currentSong.id)
    : -1;
  const settledIndex = activeSongIndex >= 0 ? activeSongIndex + 1 : 0;
  const displayIndex = dragIndex ?? settledIndex;
  const spinning = isPlaying && displayIndex > 0;

  const toSvgPoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW,
      y: ((clientY - rect.top) / rect.height) * VIEW,
    };
  };

  const nearestIndex = (point: Point): number => {
    let best = 0;
    let bestDist = Infinity;
    points.forEach((candidate, index) => {
      const dist =
        (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    return best;
  };

  const applySelection = (index: number, liveDrag: boolean) => {
    if (index === 0) {
      if (isPlaying) togglePlay();
      return;
    }
    const song = songs[index - 1];
    if (currentSong?.id === song.id) {
      if (!liveDrag) togglePlay();
      return;
    }
    playSong({
      id: song.id,
      title: song.title,
      artistName: formatArtistCredit(song),
      src: song.audioUrl,
      podcastEpisodeTitle: song.podcastEpisodeTitle,
      podcastEpisodeUrl: song.podcastEpisodeUrl,
    });
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    movedRef.current = false;
    startClientRef.current = { x: event.clientX, y: event.clientY };
    lastAppliedRef.current = displayIndex;
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - startClientRef.current.x;
    const dy = event.clientY - startClientRef.current.y;
    if (Math.hypot(dx, dy) > 4) movedRef.current = true;

    const index = nearestIndex(toSvgPoint(event.clientX, event.clientY));
    setDragIndex(index);
    if (index !== lastAppliedRef.current) {
      applySelection(index, true);
      lastAppliedRef.current = index;
    }
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    if (!movedRef.current) {
      applySelection(displayIndex, false);
    }
    setDragIndex(null);
  };

  const tip = points[displayIndex];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — nothing else to do.
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="w-full max-w-xs touch-none select-none"
      >
        <g
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
          className={spinning ? "[animation:spin_2.4s_linear_infinite]" : ""}
        >
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={OUTER_RADIUS}
            className="fill-black dark:fill-white/90"
          />
          {songs.map((song, index) => {
            const radius = grooveRadius(index, songs.length);
            const isActive = displayIndex === index + 1;
            return (
              <circle
                key={song.id}
                cx={CENTER.x}
                cy={CENTER.y}
                r={radius}
                fill="none"
                stroke={isActive ? "#F760D6" : "currentColor"}
                strokeOpacity={isActive ? 0.9 : 0.15}
                strokeWidth={isActive ? 2 : 1}
                className="text-white dark:text-black"
              />
            );
          })}
          <circle
            cx={CENTER.x}
            cy={CENTER.y}
            r={LABEL_RADIUS}
            className="fill-[#F760D6]"
          />
          <text
            x={CENTER.x}
            y={CENTER.y - 4}
            textAnchor="middle"
            className="fill-white text-[7px] font-bold uppercase tracking-wide"
          >
            Albums
          </text>
          <text
            x={CENTER.x}
            y={CENTER.y + 8}
            textAnchor="middle"
            className="fill-white text-[7px] font-bold uppercase tracking-wide"
          >
            Anonymous
          </text>
          <circle cx={CENTER.x} cy={CENTER.y} r={3} className="fill-black/60" />
        </g>

        <line
          x1={PIVOT.x}
          y1={PIVOT.y}
          x2={tip.x}
          y2={tip.y}
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          className="text-black/70 dark:text-white/70"
        />
        <circle
          cx={PIVOT.x}
          cy={PIVOT.y}
          r={8}
          className="fill-black/70 dark:fill-white/70"
        />

        <g
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="cursor-grab touch-none active:cursor-grabbing"
        >
          <circle cx={tip.x} cy={tip.y} r={22} fill="transparent" />
          <circle
            cx={tip.x}
            cy={tip.y}
            r={6}
            className="fill-[#F760D6] stroke-white stroke-2 dark:stroke-black"
          />
        </g>
      </svg>

      <ol className="flex w-full max-w-xs flex-col gap-1">
        {songs.map((song, index) => {
          const isActive = displayIndex === index + 1;
          return (
            <li key={song.id}>
              <button
                type="button"
                onClick={() => applySelection(index + 1, false)}
                className={`flex w-full touch-manipulation items-center gap-2 rounded-full px-3 py-2.5 text-left text-sm ${
                  isActive
                    ? "bg-[#F760D6] text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                <span
                  className={`w-4 shrink-0 ${
                    isActive ? "text-white" : "text-black/40 dark:text-white/40"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {song.title}{" "}
                  <span className={isActive ? "text-white/80" : "text-black/50 dark:text-white/50"}>
                    — {formatArtistCredit(song)}
                  </span>
                </span>
                {isActive && isPlaying && (
                  <span className="shrink-0 text-xs">Playing</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={handleCopyLink}
        className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
      >
        {copied ? "Link copied!" : `Copy link to /record/${slug}`}
      </button>
    </div>
  );
}
