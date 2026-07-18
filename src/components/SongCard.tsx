import type { SongWithRelations } from "@/lib/songs";
import { AudioPlayer } from "./AudioPlayer";
import { DownloadButton } from "./DownloadButton";

export function SongCard({ song }: { song: SongWithRelations }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div>
        <h3 className="font-semibold leading-tight">{song.title}</h3>
        <p className="text-sm text-black/60 dark:text-white/60">
          {song.artist.name}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
          {song.genre.name}
        </span>
        <span className="rounded-full bg-black/5 px-2 py-1 dark:bg-white/10">
          {song.category.name}
        </span>
      </div>

      <AudioPlayer src={song.audioUrl} title={song.title} />

      <DownloadButton songId={song.id} />
    </li>
  );
}
