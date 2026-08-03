import { prisma } from "@/lib/prisma";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

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
  totalSubscribersAllTime: number;
  newSubscribers: number;
};

export async function getOverviewStats(days: number): Promise<OverviewStats> {
  const since = daysAgo(days);

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
    totalSubscribersAllTime,
    newSubscribers,
  ] = await Promise.all([
    prisma.visitor.count({
      where: { sessions: { some: { startedAt: { gte: since } } } },
    }),
    prisma.visitSession.count({ where: { startedAt: { gte: since } } }),
    prisma.pageView.count({ where: { visitedAt: { gte: since } } }),
    prisma.visitSession.findMany({
      where: { startedAt: { gte: since } },
      select: { startedAt: true, lastActivityAt: true },
    }),
    prisma.visitSession.count({
      where: { startedAt: { gte: since }, isReturning: true },
    }),
    prisma.pageView.groupBy({
      by: ["sessionId"],
      where: { visitedAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.songPlayEvent.count({ where: { playedAt: { gte: since } } }),
    prisma.songPlayEvent.aggregate({
      where: { playedAt: { gte: since } },
      _sum: { listenedSeconds: true },
    }),
    prisma.podcastLinkClick.count({ where: { clickedAt: { gte: since } } }),
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { subscribedAt: { gte: since } } }),
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
    totalSubscribersAllTime,
    newSubscribers,
  };
}

export type TopPage = {
  path: string;
  views: number;
  avgDurationMs: number | null;
};

export async function getTopPages(
  days: number,
  limit = 10,
): Promise<TopPage[]> {
  const rows = await prisma.pageView.groupBy({
    by: ["path"],
    where: { visitedAt: { gte: daysAgo(days) } },
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

export type TopSource = {
  label: string;
  sessions: number;
};

export async function getTopSources(
  days: number,
  limit = 10,
): Promise<TopSource[]> {
  const sessions = await prisma.visitSession.findMany({
    where: { startedAt: { gte: daysAgo(days) } },
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

export async function getSongLeaderboard(
  days: number,
  limit = 20,
): Promise<SongLeaderboardEntry[]> {
  const since = daysAgo(days);
  const [events, clickCounts] = await Promise.all([
    prisma.songPlayEvent.findMany({
      where: { playedAt: { gte: since } },
      select: {
        songId: true,
        visitorId: true,
        completed: true,
        listenedSeconds: true,
      },
    }),
    prisma.podcastLinkClick.groupBy({
      by: ["songId"],
      where: { clickedAt: { gte: since } },
      _count: { id: true },
    }),
  ]);
  const clicksBySong = new Map(
    clickCounts.map((row) => [row.songId, row._count.id]),
  );

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
};

export async function getVisitorList(limit = 50): Promise<VisitorListItem[]> {
  const visitors = await prisma.visitor.findMany({
    orderBy: { lastSeenAt: "desc" },
    take: limit,
    include: {
      subscriber: true,
      sessions: {
        orderBy: { startedAt: "desc" },
        select: { country: true, _count: { select: { pageViews: true } } },
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

  return Promise.all(
    links.map(async (link) => {
      const attributedSessions = await prisma.visitSession.count({
        where: {
          utmSource: link.utmSource,
          utmMedium: link.utmMedium,
          utmCampaign: link.utmCampaign,
        },
      });
      return { ...link, attributedSessions };
    }),
  );
}
