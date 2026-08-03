import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { getSongLeaderboard } from "@/lib/analyticsQueries";
import { formatListeningTime, formatPercent } from "@/lib/formatAnalytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsSongsPage() {
  const songs = await getSongLeaderboard(365, 200);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <AnalyticsTabs active="/admin/analytics/songs" />

      <p className="text-sm text-black/60 dark:text-white/60">
        All-time (last 365 days) play counts, most played first.
      </p>

      <ol className="flex flex-col gap-1">
        {songs.map((song, index) => (
          <li
            key={song.songId}
            className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
          >
            <span className="w-5 shrink-0 text-black/40 dark:text-white/40">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{song.title}</p>
              <p className="truncate text-xs text-black/50 dark:text-white/50">
                {song.artistName}
              </p>
            </div>
            <span className="shrink-0 text-black/60 dark:text-white/60">
              {song.plays} plays
            </span>
            <span className="shrink-0 text-black/60 dark:text-white/60">
              {formatListeningTime(song.totalListenedSeconds)} listened
            </span>
            <span className="shrink-0 text-black/60 dark:text-white/60">
              {song.uniqueListeners} listeners
            </span>
            <span className="shrink-0 text-black/60 dark:text-white/60">
              {formatPercent(song.completionRate)} completion
            </span>
          </li>
        ))}
        {songs.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">
            No song plays recorded yet.
          </p>
        )}
      </ol>
    </div>
  );
}
