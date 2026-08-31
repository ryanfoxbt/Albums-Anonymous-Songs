import { prisma } from "@/lib/prisma";
import { enumeratePacificDays, pacificDayKey, type DateRange } from "@/lib/dateRange";
import { pickMerchVariant, type MerchVariant } from "@/lib/merchVariant";
import {
  excludeBySessionVisitor,
  excludeByVisitorId,
  excludeByVisitorPk,
  excludedSubscriberFilter,
  getExcludedVisitorIds,
} from "@/lib/analyticsExclusions";

function sessionDurationMs(session: {
  startedAt: Date;
  lastActivityAt: Date;
}): number {
  return Math.max(
    0,
    session.lastActivityAt.getTime() - session.startedAt.getTime(),
  );
}

export type OverviewStats = {
  uniqueVisitors: number;
  totalSessions: number;
  totalPageviews: number;
  avgSessionDurationMs: number;
  bounceRate: number;
  newSessions: number;
  returningSessions: number;
  totalSongPlays: number;
  totalListeningSeconds: number;
  totalPodcastClicks: number;
  totalAnnouncementClicks: number;
  totalSubscribersAllTime: number;
  newSubscribers: number;
};

export async function getOverviewStats(range: DateRange): Promise<OverviewStats> {
  const startedAt = { gte: range.from, lte: range.to };
  const excluded = await getExcludedVisitorIds();
  const bySession = excludeBySessionVisitor(excluded);
  const byVisitorId = excludeByVisitorId(excluded);

  const [
    uniqueVisitors,
    totalSessions,
    totalPageviews,
    sessionsForDuration,
    returningSessions,
    pageviewCountsBySession,
    totalSongPlays,
    listeningTime,
    totalPodcastClicks,
    totalAnnouncementClicks,
    totalSubscribersAllTime,
    newSubscribers,
  ] = await Promise.all([
    prisma.visitor.count({
      where: { sessions: { some: { startedAt } }, ...excludeByVisitorPk(excluded) },
    }),
    prisma.visitSession.count({ where: { startedAt, ...byVisitorId } }),
    prisma.pageView.count({ where: { visitedAt: startedAt, ...bySession } }),
    prisma.visitSession.findMany({
      where: { startedAt, ...byVisitorId },
      select: { startedAt: true, lastActivityAt: true },
    }),
    prisma.visitSession.count({
      where: { startedAt, isReturning: true, ...byVisitorId },
    }),
    prisma.pageView.groupBy({
      by: ["sessionId"],
      where: { visitedAt: startedAt, ...bySession },
      _count: { id: true },
    }),
    prisma.songPlayEvent.count({ where: { playedAt: startedAt, ...byVisitorId } }),
    prisma.songPlayEvent.aggregate({
      where: { playedAt: startedAt, ...byVisitorId },
      _sum: { listenedSeconds: true },
    }),
    prisma.podcastLinkClick.count({ where: { clickedAt: startedAt, ...byVisitorId } }),
    prisma.announcementLinkClick.count({
      where: { clickedAt: startedAt, ...byVisitorId },
    }),
    prisma.subscriber.count({ where: excludedSubscriberFilter }),
    prisma.subscriber.count({
      where: { subscribedAt: startedAt, ...excludedSubscriberFilter },
    }),
  ]);

  const avgSessionDurationMs = sessionsForDuration.length
    ? sessionsForDuration.reduce((sum, s) => sum + sessionDurationMs(s), 0) /
      sessionsForDuration.length
    : 0;

  const bounced = pageviewCountsBySession.filter(
    (row) => row._count.id === 1,
  ).length;
  const bounceRate = totalSessions > 0 ? bounced / totalSessions : 0;

  return {
    uniqueVisitors,
    totalSessions,
    totalPageviews,
    avgSessionDurationMs,
    bounceRate,
    newSessions: totalSessions - returningSessions,
    returningSessions,
    totalSongPlays,
    totalListeningSeconds: listeningTime._sum.listenedSeconds ?? 0,
    totalPodcastClicks,
    totalAnnouncementClicks,
    totalSubscribersAllTime,
    newSubscribers,
  };
}

