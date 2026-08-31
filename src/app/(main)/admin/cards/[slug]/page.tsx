import Link from "next/link";
import { notFound } from "next/navigation";
import { CardEditor } from "@/components/admin/CardEditor";
import { getDefaultCard } from "@/lib/artistCards";
import { getArtistCard, hasArtistCardOverride } from "@/lib/artistCardStore";

export const dynamic = "force-dynamic";

export default async function AdminCardEditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const defaultCard = getDefaultCard(slug);
  if (!defaultCard) notFound();

  const [card, hasOverride] = await Promise.all([
    getArtistCard(slug),
    hasArtistCardOverride(slug),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/cards"
          className="text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          ← All cards
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Edit card {defaultCard.number} — {defaultCard.name}
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          The preview updates as you type.{" "}
          <Link
            href={`/artist/${slug}`}
            className="underline hover:text-foreground"
          >
            View the live artist page
          </Link>
          .
        </p>
      </div>

      <CardEditor
        slug={slug}
        defaultCard={defaultCard}
        card={card ?? defaultCard}
        hasOverride={hasOverride}
      />
    </div>
  );
}
