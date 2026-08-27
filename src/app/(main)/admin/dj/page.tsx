import { DjBoard } from "@/components/dj/DjBoard";
import { getSongs } from "@/lib/songs";
import { formatArtistCredit } from "@/lib/artistCredit";
import { saveSongBpm } from "./actions";

export default async function AdminDjPage() {
  const songs = await getSongs({ includeHidden: true, sortBy: "title" });

  const djSongs = songs.map((song) => ({
    id: song.id,
    title: song.title,
    artistName: formatArtistCredit(song),
    audioUrl: song.audioUrl,
    coverImageUrl: song.coverImageUrl,
    hidden: song.hidden,
    durationSeconds: song.durationSeconds,
    playCount: song.playCount ?? 0,
    bpm: song.bpm,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DJ</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Load any two songs onto Deck A / Deck B and mix them.
        </p>
      </div>
      <DjBoard songs={djSongs} onSaveBpm={saveSongBpm} />
    </div>
  );
}
