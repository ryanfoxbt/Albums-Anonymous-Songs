import Link from "next/link";
import { HeroTitleAnimation } from "@/components/landing/HeroTitleAnimation";
import { PODCAST_PLATFORMS } from "@/lib/podcastPlatforms";
import { prisma } from "@/lib/prisma";

// No metadata export here on purpose: a title.template set in the root
// layout does NOT apply to page.tsx in that same root segment (only to
// child routes), so overriding title here would silently drop the
// " | Albums Anonymous" suffix. The layout's own `default` title/description
// already are the ideal homepage metadata.

export default async function Home() {
  const socialLinks = await prisma.socialLink.findMany({
    select: { href: true },
  });

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Albums Anonymous",
    url: "https://albumsanonymous.com",
    description:
      "Funny original songs under parody artists, plus the comedy podcast where they're born.",
    sameAs: [
      ...PODCAST_PLATFORMS.map((platform) => platform.href),
      ...socialLinks.map((link) => link.href),
    ],
    parentOrganization: {
      "@type": "Organization",
      name: "Permanent Records LLC",
      url: "https://www.permrecords.com/",
    },
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Albums <span className="text-[#F760D6]">Anonymous</span>
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Funny original songs meets vinyl appreciation.
          </p>
          <HeroTitleAnimation />
        </div>

        <div className="flex w-full flex-col gap-4">
          <Link
            href="/listen"
            className="rounded-2xl bg-black px-6 py-5 text-base font-semibold text-white shadow-sm transition hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            Listen to the Songs
          </Link>
          <Link
            href="/watch"
            className="rounded-2xl border border-black/15 px-6 py-5 text-base font-semibold transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Watch the Podcast
          </Link>
        </div>
      </div>
    </div>
  );
}
