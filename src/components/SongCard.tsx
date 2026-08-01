import type { SongWithRelations } from "@/lib/songs";
import { AudioPlayer } from "./AudioPlayer";

export function SongCard({ song }: { song: SongWithRelations }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div>
        <h3 className="font-semibold leading-tight">{song.title}</h3>
        <p className="text-sm text-[#F760D6]">
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

      <div className="flex items-center gap-3">
        <AudioPlayer
          songId={song.id}
          src={song.audioUrl}
          title={song.title}
          artistName={song.artist.name}
          podcastEpisodeTitle={song.podcastEpisodeTitle}
          podcastEpisodeUrl={song.podcastEpisodeUrl}
        />
      </div>
    </li>
  );
}
