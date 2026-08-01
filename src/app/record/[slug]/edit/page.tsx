import Link from "next/link";
import { EditRecordClient } from "@/components/EditRecordClient";
import { prisma } from "@/lib/prisma";
import { getSongs } from "@/lib/songs";

export const dynamic = "force-dynamic";

export default async function EditRecordPage({
  params,
}: PageProps<"/record/[slug]/edit">) {
  const { slug } = await params;
  const record = await prisma.pressedRecord.findUnique({ where: { slug } });

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

  const songs = await getSongs();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Edit Your Record
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            /record/{slug} — change the tracks or reorder Side A.
          </p>
        </header>

        <EditRecordClient
          slug={slug}
          songs={songs}
          initialSelectedIds={record.songIds}
        />
      </main>
    </div>
  );
}
