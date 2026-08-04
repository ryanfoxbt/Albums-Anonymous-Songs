import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { StatCard } from "@/components/admin/StatCard";
import { getEntryChoiceBreakdown } from "@/lib/analyticsQueries";
import { RANGE_PRESETS, resolveDateRange } from "@/lib/dateRange";
import { formatDateRange, formatPercent } from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsEntryChoicePage({
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

  const breakdown = await getEntryChoiceBreakdown(range);
  const listenShare = breakdown.total > 0 ? breakdown.listen / breakdown.total : 0;
  const watchShare = breakdown.total > 0 ? breakdown.watch / breakdown.total : 0;
  const otherShare = breakdown.total > 0 ? breakdown.other / breakdown.total : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-2 text-sm">
          {RANGE_PRESETS.map((option) => (
            <Link
              key={option.value}
              href={`/admin/analytics/entry-choice?range=${option.value}`}
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

      <AnalyticsTabs active="/admin/analytics/entry-choice" />

      <p className="text-xs text-black/50 dark:text-white/50">
        {formatDateRange(range)}
      </p>

      <p className="text-sm text-black/60 dark:text-white/60">
        Which homepage button a new session clicked first — &quot;Listen to
        the Songs&quot; or &quot;Watch the Podcast&quot;. Sessions that never
        clicked either (e.g. a shared link straight to a song) count as
        &quot;Other&quot;.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Listen"
          value={String(breakdown.listen)}
          sublabel={formatPercent(listenShare)}
        />
        <StatCard
          label="Watch"
          value={String(breakdown.watch)}
          sublabel={formatPercent(watchShare)}
        />
        <StatCard
          label="Other / direct"
          value={String(breakdown.other)}
          sublabel={formatPercent(otherShare)}
        />
      </div>

      {breakdown.total > 0 && (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full bg-[#F760D6]"
            style={{ width: `${listenShare * 100}%` }}
            title={`Listen: ${formatPercent(listenShare)}`}
          />
          <div
            className="h-full bg-black/60 dark:bg-white/60"
            style={{ width: `${watchShare * 100}%` }}
            title={`Watch: ${formatPercent(watchShare)}`}
          />
          <div
            className="h-full bg-black/20 dark:bg-white/20"
            style={{ width: `${otherShare * 100}%` }}
            title={`Other: ${formatPercent(otherShare)}`}
          />
        </div>
      )}

      {breakdown.total === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">
          No sessions in this range yet.
        </p>
      )}
    </div>
  );
}
