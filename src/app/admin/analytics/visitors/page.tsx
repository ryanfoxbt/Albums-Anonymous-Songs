import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { getRecentSessions } from "@/lib/analyticsQueries";
import { formatDateTime, formatDuration } from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsVisitorsPage() {
  const sessions = await getRecentSessions(50);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <AnalyticsTabs active="/admin/analytics/visitors" />

      <p className="text-sm text-black/60 dark:text-white/60">
        Most recent {sessions.length} sessions.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-black/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2 pr-3 font-medium">Started</th>
              <th className="py-2 pr-3 font-medium">Landing page</th>
              <th className="py-2 pr-3 font-medium">Source</th>
              <th className="py-2 pr-3 font-medium">Duration</th>
              <th className="py-2 pr-3 font-medium">Pages</th>
              <th className="py-2 pr-3 font-medium">Device</th>
              <th className="py-2 pr-3 font-medium">Country</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className="border-b border-black/5 dark:border-white/5"
              >
                <td className="py-2 pr-3 whitespace-nowrap">
                  <Link
                    href={`/admin/analytics/visitors/${session.id}`}
                    className="underline hover:text-[#F760D6]"
                  >
                    {formatDateTime(session.startedAt)}
                  </Link>
                </td>
                <td className="max-w-[160px] truncate py-2 pr-3 font-mono text-xs">
                  {session.landingPath}
                </td>
                <td className="py-2 pr-3">
                  {session.utmSource ?? "Direct"}
                  {session.utmCampaign && ` / ${session.utmCampaign}`}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatDuration(session.durationMs)}
                </td>
                <td className="py-2 pr-3">{session.pageViewCount}</td>
                <td className="py-2 pr-3">{session.deviceType ?? "—"}</td>
                <td className="py-2 pr-3">{session.country ?? "—"}</td>
                <td className="py-2 pr-3">
                  {session.isReturning ? "Returning" : "New"}
                </td>
                <td className="max-w-[180px] truncate py-2 pr-3">
                  {session.subscriberEmail ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <p className="py-4 text-sm text-black/50 dark:text-white/50">
            No sessions recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
