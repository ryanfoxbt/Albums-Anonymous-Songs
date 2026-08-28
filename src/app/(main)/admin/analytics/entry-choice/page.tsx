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
  const share = (n: number) =>
    breakdown.total > 0 ? n / breakdown.total : 0;

  const buckets = [
    { key: "youtube", label: "YouTube", color: "#FF0000" },
    { key: "spotify", label: "Spotify", color: "#1DB954" },
    { key: "apple", label: "Apple", color: "#A855F7" },
    { key: "listen", label: "Listen (site)", color: "#F760D6" },
    { key: "dj", label: "DJ Booth", color: "#8B5CF6" },
    { key: "other", label: "Other / direct", color: "rgba(120,120,120,0.5)" },
  ] as const;

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
        Which homepage link a new session took first — a podcast platform
        (YouTube / Spotify / Apple) or the site&rsquo;s own player (the small
        &quot;listen to the songs&quot; link or the &quot;Listen&quot; nav
        item). Sessions that never clicked a homepage link (e.g. a shared link
        straight to a song) count as &quot;Other&quot;.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {buckets.map((b) => (
          <StatCard
            key={b.key}
            label={b.label}
            value={String(breakdown[b.key])}
            sublabel={formatPercent(share(breakdown[b.key]))}
          />
        ))}
      </div>

      {breakdown.total > 0 && (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          {buckets.map((b) => (
            <div
              key={b.key}
              className="h-full"
              style={{
                width: `${share(breakdown[b.key]) * 100}%`,
                backgroundColor: b.color,
              }}
              title={`${b.label}: ${formatPercent(share(breakdown[b.key]))}`}
            />
          ))}
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
