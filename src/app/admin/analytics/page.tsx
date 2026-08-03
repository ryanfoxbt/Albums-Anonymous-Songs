import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { StatCard } from "@/components/admin/StatCard";
import {
  getOverviewStats,
  getRecentSubscribers,
  getSongLeaderboard,
  getTopPages,
  getTopSources,
} from "@/lib/analyticsQueries";
import {
  formatDateTime,
  formatDuration,
  formatListeningTime,
  formatPercent,
} from "@/lib/formatAnalytics";

const RANGE_OPTIONS = [7, 30, 90] as const;

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = RANGE_OPTIONS.includes(Number(daysParam) as (typeof RANGE_OPTIONS)[number])
    ? Number(daysParam)
    : 30;

  const [stats, topPages, topSources, topSongs, recentSubscribers] =
    await Promise.all([
      getOverviewStats(days),
      getTopPages(days, 8),
      getTopSources(days, 8),
      getSongLeaderboard(days, 5),
      getRecentSubscribers(5),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-2 text-sm">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`/admin/analytics?days=${option}`}
              className={`rounded-full px-3 py-1.5 ${
                option === days
                  ? "bg-foreground text-background"
                  : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              {option}d
            </Link>
          ))}
        </div>
      </div>

      <AnalyticsTabs active="/admin/analytics" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Visitors" value={String(stats.uniqueVisitors)} />
        <StatCard label="Sessions" value={String(stats.totalSessions)} />
        <StatCard label="Pageviews" value={String(stats.totalPageviews)} />
        <StatCard
          label="Avg. session"
          value={formatDuration(stats.avgSessionDurationMs)}
        />
        <StatCard label="Bounce rate" value={formatPercent(stats.bounceRate)} />
        <StatCard
          label="New vs. returning"
          value={`${stats.newSessions} / ${stats.returningSessions}`}
        />
        <StatCard label="Song plays" value={String(stats.totalSongPlays)} />
        <StatCard
          label="Listening time"
          value={formatListeningTime(stats.totalListeningSeconds)}
        />
        <StatCard
          label="YouTube clicks"
          value={String(stats.totalPodcastClicks)}
        />
        <StatCard
          label="Subscribers"
          value={String(stats.totalSubscribersAllTime)}
          sublabel={`+${stats.newSubscribers} in range`}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Top pages
          </h2>
          <ul className="flex flex-col gap-1">
            {topPages.map((page) => (
              <li
                key={page.path}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="min-w-0 truncate font-mono text-xs">
                  {page.path}
                </span>
                <span className="shrink-0 text-black/60 dark:text-white/60">
                  {page.views} views
                  {page.avgDurationMs != null &&
                    ` · ${formatDuration(page.avgDurationMs)} avg`}
                </span>
              </li>
            ))}
            {topPages.length === 0 && (
              <p className="text-sm text-black/50 dark:text-white/50">
                No pageviews yet.
              </p>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Top sources
          </h2>
          <ul className="flex flex-col gap-1">
            {topSources.map((source) => (
              <li
                key={source.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="min-w-0 truncate">{source.label}</span>
                <span className="shrink-0 text-black/60 dark:text-white/60">
                  {source.sessions} sessions
                </span>
              </li>
            ))}
            {topSources.length === 0 && (
              <p className="text-sm text-black/50 dark:text-white/50">
                No sessions yet.
              </p>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
              Top songs
            </h2>
            <Link
              href="/admin/analytics/songs"
              className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              View all
            </Link>
          </div>
          <ul className="flex flex-col gap-1">
            {topSongs.map((song) => (
              <li
                key={song.songId}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="min-w-0 truncate">
                  {song.title}{" "}
                  <span className="text-black/50 dark:text-white/50">
                    — {song.artistName}
                  </span>
                </span>
                <span className="shrink-0 text-black/60 dark:text-white/60">
                  {song.plays} plays ·{" "}
                  {formatListeningTime(song.totalListenedSeconds)}
                  {song.podcastClicks > 0 &&
                    ` · ${song.podcastClicks} YT click${song.podcastClicks === 1 ? "" : "s"}`}
                </span>
              </li>
            ))}
            {topSongs.length === 0 && (
              <p className="text-sm text-black/50 dark:text-white/50">
                No song plays yet.
              </p>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Recent subscribers
          </h2>
          <ul className="flex flex-col gap-1">
            {recentSubscribers.map((subscriber) => (
              <li
                key={subscriber.id}
                className="flex flex-col gap-0.5 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{subscriber.email}</span>
                  <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                    {formatDateTime(subscriber.subscribedAt)}
                  </span>
                </div>
                {subscriber.firstUtmSource && (
                  <span className="text-xs text-black/40 dark:text-white/40">
                    via {subscriber.firstUtmSource}
                    {subscriber.firstUtmCampaign &&
                      ` / ${subscriber.firstUtmCampaign}`}
                  </span>
                )}
              </li>
            ))}
            {recentSubscribers.length === 0 && (
              <p className="text-sm text-black/50 dark:text-white/50">
                No subscribers yet.
              </p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
