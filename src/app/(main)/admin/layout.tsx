import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-xl font-bold tracking-tight">Not authorized</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          This account doesn&apos;t have admin access.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Back to the site
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-black/10 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
            <Link
              href="/admin/songs"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Songs
            </Link>
            <Link
              href="/admin/artists"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Artists
            </Link>
            <Link
              href="/admin/genres"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Genres
            </Link>
            <Link
              href="/admin/categories"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Categories
            </Link>
            <Link
              href="/admin/cards"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Cards
            </Link>
            <Link
              href="/admin/social-links"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Social Links
            </Link>
            <Link
              href="/admin/dj"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              DJ
            </Link>
            <Link
              href="/admin/analytics"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Analytics
            </Link>
            <Link
              href="/admin/settings"
              className="text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
            >
              Settings
            </Link>
          </nav>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
