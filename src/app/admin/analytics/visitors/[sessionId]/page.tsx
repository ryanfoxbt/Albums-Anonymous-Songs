import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/analyticsQueries";
import { formatDateTime, formatDuration } from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Session journey</h1>
        <Link
          href="/admin/analytics/visitors"
          className="text-sm text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          Back to visitors
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-black/10 p-4 text-sm sm:grid-cols-4 dark:border-white/10">
        <div>
          <p className="text-black/50 dark:text-white/50">Started</p>
          <p className="font-medium">{formatDateTime(session.startedAt)}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Duration</p>
          <p className="font-medium">{formatDuration(session.durationMs)}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Visitor</p>
          <p className="font-medium">
            {session.isReturning ? "Returning" : "New"}
          </p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Email</p>
          <p className="font-medium">{session.subscriberEmail ?? "—"}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Device</p>
          <p className="font-medium">
            {session.deviceType ?? "—"} · {session.browser ?? "—"} ·{" "}
            {session.os ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Country</p>
          <p className="font-medium">{session.country ?? "—"}</p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">UTM</p>
          <p className="font-medium">
            {session.utmSource
              ? `${session.utmSource} / ${session.utmMedium ?? "—"} / ${
                  session.utmCampaign ?? "—"
                }`
              : "Direct / none"}
          </p>
        </div>
        <div>
          <p className="text-black/50 dark:text-white/50">Referrer</p>
          <p className="max-w-[200px] truncate font-medium">
            {session.referrer ?? "—"}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
          Page path
        </h2>
        <ol className="flex flex-col gap-1">
          {session.pageViews.map((pageView, index) => (
            <li
              key={pageView.id}
              className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
            >
              <span className="shrink-0 text-black/40 dark:text-white/40">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {pageView.path}
              </span>
              <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                {formatDateTime(pageView.visitedAt)}
              </span>
              <span className="shrink-0 text-xs text-black/60 dark:text-white/60">
                {pageView.durationMs != null
                  ? formatDuration(pageView.durationMs)
                  : "—"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {session.songPlays.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
            Songs played
          </h2>
          <ol className="flex flex-col gap-1">
            {session.songPlays.map((play) => (
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
                <span className="shrink-0 text-xs text-black/60 dark:text-white/60">
                  {play.listenedSeconds != null
                    ? `${play.listenedSeconds}s`
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
