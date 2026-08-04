import Link from "next/link";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { getVisitorList } from "@/lib/analyticsQueries";
import {
  formatDateTime,
  formatListeningTime,
  formatLocation,
} from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsVisitorsPage() {
  const visitors = await getVisitorList(50);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <AnalyticsTabs active="/admin/analytics/visitors" />

      <p className="text-sm text-black/60 dark:text-white/60">
        Most recently active {visitors.length} visitors. Click one to see
        their full history.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-black/50 dark:border-white/10 dark:text-white/50">
              <th className="py-2 pr-3 font-medium">Visitor</th>
              <th className="py-2 pr-3 font-medium">First seen</th>
              <th className="py-2 pr-3 font-medium">Last seen</th>
              <th className="py-2 pr-3 font-medium">Sessions</th>
              <th className="py-2 pr-3 font-medium">Pageviews</th>
              <th className="py-2 pr-3 font-medium">Song plays</th>
              <th className="py-2 pr-3 font-medium">Listening time</th>
              <th className="py-2 pr-3 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map((visitor) => (
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
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatDateTime(visitor.firstSeenAt)}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatDateTime(visitor.lastSeenAt)}
                </td>
                <td className="py-2 pr-3">{visitor.sessionCount}</td>
                <td className="py-2 pr-3">{visitor.pageViewCount}</td>
                <td className="py-2 pr-3">{visitor.songPlayCount}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatListeningTime(visitor.listeningSeconds)}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {formatLocation(visitor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visitors.length === 0 && (
          <p className="py-4 text-sm text-black/50 dark:text-white/50">
            No visitors recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