export type DailyMetrics = {
  date: string; // YYYY-MM-DD, Pacific calendar day
  visitors: number;
  sessions: number;
  pageviews: number;
  songPlays: number;
  listeningMinutes: number;
};

/** Daily counts across the range, one bucket per Pacific calendar day (zero-filled). */
export async function getTimeSeries(range: DateRange): Promise<DailyMetrics[]> {
  const excluded = await getExcludedVisitorIds();
  const [sessions, pageviews, songPlays] = await Promise.all([
    prisma.visitSession.findMany({
      where: {
        startedAt: { gte: range.from, lte: range.to },
        ...excludeByVisitorId(excluded),
      },
      select: { startedAt: true, visitorId: true },
    }),
    prisma.pageView.findMany({
      where: {
        visitedAt: { gte: range.from, lte: range.to },
        ...excludeBySessionVisitor(excluded),
      },
      select: { visitedAt: true },
    }),
    prisma.songPlayEvent.findMany({
      where: {
        playedAt: { gte: range.from, lte: range.to },
        ...excludeByVisitorId(excluded),
      },
      select: { playedAt: true, listenedSeconds: true },
    }),
  ]);

  const days = enumeratePacificDays(range);
  const buckets = new Map(
    days.map((day) => [
      day,
      {
        visitors: new Set<string>(),
        sessions: 0,
        pageviews: 0,
        songPlays: 0,
        listeningSeconds: 0,
      },
    ]),
  );

  for (const session of sessions) {
    const bucket = buckets.get(pacificDayKey(session.startedAt));
    if (!bucket) continue;
    bucket.sessions += 1;
    bucket.visitors.add(session.visitorId);
  }
  for (const pageview of pageviews) {
    const bucket = buckets.get(pacificDayKey(pageview.visitedAt));
    if (bucket) bucket.pageviews += 1;
  }
  for (const play of songPlays) {
    const bucket = buckets.get(pacificDayKey(play.playedAt));
    if (!bucket) continue;
    bucket.songPlays += 1;
    bucket.listeningSeconds += play.listenedSeconds ?? 0;
  }

  return days.map((day) => {
    const bucket = buckets.get(day)!;
    return {
      date: day,
      visitors: bucket.visitors.size,
      sessions: bucket.sessions,
      pageviews: bucket.pageviews,
      songPlays: bucket.songPlays,
      listeningMinutes: Math.round(bucket.listeningSeconds / 60),
    };
  });
}

export type TopPage = {
  path: string;
  views: number;
  avgDurationMs: number | null;
};

