import { prisma } from "@/lib/prisma";

/**
 * Whether a visitor is engaged enough with the site to be shown the
 * header's merch link. The link is hidden by default (see
 * SiteSetting.merchLinkGateEnabled) and only appears once a visitor's
 * all-time activity on this browser clears {@link ENGAGEMENT_THRESHOLD}.
 *
 * Scoring is deliberately simple and additive — each signal is something
 * a casual first-time visitor almost never does, and a few together mean
 * "this person actually likes the stuff here, a merch pitch is fair game":
 *
 *   Returning visitor (2+ sessions) ............ 2
 *   Subscribed to the mailing list ............. 3
 *   Recorded a mix in the DJ Booth ............. 3
 *   Played 3+ songs ........................... 2
 *   Finished at least one song ................. 1
 *   5+ minutes of total listening ............. 2   (+1 more at 20+ min)
 *   8+ pageviews all-time .................... 1
 *   Clicked a "first heard on" podcast link ... 1
 *
 * Threshold is 5, so e.g. a subscriber who came back once (3+2), or
 * someone who played a few songs for 5+ minutes and finished one
 * (2+2+1), qualifies; a one-visit skim does not.
 */
export const ENGAGEMENT_THRESHOLD = 5;

export type EngagementBreakdown = {
  score: number;
  engaged: boolean;
  signals: string[];
};

const NEUTRAL: EngagementBreakdown = { score: 0, engaged: false, signals: [] };

export async function getVisitorEngagement(
  visitorId: string | null | undefined,
): Promise<EngagementBreakdown> {
  if (!visitorId) return NEUTRAL;

  const [visitor, mixCount] = await Promise.all([
    prisma.visitor.findUnique({
      where: { id: visitorId },
      select: {
        subscriber: { select: { id: true } },
        _count: { select: { sessions: true, podcastLinkClicks: true } },
        sessions: { select: { _count: { select: { pageViews: true } } } },
        songPlays: { select: { listenedSeconds: true, completed: true } },
      },
    }),
    prisma.djMix.count({ where: { visitorId } }),
  ]);

  if (!visitor) return NEUTRAL;

  const pageViews = visitor.sessions.reduce(
    (sum, session) => sum + session._count.pageViews,
    0,
  );
  const songPlays = visitor.songPlays.length;
  const completedPlays = visitor.songPlays.filter((play) => play.completed).length;
  const listeningSeconds = visitor.songPlays.reduce(
    (sum, play) => sum + (play.listenedSeconds ?? 0),
    0,
  );

  let score = 0;
  const signals: string[] = [];
  const add = (points: number, label: string) => {
    score += points;
    signals.push(`${label} (+${points})`);
  };

  if (visitor._count.sessions >= 2) add(2, "returning visitor");
  if (visitor.subscriber) add(3, "subscribed");
  if (mixCount > 0) add(3, "recorded a DJ mix");
  if (songPlays >= 3) add(2, "played 3+ songs");
  if (completedPlays >= 1) add(1, "finished a song");
  if (listeningSeconds >= 300) add(2, "5+ min listening");
  if (listeningSeconds >= 1200) add(1, "20+ min listening");
  if (pageViews >= 8) add(1, "8+ pageviews");
  if (visitor._count.podcastLinkClicks >= 1) add(1, "clicked a podcast link");

  return { score, engaged: score >= ENGAGEMENT_THRESHOLD, signals };
}
