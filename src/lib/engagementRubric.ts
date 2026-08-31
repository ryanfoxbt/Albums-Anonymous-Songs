// Prisma-free engagement scoring rubric — safe to import from client
// components (the tooltip) as well as the server loaders in
// src/lib/merchEngagement.ts. This file is the single source of truth for
// how a visitor is scored.

export type EngagementInput = {
  sessions: number;
  pageViews: number;
  songPlays: number;
  completedPlays: number;
  listeningSeconds: number;
  mixCount: number;
  subscribed: boolean;
  podcastLinkClicks: number;
};

export type EngagementRule = {
  id: string;
  label: string;
  points: number;
  /** Plain-language "how you earn it", for the tooltip / report. */
  hint: string;
  test: (input: EngagementInput) => boolean;
};

export const ENGAGEMENT_RUBRIC: EngagementRule[] = [
  {
    id: "returning",
    label: "Returning visitor",
    points: 2,
    hint: "Came back for a 2nd session",
    test: (v) => v.sessions >= 2,
  },
  {
    id: "subscribed",
    label: "Subscribed",
    points: 3,
    hint: "On the mailing list",
    test: (v) => v.subscribed,
  },
  {
    id: "made-mix",
    label: "Recorded a DJ mix",
    points: 3,
    hint: "Saved at least one mix in the DJ Booth",
    test: (v) => v.mixCount > 0,
  },
  {
    id: "played-3",
    label: "Played 3+ songs",
    points: 2,
    hint: "3 or more song plays, all-time",
    test: (v) => v.songPlays >= 3,
  },
  {
    id: "finished-song",
    label: "Finished a song",
    points: 1,
    hint: "Listened to at least one song to the end",
    test: (v) => v.completedPlays >= 1,
  },
  {
    id: "listen-5m",
    label: "5+ min listening",
    points: 2,
    hint: "5+ minutes of total listening time",
    test: (v) => v.listeningSeconds >= 300,
  },
  {
    id: "listen-20m",
    label: "20+ min listening",
    points: 1,
    hint: "Another point at 20+ minutes total",
    test: (v) => v.listeningSeconds >= 1200,
  },
  {
    id: "pageviews-8",
    label: "8+ pageviews",
    points: 1,
    hint: "8 or more pageviews, all-time",
    test: (v) => v.pageViews >= 8,
  },
  {
    id: "podcast-click",
    label: "Clicked a podcast link",
    points: 1,
    hint: 'Followed a "first heard on" episode link',
    test: (v) => v.podcastLinkClicks >= 1,
  },
];

/** Highest score a visitor can reach — the sum of every rule. */
export const MAX_ENGAGEMENT_SCORE = ENGAGEMENT_RUBRIC.reduce(
  (sum, rule) => sum + rule.points,
  0,
);

/**
 * A visitor at or above this score is "engaged" — the merch link shows,
 * and they land in the engaged bucket on the report.
 */
export const ENGAGEMENT_THRESHOLD = 5;

export type EngagementTier = {
  id: string;
  label: string;
  min: number;
  /** inclusive upper bound */
  max: number;
  /** tailwind text/bg accent classes for badges */
  className: string;
};

export const ENGAGEMENT_TIERS: EngagementTier[] = [
  {
    id: "passing",
    label: "Passing through",
    min: 0,
    max: 2,
    className: "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60",
  },
  {
    id: "warming",
    label: "Warming up",
    min: 3,
    max: ENGAGEMENT_THRESHOLD - 1,
    className:
      "bg-amber-400/15 text-amber-700 dark:bg-amber-300/15 dark:text-amber-300",
  },
  {
    id: "engaged",
    label: "Engaged",
    min: ENGAGEMENT_THRESHOLD,
    max: 8,
    className:
      "bg-[#F760D6]/10 text-[#c026a9] dark:bg-[#F760D6]/15 dark:text-[#F760D6]",
  },
  {
    id: "superfan",
    label: "Superfan",
    min: 9,
    max: MAX_ENGAGEMENT_SCORE,
    className:
      "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
];

export function engagementTier(score: number): EngagementTier {
  return (
    ENGAGEMENT_TIERS.find((tier) => score >= tier.min && score <= tier.max) ??
    ENGAGEMENT_TIERS[0]
  );
}

export type EngagementSignal = { id: string; label: string; points: number };

export type EngagementBreakdown = {
  score: number;
  engaged: boolean;
  tier: EngagementTier;
  signals: EngagementSignal[];
};

export const NEUTRAL_ENGAGEMENT: EngagementBreakdown = {
  score: 0,
  engaged: false,
  tier: ENGAGEMENT_TIERS[0],
  signals: [],
};

export function scoreEngagement(input: EngagementInput): EngagementBreakdown {
  const signals: EngagementSignal[] = [];
  let score = 0;
  for (const rule of ENGAGEMENT_RUBRIC) {
    if (rule.test(input)) {
      score += rule.points;
      signals.push({ id: rule.id, label: rule.label, points: rule.points });
    }
  }
  return {
    score,
    engaged: score >= ENGAGEMENT_THRESHOLD,
    tier: engagementTier(score),
    signals,
  };
}
