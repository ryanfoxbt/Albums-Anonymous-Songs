import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { EngagementRubricTable } from "@/components/admin/EngagementRubric";
import { StatCard } from "@/components/admin/StatCard";
import { getEngagementReport } from "@/lib/analyticsQueries";
import { formatDateTime, formatPercent } from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsEngagementPage() {
  const report = await getEngagementReport(25);
  const maxBucket = Math.max(1, ...report.distribution.map((d) => d.visitors));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <AnalyticsTabs active="/admin/analytics/engagement" />

      <p className="text-sm text-black/60 dark:text-white/60">
        Every visitor is scored on how deeply they&apos;ve engaged with the
        site. The score decides whether they see the header merch link and is
        shown on each visitor&apos;s row and profile. All-time, per browser —
        not scoped to a date range. Owner traffic is excluded.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Visitors scored" value={String(report.totalVisitors)} />
        <StatCard
          label={`Engaged (${report.threshold}+)`}
          value={String(report.engagedCount)}
          sublabel={`${formatPercent(report.engagedRate)} of visitors`}
        />
        <StatCard
          label="Avg. score"
          value={report.averageScore.toFixed(1)}
          sublabel={`of ${report.maxScore}`}
        />
        <StatCard label="Median score" value={String(report.medianScore)} />
        <StatCard
          label="Subscribers engaged"
          value={formatPercent(report.bySubscription.subscribers.rate)}
          sublabel={`${report.bySubscription.subscribers.engaged}/${report.bySubscription.subscribers.total}`}
        />
        <StatCard
          label="Non-subs engaged"
          value={formatPercent(report.bySubscription.nonSubscribers.rate)}
          sublabel={`${report.bySubscription.nonSubscribers.engaged}/${report.bySubscription.nonSubscribers.total}`}
        />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          Score distribution
        </h2>
        <div className="flex items-end gap-1.5">
          {report.distribution.map((bucket) => {
            const engaged = bucket.score >= report.threshold;
            return (
              <div
                key={bucket.score}
                className="flex flex-1 flex-col items-center gap-1"
                title={`Score ${bucket.score}: ${bucket.visitors} visitor${
                  bucket.visitors === 1 ? "" : "s"
                }`}
              >
                <span className="text-[11px] tabular-nums text-black/50 dark:text-white/50">
                  {bucket.visitors || ""}
                </span>
                <div
                  className={`w-full rounded-t ${
                    engaged
                      ? "bg-[#F760D6]"
                      : "bg-black/20 dark:bg-white/25"
                  }`}
                  style={{
                    height: `${Math.round((bucket.visitors / maxBucket) * 120)}px`,
                    minHeight: bucket.visitors > 0 ? 3 : 0,
                  }}
                />
                <span className="text-[11px] tabular-nums text-black/50 dark:text-white/50">
                  {bucket.score}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-black/40 dark:text-white/40">
          Pink bars are at or above the engaged threshold ({report.threshold}).
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Tiers
          </h2>
          <ul className="flex flex-col gap-1">
            {report.tiers.map((tier) => (
              <li
                key={tier.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${tier.className}`}
                >
                  {tier.label} · {tier.min}
                  {tier.max >= report.maxScore ? "+" : `–${tier.max}`}
                </span>
                <span className="shrink-0 text-black/60 dark:text-white/60">
                  {tier.visitors} · {formatPercent(tier.share)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Which signals visitors hit
          </h2>
          <ul className="flex flex-col gap-1">
            {report.signals.map((signal) => (
              <li
                key={signal.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="min-w-0">
                  <span className="font-medium">{signal.label}</span>{" "}
                  <span className="text-black/40 dark:text-white/40">
                    +{signal.points}
                  </span>
                  <span className="block text-xs text-black/50 dark:text-white/50">
                    {signal.hint}
                  </span>
                </span>
                <span className="shrink-0 text-black/60 dark:text-white/60">
                  {signal.visitors} · {formatPercent(signal.share)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          Top visitors by score
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs text-black/50 dark:border-white/10 dark:text-white/50">
                <th className="py-2 pr-3 font-medium">Visitor</th>
                <th className="py-2 pr-3 font-medium">Score</th>
                <th className="py-2 pr-3 font-medium">Tier</th>
                <th className="py-2 pr-3 font-medium">Signals earned</th>
                <th className="py-2 pr-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {report.topVisitors.map((visitor) => (
                <tr
                  key={visitor.id}
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="max-w-[200px] py-2 pr-3">
                    <Link
                      href={`/admin/analytics/visitors/${visitor.id}`}
                      className="block truncate underline hover:text-[#F760D6]"
                    >
                      {visitor.isSubscribed ? (
                        visitor.identity
                      ) : (
                        <span className="font-mono text-xs">
                          {visitor.identity}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">
                    {visitor.score}
                    <span className="font-normal text-black/40 dark:text-white/40">
                      /{report.maxScore}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${visitor.tierClassName}`}
                    >
                      {visitor.tierLabel}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex flex-wrap gap-1">
                      {visitor.signals.map((signal) => (
                        <span
                          key={signal.label}
                          className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] dark:bg-white/10"
                        >
                          {signal.label} +{signal.points}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-black/60 dark:text-white/60">
                    {formatDateTime(visitor.lastSeenAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.topVisitors.length === 0 && (
            <p className="py-4 text-sm text-black/50 dark:text-white/50">
              No visitors scored yet.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          How scoring works
        </h2>
        <div className="text-xs text-black/70 dark:text-white/70">
          <EngagementRubricTable />
        </div>
      </section>
    </div>
  );
}
