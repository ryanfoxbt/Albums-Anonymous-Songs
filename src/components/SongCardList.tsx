import type { SongWithRelations } from "@/lib/songs";
import { SongCard } from "./SongCard";

/**
 * A plain list of {@link SongCard}s for the hub pages (artist / genre /
 * category / episode). Continuous play is scoped to `queue` (defaults to
 * the shown songs).
 */
export function SongCardList({
  songs,
  queue,
}: {
  songs: SongWithRelations[];
  queue?: SongWithRelations[];
}) {
  if (songs.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {songs.map((song) => (
        <SongCard key={song.id} song={song} allSongs={queue ?? songs} />
      ))}
    </ul>
  );
}