export async function getTopPages(
  range: DateRange,
  limit = 10,
): Promise<TopPage[]> {
  const rows = await prisma.pageView.groupBy({
    by: ["path"],
    where: {
      visitedAt: { gte: range.from, lte: range.to },
      ...excludeBySessionVisitor(await getExcludedVisitorIds()),
    },
    _count: { id: true },
    _avg: { durationMs: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  return rows.map((row) => ({
    path: row.path,
    views: row._count.id,
    avgDurationMs: row._avg.durationMs,
  }));
}

export type TopLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
  sessions: number;
};

export async function getTopLocations(
  range: DateRange,
  limit = 10,
): Promise<TopLocation[]> {
  const rows = await prisma.visitSession.groupBy({
    by: ["city", "region", "country"],
    where: {
      startedAt: { gte: range.from, lte: range.to },
      ...excludeByVisitorId(await getExcludedVisitorIds()),
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  return rows.map((row) => ({
    city: row.city,
    region: row.region,
    country: row.country,
    sessions: row._count.id,
  }));
}

export type EntryChoiceBreakdown = {
  spotify: number;
  youtube: number;
  apple: number;
  listen: number;
  dj: number;
  other: number;
  total: number;
};

// "other" covers sessions that never clicked a homepage link — a direct or
// shared link straight to a song or /listen — plus any legacy values.
export async function getEntryChoiceBreakdown(
  range: DateRange,
): Promise<EntryChoiceBreakdown> {
  const rows = await prisma.visitSession.groupBy({
    by: ["entryChoice"],
    where: {
      startedAt: { gte: range.from, lte: range.to },
      ...excludeByVisitorId(await getExcludedVisitorIds()),
    },
    _count: { id: true },
  });

  const counts = { spotify: 0, youtube: 0, apple: 0, listen: 0, dj: 0, other: 0 };
  for (const row of rows) {
    const key = row.entryChoice;
    if (
      key === "spotify" ||
      key === "youtube" ||
      key === "apple" ||
      key === "listen" ||
      key === "dj"
    ) {
      counts[key] = row._count.id;
    } else {
      counts.other += row._count.id;
    }
  }

  const total =
    counts.spotify +
    counts.youtube +
    counts.apple +
    counts.listen +
    counts.dj +
    counts.other;
  return { ...counts, total };
}

export type TopSource = {
  label: string;
  sessions: number;
};

export async function getTopSources(
  range: DateRange,
  limit = 10,
): Promise<TopSource[]> {
  const sessions = await prisma.visitSession.findMany({
    where: {
      startedAt: { gte: range.from, lte: range.to },
      ...excludeByVisitorId(await getExcludedVisitorIds()),
    },
    select: { utmSource: true, utmMedium: true, referrer: true },
  });

  const counts = new Map<string, number>();
  for (const session of sessions) {
    let label: string;
    if (session.utmSource) {
      label = `${session.utmSource} / ${session.utmMedium ?? "unknown"}`;
    } else if (session.referrer) {
      try {
        label = `referral: ${new URL(session.referrer).hostname}`;
      } catch {
        label = "referral: unknown";
      }
    } else {
      label = "Direct";
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, sessions]) => ({ label, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, limit);
}

export type SongLeaderboardEntry = {
  songId: string;
  title: string;
  artistName: string;
  plays: number;
  uniqueListeners: number;
  completionRate: number;
  totalListenedSeconds: number;
  podcastClicks: number;
};

async function buildSongLeaderboard(
  events: {
    songId: string;
    visitorId: string;
    completed: boolean;
    listenedSeconds: number | null;
  }[],
  clicksBySong: Map<string, number>,
  limit: number,
): Promise<SongLeaderboardEntry[]> {
  const bySong = new Map<
    string,
    {
      plays: number;
      listeners: Set<string>;
      completed: number;
      listenedSeconds: number;
    }
  >();
  for (const event of events) {
    const entry = bySong.get(event.songId) ?? {
      plays: 0,
      listeners: new Set<string>(),
      completed: 0,
      listenedSeconds: 0,
    };
    entry.plays += 1;
    entry.listeners.add(event.visitorId);
    if (event.completed) entry.completed += 1;
    entry.listenedSeconds += event.listenedSeconds ?? 0;
    bySong.set(event.songId, entry);
  }

  const songIds = [...bySong.keys()];
  if (songIds.length === 0) return [];

  const songs = await prisma.song.findMany({
    where: { id: { in: songIds } },
    include: { artist: true, featuredArtist: true },
  });
  const songById = new Map(songs.map((song) => [song.id, song]));

  return [...bySong.entries()]
    .map(([songId, entry]) => {
      const song = songById.get(songId);
      const artistName = song
        ? [song.artist.name, song.featuredArtist?.name]
            .filter(Boolean)
            .join(" feat. ")
        : "Unknown";
      return {
        songId,
        title: song?.title ?? "(deleted song)",
        artistName,
        plays: entry.plays,
        uniqueListeners: entry.listeners.size,
        completionRate: entry.plays > 0 ? entry.completed / entry.plays : 0,
        totalListenedSeconds: entry.listenedSeconds,
        podcastClicks: clicksBySong.get(songId) ?? 0,
      };
    })
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit);
}

export async function getSongLeaderboard(
  range: DateRange,
  limit = 20,
): Promise<SongLeaderboardEntry[]> {
  const playedAt = { gte: range.from, lte: range.to };
  const excluded = await getExcludedVisitorIds();
  const [events, clickCounts] = await Promise.all([
    prisma.songPlayEvent.findMany({
      where: { playedAt, ...excludeByVisitorId(excluded) },
      select: {
        songId: true,
        visitorId: true,
        completed: true,
        listenedSeconds: true,
      },
    }),
    prisma.podcastLinkClick.groupBy({
      by: ["songId"],
      where: { clickedAt: playedAt, ...excludeByVisitorId(excluded) },
      _count: { id: true },
    }),
  ]);
  const clicksBySong = new Map(
    clickCounts.map((row) => [row.songId, row._count.id]),
  );

  return buildSongLeaderboard(events, clicksBySong, limit);
}

export type ReturningVisitorStats = {
  returningVisitors: number;
  returningSessions: number;
  songPlays: number;
  totalListeningSeconds: number;
  avgListeningSecondsPerVisitor: number;
};

/**
 * Visitors who had already been seen before the session(s) they started in
 * this range (VisitSession.isReturning) — how many came back, and how much
 * they listened while they were here.
 */
export async function getReturningVisitorStats(
  range: DateRange,
): Promise<ReturningVisitorStats> {
  const startedAt = { gte: range.from, lte: range.to };
  const excluded = await getExcludedVisitorIds();
  const byVisitorId = excludeByVisitorId(excluded);
  const [returningVisitorRows, returningSessions, songPlayEvents] = await Promise.all([
    prisma.visitSession.findMany({
      where: { startedAt, isReturning: true, ...byVisitorId },
      select: { visitorId: true },
      distinct: ["visitorId"],
    }),
    prisma.visitSession.count({ where: { startedAt, isReturning: true, ...byVisitorId } }),
    prisma.songPlayEvent.findMany({
      where: {
        playedAt: { gte: range.from, lte: range.to },
        session: { isReturning: true },
        ...byVisitorId,
      },
      select: { listenedSeconds: true },
    }),
  ]);

  const returningVisitors = returningVisitorRows.length;
  const totalListeningSeconds = songPlayEvents.reduce(
    (sum, event) => sum + (event.listenedSeconds ?? 0),
    0,
  );

  return {
    returningVisitors,
    returningSessions,
    songPlays: songPlayEvents.length,
    totalListeningSeconds,
    avgListeningSecondsPerVisitor:
      returningVisitors > 0 ? totalListeningSeconds / returningVisitors : 0,
  };
}

/** Same shape as {@link getSongLeaderboard}, scoped to plays made during a returning session. */
export async function getReturningVisitorSongLeaderboard(
  range: DateRange,
  limit = 5,
): Promise<SongLeaderboardEntry[]> {
  const events = await prisma.songPlayEvent.findMany({
    where: {
      playedAt: { gte: range.from, lte: range.to },
      session: { isReturning: true },
      ...excludeByVisitorId(await getExcludedVisitorIds()),
    },
    select: {
      songId: true,
      visitorId: true,
      completed: true,
      listenedSeconds: true,
    },
  });

  return buildSongLeaderboard(events, new Map(), limit);
}

export type RecentSubscriber = {
  id: string;
  email: string;
  subscribedAt: Date;
  firstUtmSource: string | null;
  firstUtmMedium: string | null;
  firstUtmCampaign: string | null;
  firstLandingPath: string | null;
};

export async function getRecentSubscribers(
  limit = 10,
): Promise<RecentSubscriber[]> {
  const subscribers = await prisma.subscriber.findMany({
    where: excludedSubscriberFilter,
    orderBy: { subscribedAt: "desc" },
    take: limit,
    include: { visitor: true },
  });

  return subscribers.map((subscriber) => ({
    id: subscriber.id,
    email: subscriber.email,
    subscribedAt: subscriber.subscribedAt,
    firstUtmSource: subscriber.visitor?.firstUtmSource ?? null,
    firstUtmMedium: subscriber.visitor?.firstUtmMedium ?? null,
    firstUtmCampaign: subscriber.visitor?.firstUtmCampaign ?? null,
    firstLandingPath: subscriber.visitor?.firstLandingPath ?? null,
  }));
}

export type VisitorListItem = {
  id: string;
  identity: string;
  isSubscribed: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  sessionCount: number;
  pageViewCount: number;
  songPlayCount: number;
  listeningSeconds: number;
  country: string | null;
  region: string | null;
  city: string | null;
};

export async function getVisitorList(limit = 50): Promise<VisitorListItem[]> {
  const visitors = await prisma.visitor.findMany({
    where: excludeByVisitorPk(await getExcludedVisitorIds()),
    orderBy: { lastSeenAt: "desc" },
    take: limit,
    include: {
      subscriber: true,
      sessions: {
        orderBy: { startedAt: "desc" },
        select: {
          country: true,
          region: true,
          city: true,
          _count: { select: { pageViews: true } },
        },
      },
      songPlays: { select: { listenedSeconds: true } },
      _count: { select: { sessions: true, songPlays: true } },
    },
  });

  return visitors.map((visitor) => ({
    id: visitor.id,
    identity: visitor.subscriber?.email ?? visitor.id,
    isSubscribed: visitor.subscriber != null,
    firstSeenAt: visitor.createdAt,
    lastSeenAt: visitor.lastSeenAt,
    sessionCount: visitor._count.sessions,
    pageViewCount: visitor.sessions.reduce(
      (sum, session) => sum + session._count.pageViews,
      0,
    ),
    songPlayCount: visitor._count.songPlays,
    listeningSeconds: visitor.songPlays.reduce(
      (sum, play) => sum + (play.listenedSeconds ?? 0),
      0,
    ),
    country: visitor.sessions[0]?.country ?? null,
    region: visitor.sessions[0]?.region ?? null,
    city: visitor.sessions[0]?.city ?? null,
  }));
}

export type VisitorProfile = {
  id: string;
  identity: string;
  isSubscribed: boolean;
  subscribedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  firstUtmSource: string | null;
  firstUtmMedium: string | null;
  firstUtmCampaign: string | null;
  firstReferrer: string | null;
  firstLandingPath: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  totalPageViews: number;
  totalSongPlays: number;
  totalListeningSeconds: number;
  sessions: {
    id: string;
    startedAt: Date;
    durationMs: number;
    pageViewCount: number;
    landingPath: string | null;
    utmSource: string | null;
    utmCampaign: string | null;
    deviceType: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
  }[];
  songPlays: {
    id: string;
    title: string;
    artistName: string;
    playedAt: Date;
    listenedSeconds: number | null;
    completed: boolean;
  }[];
};

export async function getVisitorProfile(
  visitorId: string,
): Promise<VisitorProfile | null> {
  const [visitor, listeningTime] = await Promise.all([
    prisma.visitor.findUnique({
      where: { id: visitorId },
      include: {
        subscriber: true,
        sessions: {
          orderBy: { startedAt: "desc" },
          include: { _count: { select: { pageViews: true } } },
        },
        songPlays: {
          orderBy: { playedAt: "desc" },
          take: 50,
          include: { song: { include: { artist: true } } },
        },
        _count: { select: { songPlays: true } },
      },
    }),
    prisma.songPlayEvent.aggregate({
      where: { visitorId },
      _sum: { listenedSeconds: true },
    }),
  ]);
  if (!visitor) return null;

  return {
    id: visitor.id,
    identity: visitor.subscriber?.email ?? visitor.id,
    isSubscribed: visitor.subscriber != null,
    subscribedAt: visitor.subscriber?.subscribedAt ?? null,
    firstSeenAt: visitor.createdAt,
    lastSeenAt: visitor.lastSeenAt,
    firstUtmSource: visitor.firstUtmSource,
    firstUtmMedium: visitor.firstUtmMedium,
    firstUtmCampaign: visitor.firstUtmCampaign,
    firstReferrer: visitor.firstReferrer,
    firstLandingPath: visitor.firstLandingPath,
    country: visitor.country,
    region: visitor.region,
    city: visitor.city,
    totalPageViews: visitor.sessions.reduce(
      (sum, session) => sum + session._count.pageViews,
      0,
    ),
    totalSongPlays: visitor._count.songPlays,
    totalListeningSeconds: listeningTime._sum.listenedSeconds ?? 0,
    sessions: visitor.sessions.map((session) => ({
      id: session.id,
      startedAt: session.startedAt,
      durationMs: sessionDurationMs(session),
      pageViewCount: session._count.pageViews,
      landingPath: session.landingPath,
      utmSource: session.utmSource,
      utmCampaign: session.utmCampaign,
      deviceType: session.deviceType,
      country: session.country,
      region: session.region,
      city: session.city,
    })),
    songPlays: visitor.songPlays.map((play) => ({
      id: play.id,
      title: play.song.title,
      artistName: play.song.artist.name,
      playedAt: play.playedAt,
      listenedSeconds: play.listenedSeconds,
      completed: play.completed,
    })),
  };
}

export type SessionDetail = {
  id: string;
  visitorId: string;
  visitorIdentity: string;
  startedAt: Date;
  durationMs: number;
  isReturning: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  subscriberEmail: string | null;
  pageViews: { id: string; path: string; visitedAt: Date; durationMs: number | null }[];
  songPlays: {
    id: string;
    title: string;
    artistName: string;
    playedAt: Date;
    listenedSeconds: number | null;
    completed: boolean;
  }[];
};

export async function getSessionDetail(
  sessionId: string,
): Promise<SessionDetail | null> {
  const session = await prisma.visitSession.findUnique({
    where: { id: sessionId },
    include: {
      visitor: { include: { subscriber: true } },
      pageViews: { orderBy: { visitedAt: "asc" } },
      songPlays: {
        orderBy: { playedAt: "asc" },
        include: { song: { include: { artist: true } } },
      },
    },
  });
  if (!session) return null;

  return {
    id: session.id,
    visitorId: session.visitor.id,
    visitorIdentity: session.visitor.subscriber?.email ?? session.visitor.id,
    startedAt: session.startedAt,
    durationMs: sessionDurationMs(session),
    isReturning: session.isReturning,
    utmSource: session.utmSource,
    utmMedium: session.utmMedium,
    utmCampaign: session.utmCampaign,
    utmTerm: session.utmTerm,
    utmContent: session.utmContent,
    referrer: session.referrer,
    deviceType: session.deviceType,
    browser: session.browser,
    os: session.os,
    country: session.country,
    region: session.region,
    city: session.city,
    subscriberEmail: session.visitor.subscriber?.email ?? null,
    pageViews: session.pageViews.map((pv) => ({
      id: pv.id,
      path: pv.path,
      visitedAt: pv.visitedAt,
      durationMs: pv.durationMs,
    })),
    songPlays: session.songPlays.map((play) => ({
      id: play.id,
      title: play.song.title,
      artistName: play.song.artist.name,
      playedAt: play.playedAt,
      listenedSeconds: play.listenedSeconds,
      completed: play.completed,
    })),
  };
}

export type UtmLinkWithStats = {
  id: string;
  label: string;
  destinationPath: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string | null;
  utmContent: string | null;
  createdAt: Date;
  attributedSessions: number;
};

export async function getUtmLinks(): Promise<UtmLinkWithStats[]> {
  const links = await prisma.utmLink.findMany({
    orderBy: { createdAt: "desc" },
  });
  const excluded = await getExcludedVisitorIds();

  return Promise.all(
    links.map(async (link) => {
      const attributedSessions = await prisma.visitSession.count({
        where: {
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
          ...excludeByVisitorId(excluded),
        },
      });
      return { ...link, attributedSessions };
    }),
  );
}

// --- Paths (entry point -> what they did next) ---

const SEO_PAGES = new Set(["/free-comedy-music", "/ai-songs", "/podcast"]);
const DJ_PAGES = new Set(["/dj", "/dj/learn"]);

function bucketLandingPath(path: string | null): string {
  if (!path) return "Other / unknown";
  if (path === "/") return "Home";
  if (path === "/listen") return "Listen page";
  if (DJ_PAGES.has(path)) return "DJ Booth";
  if (path === "/free-comedy-music") return "Free Comedy Music (SEO)";
  if (path === "/ai-songs") return "AI Songs (SEO)";
  if (path === "/podcast") return "Podcast page (SEO)";
  if (path.startsWith("/song/")) return "Direct song link";
  if (path.startsWith("/mix/")) return "Shared DJ mix";
  if (path.startsWith("/record/")) return "Shared playlist";
  return "Other";
}

export type PathBreakdown = {
  entryPoint: string;
  sessions: number;
  playedSong: number;
  clickedPodcastLink: number;
  visitedDjBooth: number;
  visitedSeoPage: number;
  clickedMerchLink: number;
  subscribed: number;
};

/**
 * Where sessions enter the site, and what they did afterward — analogous
 * to a "Paths" report: entry point, then the actions taken during that
 * session (or, for "subscribed", ever — subscription is tied to the
 * visitor, not a single session).
 */
export async function getPathsBreakdown(range: DateRange): Promise<PathBreakdown[]> {
  const sessions = await prisma.visitSession.findMany({
    where: {
      startedAt: { gte: range.from, lte: range.to },
      ...excludeByVisitorId(await getExcludedVisitorIds()),
    },
    select: {
      landingPath: true,
      songPlays: { select: { id: true }, take: 1 },
      podcastLinkClicks: { select: { id: true }, take: 1 },
      merchLinkClicks: { select: { id: true }, take: 1 },
      pageViews: { select: { path: true } },
      visitor: { select: { subscriber: { select: { id: true } } } },
    },
  });

  const buckets = new Map<string, PathBreakdown>();
  for (const session of sessions) {
    const entryPoint = bucketLandingPath(session.landingPath);
    const entry = buckets.get(entryPoint) ?? {
      entryPoint,
      sessions: 0,
      playedSong: 0,
      clickedPodcastLink: 0,
      visitedDjBooth: 0,
      visitedSeoPage: 0,
      clickedMerchLink: 0,
      subscribed: 0,
    };
    entry.sessions += 1;
    if (session.songPlays.length > 0) entry.playedSong += 1;
    if (session.podcastLinkClicks.length > 0) entry.clickedPodcastLink += 1;
    if (session.merchLinkClicks.length > 0) entry.clickedMerchLink += 1;
    if (session.pageViews.some((pv) => DJ_PAGES.has(pv.path))) {
      entry.visitedDjBooth += 1;
    }
    if (session.pageViews.some((pv) => SEO_PAGES.has(pv.path))) {
      entry.visitedSeoPage += 1;
    }
    if (session.visitor.subscriber) entry.subscribed += 1;
    buckets.set(entryPoint, entry);
  }

  return [...buckets.values()].sort((a, b) => b.sessions - a.sessions);
}

// --- Merch link A/B test ---

export type MerchAbResult = {
  variant: MerchVariant;
  text: string;
  visitors: number;
  clicks: number;
  clickRate: number;
};

/**
 * All-time results for the merch link A/B test. "visitors" buckets every
 * visitor ever seen by the same deterministic hash the header uses to pick
 * their variant (see src/lib/merchVariant.ts) — no assignment is stored per
 * visitor, so this recomputes the bucket rather than reading it back.
 */
export async function getMerchAbResults(config: {
  variantAText: string;
  variantBText: string;
}): Promise<MerchAbResult[]> {
  const excluded = await getExcludedVisitorIds();
  const [visitors, clickRows] = await Promise.all([
    prisma.visitor.findMany({
      where: excludeByVisitorPk(excluded),
      select: { id: true },
    }),
    prisma.merchLinkClick.groupBy({
      by: ["variant"],
      where: excludeByVisitorId(excluded),
      _count: { id: true },
    }),
  ]);

  const visitorCounts: Record<MerchVariant, number> = { a: 0, b: 0 };
  for (const visitor of visitors) {
    visitorCounts[pickMerchVariant(visitor.id)] += 1;
  }

  const clickCounts: Record<MerchVariant, number> = { a: 0, b: 0 };
  for (const row of clickRows) {
    if (row.variant === "a" || row.variant === "b") {
      clickCounts[row.variant] = row._count.id;
    }
  }

  return (["a", "b"] as const).map((variant) => ({
    variant,
    text: variant === "a" ? config.variantAText : config.variantBText,
    visitors: visitorCounts[variant],
    clicks: clickCounts[variant],
    clickRate:
      visitorCounts[variant] > 0
        ? clickCounts[variant] / visitorCounts[variant]
        : 0,
  }));
}

// --- DJ Booth ---

export type DjBoothStats = {
  boothViews: number;
  learnViews: number;
  mixesCreated: number;
  mixCreators: number;
  totalMixes: number;
  totalMixViews: number;
  totalMixPlays: number;
  recentMixes: {
    slug: string;
    createdAt: Date;
    songCount: number;
    durationMs: number;
    viewCount: number;
    playCount: number;
  }[];
  topSongs: { title: string; mixCount: number }[];
};

export async function getDjBoothStats(range: DateRange): Promise<DjBoothStats> {
  const inRange = { gte: range.from, lte: range.to };
  const excluded = await getExcludedVisitorIds();
  const bySession = excludeBySessionVisitor(excluded);

  const [
    boothViews,
    learnViews,
    mixesCreated,
    creatorRows,
    totalMixes,
    counters,
    recentRows,
    topSongRows,
  ] = await Promise.all([
    prisma.pageView.count({ where: { path: "/dj", visitedAt: inRange, ...bySession } }),
    prisma.pageView.count({
      where: { path: "/dj/learn", visitedAt: inRange, ...bySession },
    }),
    prisma.djMix.count({
      where: { createdAt: inRange, ...excludeByVisitorId(excluded) },
    }),
    prisma.djMix.findMany({
      where: {
        createdAt: inRange,
        visitorId: { not: null },
        ...excludeByVisitorId(excluded),
      },
      select: { visitorId: true },
      distinct: ["visitorId"],
    }),
    prisma.djMix.count(),
    prisma.djMix.aggregate({ _sum: { viewCount: true, playCount: true } }),
    prisma.djMix.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        slug: true,
        createdAt: true,
        songIds: true,
        durationMs: true,
        viewCount: true,
        playCount: true,
      },
    }),
    prisma.$queryRaw<{ title: string; mix_count: bigint }[]>`
      SELECT s.title AS title, count(*)::bigint AS mix_count
      FROM "DjMix" m, unnest(m."songIds") AS sid
      JOIN "Song" s ON s.id = sid
      GROUP BY s.id, s.title
      ORDER BY mix_count DESC, s.title ASC
      LIMIT 10
    `,
  ]);

  return {
    boothViews,
    learnViews,
    mixesCreated,
    mixCreators: creatorRows.length,
    totalMixes,
    totalMixViews: counters._sum.viewCount ?? 0,
    totalMixPlays: counters._sum.playCount ?? 0,
    recentMixes: recentRows.map((m) => ({
      slug: m.slug,
      createdAt: m.createdAt,
      songCount: m.songIds.length,
      durationMs: m.durationMs,
      viewCount: m.viewCount,
      playCount: m.playCount,
    })),
    topSongs: topSongRows.map((r) => ({
      title: r.title,
      mixCount: Number(r.mix_count),
    })),
  };
}
