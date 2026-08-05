import Link from "next/link";
import { notFound } from "next/navigation";
import { getVisitorProfile } from "@/lib/analyticsQueries";
import {
  formatDateTime,
  formatDuration,
  formatListeningTime,
  formatLocation,
} from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsVisitorPage({
  params,
}: {
  params: Promise<{ visitorId: string }>;
}) {
  const { visitorId } = await params;
  const visitor = await getVisitorProfile(visitorId);
  if (!visitor) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight break-all">
            {visitor.identity}
          </h1>
          {visitor.isSubscribed && (
            <span className="mt-1 inline-block rounded-full bg-[#F760D6]/10 px-2 py-0.5 text-xs font-medium text-[#F760D6]">
              Subscribed{" "}
              {visitor.subscribedAt && formatDateTime(visitor.subscribedAt)}
            </span>
          )}
        </div>
        <Link
          href="/admin/analytics/visitors"
          className="text-sm text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          Back to visitors
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-black/10 p-4 text-sm sm:grid-cols-4 dark:border-white/10">
        <div>
          <p className="text-black/50 dark:text-white/50">First seen</p>
          <p className="font-medium">{formatDateTime(visitor.firstSeenAt)}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Last seen</p>
          <p className="font-medium">{formatDateTime(visitor.lastSeenAt)}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Sessions</p>
          <p className="font-medium">{visitor.sessions.length}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Pageviews</p>
          <p className="font-medium">{visitor.totalPageViews}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Song plays</p>
          <p className="font-medium">{visitor.totalSongPlays}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Listening time</p>
          <p className="font-medium">
            {formatListeningTime(visitor.totalListeningSeconds)}
          </p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Location</p>
          <p className="font-medium">{formatLocation(visitor)}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">First touch</p>
          <p className="font-medium">
            {visitor.firstUtmSource
              ? `${visitor.firstUtmSource} / ${visitor.firstUtmMedium ?? "—"}`
              : "Direct / none"}
          </p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Landing page</p>
          <p className="max-w-[200px] truncate font-mono text-xs font-medium">
            {visitor.firstLandingPath ?? "—"}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          Sessions
        </h2>
        <ul className="flex flex-col gap-1">
          {visitor.sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/admin/analytics/visitors/${visitor.id}/sessions/${session.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                <span className="font-medium">
                  {formatDateTime(session.startedAt)}
                </span>
                <span className="font-mono text-xs text-black/50 dark:text-white/50">
                  {session.landingPath}
                </span>
                <span className="text-black/60 dark:text-white/60">
                  {session.utmSource ?? "Direct"}
                  {session.utmCampaign && ` / ${session.utmCampaign}`}
                </span>
                <span className="text-black/60 dark:text-white/60">
                  {formatLocation(session)}
                </span>
                <span className="text-black/60 dark:text-white/60">
                  {formatDuration(session.durationMs)}
                </span>
                <span className="text-black/60 dark:text-white/60">
                  {session.pageViewCount} page
                  {session.pageViewCount === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
          {visitor.sessions.length === 0 && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No sessions recorded.
            </p>
          )}
        </ul>
      </section>

      {visitor.songPlays.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Recent song plays
          </h2>
          <ol className="flex flex-col gap-1">
            {visitor.songPlays.map((play) => (
              <li
                key={play.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="min-w-0 truncate">
                  {play.title}{" "}
                  <span className="text-black/50 dark:text-white/50">
                    — {play.artistName}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                  {formatDateTime(play.playedAt)}
                </span>
                <span className="shrink-0 text-xs text-black/60 dark:text-white/60">
                  {play.listenedSeconds != null
                    ? formatListeningTime(play.listenedSeconds)
                    : "—"}
                  {play.completed && " · completed"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
