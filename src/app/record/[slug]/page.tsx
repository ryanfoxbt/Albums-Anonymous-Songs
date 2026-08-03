import { cache } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { EditRecordLink } from "@/components/EditRecordLink";
import { RecordPlayer } from "@/components/RecordPlayer";
import { prisma } from "@/lib/prisma";
import { getSongsByIds } from "@/lib/songs";

export const dynamic = "force-dynamic";

const getRecord = cache(async (slug: string) => {
  return prisma.pressedRecord.findUnique({ where: { slug } });
});

export async function generateMetadata({
  params,
}: PageProps<"/record/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const record = await getRecord(slug);
  if (!record) {
    return { title: "Record Not Found" };
  }
  const songCount = record.songIds.length;
  return {
    title: `Custom Record: ${songCount} Funny Song${songCount === 1 ? "" : "s"}`,
    description: `A custom playlist of ${songCount} funny song${
      songCount === 1 ? "" : "s"
    } from Albums Anonymous, pressed and shared.`,
  };
}

export default async function RecordPage({
  params,
}: PageProps<"/record/[slug]">) {
  const { slug } = await params;
  const record = await getRecord(slug);

  if (!record) {
    return (
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:px-6">
          <h1 className="text-xl font-bold tracking-tight">
            No record here
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            This record hasn&apos;t been pressed yet.
          </p>
          <Link
            href="/press"
            className="mt-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Make a record
          </Link>
        </main>
      </div>
    );
  }

  const songs = await getSongsByIds(record.songIds);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            /record/{slug}
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Drag the needle to a groove to play that track.
          </p>
        </header>

        <RecordPlayer songs={songs} slug={slug} />

        <div className="flex flex-col items-center gap-2">
          <EditRecordLink slug={slug} />
          <Link
            href="/press"
            className="self-center text-xs text-black/50 underline hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            Make another record
          </Link>
        </div>
      </main>
    </div>
  );
}
