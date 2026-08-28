import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { StatCard } from "@/components/admin/StatCard";
import { getDjBoothStats } from "@/lib/analyticsQueries";
import { RANGE_PRESETS, resolveDateRange } from "@/lib/dateRange";
import { formatDateRange, formatDateTime } from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

function fmtDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

export default async function AdminAnalyticsDjPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { range: rangeParam, from: fromParam, to: toParam } = await searchParams;
  const range = resolveDateRange({
    range: rangeParam,
    from: fromParam,
    to: toParam,
  });

  const stats = await getDjBoothStats(range);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-2 text-sm">
          {RANGE_PRESETS.map((option) => (
            <Link
              key={option.value}
              href={`/admin/analytics/dj?range=${option.value}`}
              className={`rounded-full px-3 py-1.5 ${
                option.value === range.preset
                  ? "bg-foreground text-background"
                  : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <AnalyticsTabs active="/admin/analytics/dj" />

      <p className="text-xs text-black/50 dark:text-white/50">
        {formatDateRange(range)}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          In this range
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="DJ Booth page views" value={String(stats.boothViews)} />
          <StatCard label="“Learn to DJ” views" value={String(stats.learnViews)} />
          <StatCard label="Mixes recorded" value={String(stats.mixesCreated)} />
          <StatCard
            label="People who recorded"
            value={String(stats.mixCreators)}
            sublabel="distinct visitors"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          All-time shared mixes
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Mixes total" value={String(stats.totalMixes)} />
          <StatCard
            label="Mix page opens"
            value={String(stats.totalMixViews)}
          />
          <StatCard
            label="Mix plays"
            value={String(stats.totalMixPlays)}
            sublabel="pressed play"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          Songs most used in mixes (all-time)
        </h2>
        {stats.topSongs.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No mixes recorded yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-1 text-sm">
            {stats.topSongs.map((s, i) => (
              <li
                key={s.title}
                className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
              >
                <span className="min-w-0 truncate">
                  <span className="text-black/40 dark:text-white/40">
                    {i + 1}.
                  </span>{" "}
                  {s.title}
                </span>
                <span className="shrink-0 tabular-nums text-black/50 dark:text-white/50">
                  {s.mixCount} mix{s.mixCount === 1 ? "" : "es"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          Recent mixes
        </h2>
        {stats.recentMixes.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No mixes recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-xs text-black/50 dark:text-white/50">
                <tr>
                  <th className="py-2 pr-3 font-medium">Mix</th>
                  <th className="py-2 pr-3 font-medium">Recorded</th>
                  <th className="py-2 pr-3 font-medium">Length</th>
                  <th className="py-2 pr-3 font-medium">Songs</th>
                  <th className="py-2 pr-3 font-medium">Opens</th>
                  <th className="py-2 font-medium">Plays</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentMixes.map((m) => (
                  <tr
                    key={m.slug}
                    className="border-t border-black/10 dark:border-white/10"
                  >
                    <td className="py-2 pr-3">
                      <Link
                        href={`/mix/${m.slug}`}
                        className="underline hover:text-foreground"
                      >
                        /mix/{m.slug}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-black/60 dark:text-white/60">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {fmtDuration(m.durationMs)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{m.songCount}</td>
                    <td className="py-2 pr-3 tabular-nums">{m.viewCount}</td>
                    <td className="py-2 tabular-nums">{m.playCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
