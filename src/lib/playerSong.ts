import type { PlayerSong } from "@/components/player/PlayerProvider";
import { formatArtistCredit } from "./artistCredit";
import type { SongWithRelations } from "./songs";

export function toPlayerSong(song: SongWithRelations): PlayerSong {
  return {
    id: song.id,
    title: song.title,
    artistName: formatArtistCredit(song),
    src: song.audioUrl,
    podcastEpisodeTitle: song.podcastEpisodeTitle,
    podcastEpisodeUrl: song.podcastEpisodeUrl,
  };
}
