import { getArtistsWithSongs, getGenresWithSongs } from "@/lib/catalog";
import { getEpisodes } from "@/lib/episodes";
import { getSongs } from "@/lib/songs";
import { getSongSeo } from "@/lib/songSeo";
import { SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;

// /llms.txt — a plain-text map of the site for LLMs and AI answer engines.
// Mirrors the llms.txt convention: what the site is, then linked sections.

export async function GET() {
  const [songs, artists, genres] = await Promise.all([
    getSongs({ sortBy: "title" }),
    getArtistsWithSongs(),
    getGenresWithSongs(),
  ]);
  const episodes = getEpisodes();

  const lines: string[] = [
    "# Albums Anonymous",
    "",
    "> Albums Anonymous is a weekly comedy music podcast that treats a classic album like a book club, then writes and DJs original parody songs inspired by it. This site hosts every original song — free to stream with no login, downloadable with an email — plus an in-browser DJ booth for mixing them.",
    "",
    "All songs are original comedy recordings released under parody-artist personas by Permanent Records LLC. They are not covers and not public domain.",
    "",
    "## Key pages",
    `- [Home / podcast platform picker](${SITE_URL}/)`,
    `- [All songs](${SITE_URL}/listen)`,
    `- [The podcast — how it works](${SITE_URL}/podcast)`,
    `- [Free comedy music (stream + download)](${SITE_URL}/free-comedy-music)`,
    `- [Funny AI songs — how to tell](${SITE_URL}/ai-songs)`,
    `- [DJ booth](${SITE_URL}/dj) and [Learn to DJ](${SITE_URL}/dj/learn)`,
    `- [About / the hosts](${SITE_URL}/about)`,
    "",
    "## Songs",
  ];

  for (const song of songs) {
    const seo = getSongSeo(song.slug);
    const credit = song.featuredArtist
      ? `${song.artist.name} feat. ${song.featuredArtist.name}`
      : song.artist.name;
    const blurb = seo?.summary ?? `${song.genre.name} comedy song.`;
    lines.push(`- [${song.title}](${SITE_URL}/song/${song.slug}) — ${credit}. ${blurb}`);
  }

  lines.push("", "## Parody artists");
  for (const artist of artists) {
    lines.push(
      `- [${artist.name}](${SITE_URL}/artist/${artist.slug}) — ${artist.songCount} song${artist.songCount === 1 ? "" : "s"}`,
    );
  }

  lines.push("", "## Genres");
  for (const genre of genres) {
    lines.push(
      `- [Funny ${genre.name} songs](${SITE_URL}/genre/${genre.slug}) — ${genre.songCount}`,
    );
  }

  lines.push("", "## Podcast episodes (with songs on this site)");
  for (const episode of episodes) {
    const album = episode.albumTitle
      ? ` — covers ${episode.albumTitle} by ${episode.albumArtist}`
      : "";
    lines.push(
      `- [Ep. ${episode.number}: ${episode.title}](${SITE_URL}/podcast/${episode.slug})${album}`,
    );
  }

  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
