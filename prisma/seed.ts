import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { connectionStringWithoutSslMode } from "../src/lib/db-url";

type SongsContent = {
  artists: { name: string; slug: string; bio?: string }[];
  genres: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
  songs: {
    title: string;
    slug: string;
    artist: string;
    genre: string;
    category: string;
    audioUrl: string;
    downloadUrl: string;
    durationSeconds?: number;
    coverImageUrl?: string;
    podcastEpisodeTitle?: string;
    podcastEpisodeUrl?: string;
    firstHeardOnEpisode?: number;
  }[];
};

const adapter = new PrismaPg({
  connectionString: connectionStringWithoutSslMode(
    process.env.DATABASE_URL as string,
  ),
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const contentPath = path.join(process.cwd(), "content", "songs.json");
  const content: SongsContent = JSON.parse(readFileSync(contentPath, "utf-8"));

  await prisma.song.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.category.deleteMany();

  for (const artist of content.artists) {
    await prisma.artist.upsert({
      where: { slug: artist.slug },
      update: { name: artist.name, bio: artist.bio },
      create: artist,
    });
  }

  for (const genre of content.genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name },
      create: genre,
    });
  }

  for (const category of content.categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
  }

  for (const song of content.songs) {
    const [artist, genre, category] = await Promise.all([
      prisma.artist.findUniqueOrThrow({ where: { slug: song.artist } }),
      prisma.genre.findUniqueOrThrow({ where: { slug: song.genre } }),
      prisma.category.findUniqueOrThrow({ where: { slug: song.category } }),
    ]);

    await prisma.song.upsert({
      where: { slug: song.slug },
      update: {
        title: song.title,
        audioUrl: song.audioUrl,
        downloadUrl: song.downloadUrl,
        durationSeconds: song.durationSeconds,
        coverImageUrl: song.coverImageUrl,
        podcastEpisodeTitle: song.podcastEpisodeTitle,
        podcastEpisodeUrl: song.podcastEpisodeUrl,
        firstHeardOnEpisode: song.firstHeardOnEpisode,
        artistId: artist.id,
        genreId: genre.id,
        categoryId: category.id,
      },
      create: {
        title: song.title,
        slug: song.slug,
        audioUrl: song.audioUrl,
        downloadUrl: song.downloadUrl,
        durationSeconds: song.durationSeconds,
        coverImageUrl: song.coverImageUrl,
        podcastEpisodeTitle: song.podcastEpisodeTitle,
        podcastEpisodeUrl: song.podcastEpisodeUrl,
        firstHeardOnEpisode: song.firstHeardOnEpisode,
        artistId: artist.id,
        genreId: genre.id,
        categoryId: category.id,
      },
    });
  }

  console.log(
    `Seeded ${content.artists.length} artists, ${content.genres.length} genres, ${content.categories.length} categories, ${content.songs.length} songs.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
