import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { getPathsBreakdown } from "@/lib/analyticsQueries";
import { RANGE_PRESETS, resolveDateRange } from "@/lib/dateRange";
import { formatDateRange, formatPercent } from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "playedSong", label: "Played a song" },
  { key: "clickedPodcastLink", label: "Clicked podcast link" },
  { key: "visitedDjBooth", label: "Visited DJ Booth" },
  { key: "visitedSeoPage", label: "Visited SEO page" },
  { key: "clickedMerchLink", label: "Clicked merch link" },
  { key: "subscribed", label: "Subscribed (ever)" },
] as const;

export default async function AdminAnalyticsPathsPage({
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

  const rows = await getPathsBreakdown(range);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-2 text-sm">
          {RANGE_PRESETS.map((option) => (
            <Link
              key={option.value}
              href={`/admin/analytics/paths?range=${option.value}`}
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

      <AnalyticsTabs active="/admin/analytics/paths" />

      <p className="text-xs text-black/50 dark:text-white/50">
        {formatDateRange(range)}
      </p>

      <p className="text-sm text-black/60 dark:text-white/60">
        Where sessions enter the site (bucketed by their landing page), and
        what share of those sessions went on to take each action.
        &quot;Subscribed&quot; looks at whether the visitor ever subscribed,
        not just during this session.
      </p>

      {rows.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">
          No sessions in this range yet.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs text-black/50 dark:border-white/10 dark:text-white/50">
                <th className="py-2 pr-4 font-medium">Entry point</th>
                <th className="py-2 pr-4 font-medium">Sessions</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="py-2 pr-4 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.entryPoint}
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="py-2 pr-4 font-medium">{row.entryPoint}</td>
                  <td className="py-2 pr-4">{row.sessions}</td>
                  {COLUMNS.map((col) => {
                    const count = row[col.key];
                    return (
                      <td key={col.key} className="py-2 pr-4">
                        {count}{" "}
                        <span className="text-black/40 dark:text-white/40">
                          ({formatPercent(count / row.sessions)})
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
