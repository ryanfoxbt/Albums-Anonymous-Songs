import Link from "next/link";
import { CARD_SERIES, getDefaultCards } from "@/lib/artistCards";
import { getAllArtistCards } from "@/lib/artistCardStore";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCardsPage() {
  const [cards, overrides] = await Promise.all([
    getAllArtistCards(),
    prisma.artistCardOverride.findMany({ select: { slug: true } }),
  ]);
  const overridden = new Set(overrides.map((o) => o.slug));
  const defaults = new Map(getDefaultCards().map((c) => [c.slug, c]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Trading cards</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {CARD_SERIES.name} · {CARD_SERIES.edition}. Edit the copy, swap the
          art, or upload new art. Changes show on each artist page.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {cards.map((card) => (
          <li key={card.slug} className="flex items-center gap-3 py-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt=""
              className="h-12 w-16 shrink-0 rounded border border-black/10 object-cover dark:border-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {card.number} · {card.name}
                {overridden.has(card.slug) && (
                  <span className="ml-2 rounded-full bg-[#F760D6]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#c026a9] dark:text-[#F760D6]">
                    customised
                  </span>
                )}
                {card.name !== defaults.get(card.slug)?.name && (
                  <span className="ml-1 text-xs text-black/40 dark:text-white/40">
                    (was “{defaults.get(card.slug)?.name}”)
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-black/50 dark:text-white/50">
                {card.style.icon} {card.style.label} · {"★".repeat(card.rarity)}
              </p>
            </div>
            <Link
              href={`/admin/cards/${card.slug}`}
              className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
