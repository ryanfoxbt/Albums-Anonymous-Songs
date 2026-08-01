export function formatArtistCredit(song: {
  artist: { name: string };
  featuredArtist: { name: string } | null;
}): string {
  return song.featuredArtist
    ? `${song.artist.name} Featuring ${song.featuredArtist.name}`
    : song.artist.name;
}
