import type { SongWithRelations } from "./songs";

/**
 * Builds a Spotify-style autoplay queue starting from `startSong`: other
 * songs by the same artist first, then the same genre, then the same
 * category, then everything else — each song appears exactly once, in the
 * catalog's existing order, until the whole list is exhausted.
 */
export function buildContinuousQueue(
  allSongs: SongWithRelations[],
  startSong: SongWithRelations,
): SongWithRelations[] {
  const remaining = new Map(allSongs.map((song) => [song.id, song]));
  remaining.delete(startSong.id);

  const ordered: SongWithRelations[] = [startSong];

  const takeMatching = (predicate: (song: SongWithRelations) => boolean) => {
    for (const song of allSongs) {
      if (remaining.has(song.id) && predicate(song)) {
        ordered.push(song);
        remaining.delete(song.id);
      }
    }
  };

  takeMatching((song) => song.artistId === startSong.artistId);
  takeMatching((song) => song.genreId === startSong.genreId);
  takeMatching((song) => song.categoryId === startSong.categoryId);
  takeMatching(() => true);

  return ordered;
}
