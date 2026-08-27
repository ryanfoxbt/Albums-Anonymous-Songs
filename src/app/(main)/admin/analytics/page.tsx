import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { AnalyticsTrendChart } from "@/components/admin/AnalyticsTrendChart";
import { StatCard } from "@/components/admin/StatCard";
import {
  getOverviewStats,
  getRecentSubscribers,
  getSongLeaderboard,
  getTimeSeries,
  getTopLocations,
  getTopPages,
  getTopSources,
} from "@/lib/analyticsQueries";
import { previousPeriod, RANGE_PRESETS, resolveDateRange } from "@/lib/dateRange";
import {
  formatDateRange,
  formatDateTime,
  formatDelta,
  formatDuration,
  formatListeningTime,
  formatLocation,
  formatPercent,
} from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range: rangeParam, from: fromParam, to: toParam } =
    await searchParams;
  const range = resolveDateRange({
    range: rangeParam,
    from: fromParam,
    to: toParam,
  });

  const [stats, prevStats, series, topPages, topSources, topSongs, topLocations, recentSubscribers] =
    await Promise.all([
      getOverviewStats(range),
      getOverviewStats(previousPeriod(range)),
      getTimeSeries(range),
      getTopPages(range, 8),
      getTopSources(range, 8),
      getSongLeaderboard(range, 5),
      getTopLocations(range, 8),
      getRecentSubscribers(5),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {RANGE_PRESETS.map((option) => (
            <Link
              key={option.value}
              href={`/admin/analytics?range=${option.value}`}
              className={`rounded-full px-3 py-1.5 ${
                option.value === range.preset
                  ? "bg-foreground text-background"
                  : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              {option.label}
            </Link>
          ))}
          <form
            method="GET"
            action="/admin/analytics"
            className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${
              range.preset === "custom"
                ? "bg-foreground/5 dark:bg-white/5"
                : ""
            }`}
          >
            <input type="hidden" name="range" value="custom" />
            <input
              type="date"
              name="from"
              defaultValue={fromParam ?? toDateInputValue(range.from)}
              className="rounded-full border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
            />
            <span className="text-black/40 dark:text-white/40">–</span>
            <input
              type="date"
              name="to"
              defaultValue={toParam ?? toDateInputValue(range.to)}
              className="rounded-full border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
            />
            <button
              type="submit"
              className="rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Go
            </button>
          </form>
        </div>
      </div>

      <AnalyticsTabs active="/admin/analytics" />

      <p className="text-xs text-black/50 dark:text-white/50">
        {formatDateRange(range)}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Visitors"
          value={String(stats.uniqueVisitors)}
          delta={formatDelta(stats.uniqueVisitors, prevStats.uniqueVisitors)}
        />
        <StatCard
          label="Sessions"
          value={String(stats.totalSessions)}
          delta={formatDelta(stats.totalSessions, prevStats.totalSessions)}
        />
        <StatCard
          label="Pageviews"
          value={String(stats.totalPageviews)}
          delta={formatDelta(stats.totalPageviews, prevStats.totalPageviews)}
        />
        <StatCard
          label="Avg. session"
          value={formatDuration(stats.avgSessionDurationMs)}
          delta={formatDelta(stats.avgSessionDurationMs, prevStats.avgSessionDurationMs)}
        />
        <StatCard label="Bounce rate" value={formatPercent(stats.bounceRate)} />
        <StatCard
          label="New vs. returning"
          value={`${stats.newSessions} / ${stats.returningSessions}`}
        />
        <StatCard
          label="Song plays"
          value={String(stats.totalSongPlays)}
          delta={formatDelta(stats.totalSongPlays, prevStats.totalSongPlays)}
        />
        <StatCard
          label="Listening time"
          value={formatListeningTime(stats.totalListeningSeconds)}
          delta={formatDelta(stats.totalListeningSeconds, prevStats.totalListeningSeconds)}
        />
        <StatCard
          label="YouTube clicks"
          value={String(stats.totalPodcastClicks)}
        />
        <StatCard
          label="Banner clicks"
          value={String(stats.totalAnnouncementClicks)}
        />
        <StatCard
          label="Subscribers"
          value={String(stats.totalSubscribersAllTime)}
          sublabel={`+${stats.newSubscribers} in range`}
          delta={formatDelta(stats.newSubscribers, prevStats.newSubscribers)}
        />
      </div>

      <p className="text-xs text-black/40 dark:text-white/40">
        Change vs. the previous {formatDateRange(previousPeriod(range))}
      </p>

      <AnalyticsTrendChart data={series} />

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
              Top locations
            </h2>
            <Link
              href="/admin/analytics/visitors"
              className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              View visitors
            </Link>
          </div>
          <ul className="flex flex-col gap-1">
            {topLocations.map((location, index) => (
              <li
                key={`${location.city}-${location.region}-${location.country}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="min-w-0 truncate">
                  {formatLocation(location)}
                </span>
                <span className="shrink-0 text-black/60 dark:text-white/60">
                  {location.sessions} sessions
                </span>
              </li>
            ))}
            {topLocations.length === 0 && (
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
