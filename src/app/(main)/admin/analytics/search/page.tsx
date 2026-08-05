import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { StatCard } from "@/components/admin/StatCard";
import { RANGE_PRESETS, resolveDateRange } from "@/lib/dateRange";
import { formatDateRange, formatPercent } from "@/lib/formatAnalytics";
import {
  getSearchOverview,
  getTopSearchPages,
  getTopSearchQueries,
  isSearchConsoleConfigured,
} from "@/lib/searchConsole";

export const dynamic = "force-dynamic";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatPosition(position: number): string {
  return position > 0 ? position.toFixed(1) : "—";
}

export default async function AdminAnalyticsSearchPage({
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

  const configured = isSearchConsoleConfigured();

  const [overview, topQueries, topPages] = configured
    ? await Promise.all([
        getSearchOverview(range),
        getTopSearchQueries(range, 25),
        getTopSearchPages(range, 15),
      ])
    : [null, null, null];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {RANGE_PRESETS.map((option) => (
            <Link
              key={option.value}
              href={`/admin/analytics/search?range=${option.value}`}
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
            action="/admin/analytics/search"
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

      <AnalyticsTabs active="/admin/analytics/search" />

      <p className="text-xs text-black/50 dark:text-white/50">
        {formatDateRange(range)} · Google Search Console data lags by a
        couple of days, so very recent dates may look empty.
      </p>

      {!configured && (
        <div className="rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
          <p className="font-semibold">Search Console isn&apos;t connected yet.</p>
          <p className="mt-1 text-black/60 dark:text-white/60">
            Set the <code>GOOGLE_SEARCH_CONSOLE_CLIENT_ID</code>,{" "}
            <code>GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET</code>, and{" "}
            <code>GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN</code> environment
            variables for an account with access to the albumsanonymous.com
            property in Search Console.
          </p>
        </div>
      )}

      {configured && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Clicks" value={String(overview?.clicks ?? 0)} />
            <StatCard
              label="Impressions"
              value={String(overview?.impressions ?? 0)}
            />
            <StatCard
              label="Click-through rate"
              value={formatPercent(overview?.ctr ?? 0)}
            />
            <StatCard
              label="Avg. position"
              value={formatPosition(overview?.position ?? 0)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
                Top search queries
              </h2>
              <ul className="flex flex-col gap-1">
                {topQueries?.map((row) => (
                  <li
                    key={row.query}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                  >
                    <span className="min-w-0 truncate">{row.query}</span>
                    <span className="shrink-0 text-black/60 dark:text-white/60">
                      {row.clicks} clicks · {row.impressions} impr. ·{" "}
                      {formatPosition(row.position)} avg pos
                    </span>
                  </li>
                ))}
                {(!topQueries || topQueries.length === 0) && (
                  <p className="text-sm text-black/50 dark:text-white/50">
                    No search data yet for this range.
                  </p>
                )}
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
                Top pages in search
              </h2>
              <ul className="flex flex-col gap-1">
                {topPages?.map((row) => (
                  <li
                    key={row.path}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                  >
                    <span className="min-w-0 truncate font-mono text-xs">
                      {row.path}
                    </span>
                    <span className="shrink-0 text-black/60 dark:text-white/60">
                      {row.clicks} clicks · {row.impressions} impr.
                    </span>
                  </li>
                ))}
                {(!topPages || topPages.length === 0) && (
                  <p className="text-sm text-black/50 dark:text-white/50">
                    No search data yet for this range.
                  </p>
                )}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
