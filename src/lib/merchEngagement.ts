import { prisma } from "@/lib/prisma";
import {
  NEUTRAL_ENGAGEMENT,
  scoreEngagement,
  type EngagementBreakdown,
  type EngagementInput,
} from "@/lib/engagementRubric";

/**
 * Server-side engagement scoring. The rubric itself (rules, points, tiers,
 * threshold) lives in the prisma-free src/lib/engagementRubric.ts so the
 * admin tooltip can share it; this module just loads the numbers a visitor
 * has racked up and runs them through {@link scoreEngagement}.
 *
 * Drives:
 *  - whether the header's merch link is shown (src/app/api/merch-variant)
 *  - the admin "Engagement" analytics report (src/lib/analyticsQueries.ts)
 */

export {
  ENGAGEMENT_RUBRIC,
  ENGAGEMENT_THRESHOLD,
  ENGAGEMENT_TIERS,
  MAX_ENGAGEMENT_SCORE,
  engagementTier,
  scoreEngagement,
} from "@/lib/engagementRubric";
export type {
  EngagementBreakdown,
  EngagementInput,
  EngagementRule,
  EngagementSignal,
  EngagementTier,
} from "@/lib/engagementRubric";

function inputFromVisitor(visitor: {
  subscriber: { id: string } | null;
  _count: { sessions: number; podcastLinkClicks: number };
  sessions: { _count: { pageViews: number } }[];
  songPlays: { listenedSeconds: number | null; completed: boolean }[];
  mixCount: number;
}): EngagementInput {
  return {
    sessions: visitor._count.sessions,
    pageViews: visitor.sessions.reduce((sum, s) => sum + s._count.pageViews, 0),
    songPlays: visitor.songPlays.length,
    completedPlays: visitor.songPlays.filter((p) => p.completed).length,
    listeningSeconds: visitor.songPlays.reduce(
      (sum, p) => sum + (p.listenedSeconds ?? 0),
      0,
    ),
    mixCount: visitor.mixCount,
    subscribed: visitor.subscriber != null,
    podcastLinkClicks: visitor._count.podcastLinkClicks,
  };
}

const VISITOR_SCORING_SELECT = {
  subscriber: { select: { id: true } },
  _count: { select: { sessions: true, podcastLinkClicks: true } },
  sessions: { select: { _count: { select: { pageViews: true } } } },
  songPlays: { select: { listenedSeconds: true, completed: true } },
} as const;

/** Mixes recorded per visitor, keyed by visitor id (anonymous mixes dropped). */
async function mixCountsByVisitor(
  visitorIds?: string[],
): Promise<Map<string, number>> {
  const rows = await prisma.djMix.groupBy({
    by: ["visitorId"],
    where: { visitorId: visitorIds ? { in: visitorIds } : { not: null } },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.visitorId) map.set(row.visitorId, row._count._all);
  }
  return map;
}

/** Score one visitor (used by the merch-link gate and the visitor profile). */
export async function getVisitorEngagement(
  visitorId: string | null | undefined,
): Promise<EngagementBreakdown> {
  if (!visitorId) return NEUTRAL_ENGAGEMENT;

  const [visitor, mixCount] = await Promise.all([
    prisma.visitor.findUnique({
      where: { id: visitorId },
      select: VISITOR_SCORING_SELECT,
    }),
    prisma.djMix.count({ where: { visitorId } }),
  ]);
  if (!visitor) return NEUTRAL_ENGAGEMENT;

  return scoreEngagement(inputFromVisitor({ ...visitor, mixCount }));
}

/** Score a specific set of visitors in a fixed number of queries (no N+1). */
export async function scoreVisitors(
  visitorIds: string[],
): Promise<Map<string, EngagementBreakdown>> {
  const result = new Map<string, EngagementBreakdown>();
  if (visitorIds.length === 0) return result;

  const [visitors, mixCounts] = await Promise.all([
    prisma.visitor.findMany({
      where: { id: { in: visitorIds } },
      select: { id: true, ...VISITOR_SCORING_SELECT },
    }),
    mixCountsByVisitor(visitorIds),
  ]);

  for (const visitor of visitors) {
    result.set(
      visitor.id,
      scoreEngagement(
        inputFromVisitor({
          ...visitor,
          mixCount: mixCounts.get(visitor.id) ?? 0,
        }),
      ),
    );
  }
  return result;
}

export type ScoredVisitor = { id: string; breakdown: EngagementBreakdown };

/**
 * Score every visitor matching `where` (defaults to all). Returns one entry
 * per visitor; callers aggregate. Kept to a handful of queries regardless of
 * how many visitors there are.
 */
export async function scoreAllVisitors(
  where: { id?: { notIn: string[] } } = {},
): Promise<ScoredVisitor[]> {
  const [visitors, mixCounts] = await Promise.all([
    prisma.visitor.findMany({
      where,
      select: { id: true, ...VISITOR_SCORING_SELECT },
    }),
    mixCountsByVisitor(),
  ]);

  return visitors.map((visitor) => ({
    id: visitor.id,
    breakdown: scoreEngagement(
      inputFromVisitor({
        ...visitor,
        mixCount: mixCounts.get(visitor.id) ?? 0,
      }),
    ),
  }));
}
