import { SongBrowser } from "@/components/SongBrowser";
import { getArtists, getCategories, getGenres, getSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [songs, artists, genres, categories] = await Promise.all([
    getSongs(),
    getArtists(),
    getGenres(),
    getCategories(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Albums Anonymous
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Funny original songs, parody artists included. Stream free,
            anytime — no login required.
          </p>
        </header>

        <SongBrowser
          songs={songs}
          artists={artists}
          genres={genres}
          categories={categories}
        />
      </main>
    </div>
  );
}
