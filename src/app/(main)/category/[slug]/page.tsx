import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SongCardList } from "@/components/SongCardList";
import { getCategoryPage, getCategoriesWithSongs } from "@/lib/catalog";
import { getCategorySeo } from "@/lib/categorySeo";
import { absoluteUrl, SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await getCategoriesWithSongs();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryPage(slug);
  if (!data) return { title: "Category Not Found" };

  const name = data.category.name;
  const count = data.songs.length;
  const blurb = getCategorySeo(slug);
  const title = `${name} — ${count} Funny Song${count === 1 ? "" : "s"}`;
  const description =
    blurb ??
    `${count} funny song${count === 1 ? "" : "s"} in the "${name}" category from Albums Anonymous — original comedy music, streamable free.`;

  return {
    title,
    description,
    keywords: [
      `funny songs about ${name.toLowerCase()}`,
      `comedy songs ${name.toLowerCase()}`,
      "funny songs",
      "comedy music",
    ],
    alternates: { canonical: `/category/${slug}` },
    openGraph: { title, description, url: absoluteUrl(`/category/${slug}`) },
    twitter: { title, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCategoryPage(slug);
  if (!data) notFound();

  const { category, songs, genres } = data;
  const blurb = getCategorySeo(slug);

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} — funny songs`,
    url: absoluteUrl(`/category/${slug}`),
    description: blurb ?? `Funny songs in the ${category.name} category.`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: songs.length,
      itemListElement: songs.map((song, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/song/${song.slug}`),
        name: song.title,
      })),
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Songs",
        item: absoluteUrl("/listen"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: absoluteUrl(`/category/${slug}`),
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <nav className="text-xs text-black/50 dark:text-white/50">
          <Link href="/listen" className="underline hover:text-foreground">
            All songs
          </Link>{" "}
          / <span>{category.name}</span>
        </nav>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
          <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
            {blurb ??
              `${songs.length} funny song${
                songs.length === 1 ? "" : "s"
              } in the "${category.name}" category from the Albums Anonymous comedy music podcast.`}
          </p>
          <p className="text-xs text-black/50 dark:text-white/50">
            {songs.length} song{songs.length === 1 ? "" : "s"}
            {genres.length > 0 && ` · ${genres.slice(0, 4).join(", ")}`}
          </p>
        </header>

        <SongCardList songs={songs} />

        <p className="border-t border-black/10 pt-4 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
          See{" "}
          <Link href="/listen" className="underline hover:text-foreground">
            all songs
          </Link>{" "}
          or read about{" "}
          <Link href="/podcast" className="underline hover:text-foreground">
            the podcast
          </Link>{" "}
          they came from.
        </p>
      </main>
    </div>
  );
}
