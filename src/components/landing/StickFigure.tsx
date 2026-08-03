"use client";

type Pose = "idle" | "fart";

export function StickFigure({
  pose = "idle",
  fartKey = 0,
  className = "",
}: {
  pose?: Pose;
  fartKey?: number;
  className?: string;
}) {
  const showFart = pose === "fart";

  return (
    <svg viewBox="0 0 100 150" className={className} aria-hidden="true">
      {showFart && (
        <g key={fartKey}>
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={50}
              cy={99}
              r={5 + i * 2}
              className="fill-current opacity-70"
              style={{
                animation: `puffOut ${600 + i * 120}ms ease-out ${i * 70}ms forwards`,
                ["--puff-x" as string]: `${(i % 2 === 0 ? -1 : 1) * (14 + i * 6)}px`,
                ["--puff-y" as string]: `${18 + i * 10}px`,
              }}
            />
          ))}
          {[0, 1, 2].map((i) => (
            <line
              key={`l${i}`}
              x1={50}
              y1={99}
              x2={64}
              y2={99}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              style={{
                transformOrigin: "50px 99px",
                ["--line-rot" as string]: `${20 + i * 22}deg`,
                animation: `fartLine 700ms ease-out ${i * 80}ms forwards`,
              }}
            />
          ))}
        </g>
      )}

      {/* legs */}
      <line x1="50" y1="98" x2="36" y2="130" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="98" x2="64" y2="130" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

      {/* big butt */}
      <ellipse
        cx="50"
        cy="82"
        rx="24"
        ry="17"
        fill="currentColor"
        opacity="0.12"
        stroke="currentColor"
        strokeWidth="4"
      />

      {/* torso */}
      <line x1="50" y1="30" x2="50" y2="72" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

      {/* arms */}
      <line x1="50" y1="40" x2="30" y2="58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="40" x2="70" y2="58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />

      {/* head */}
      <circle cx="50" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
