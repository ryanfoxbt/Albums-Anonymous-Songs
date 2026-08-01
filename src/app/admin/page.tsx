import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [songCount, artistCount, genreCount, categoryCount] =
    await Promise.all([
      prisma.song.count(),
      prisma.artist.count(),
      prisma.genre.count(),
      prisma.category.count(),
    ]);

  const cards = [
    { label: "Songs", count: songCount, href: "/admin/songs" },
    { label: "Artists", count: artistCount, href: "/admin/artists" },
    { label: "Genres", count: genreCount, href: "/admin/genres" },
    { label: "Categories", count: categoryCount, href: "/admin/categories" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-1 rounded-2xl border border-black/10 p-4 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
          >
            <span className="text-2xl font-bold">{card.count}</span>
            <span className="text-sm text-black/60 dark:text-white/60">
              {card.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
