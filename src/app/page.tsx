import { PodcastPlatformIcon } from "@/components/icons/PodcastPlatformIcon";
import { EntryChoiceLink } from "@/components/landing/EntryChoiceLink";
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

  const podcastSameAs = [
    ...PODCAST_PLATFORMS.map((platform) => platform.href),
    ...socialLinks.map((link) => link.href),
  ];

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Albums Anonymous",
    url: "https://albumsanonymous.com",
    description:
      "Funny original songs under parody artists, plus the comedy podcast where they're born.",
    sameAs: podcastSameAs,
    parentOrganization: {
      "@type": "Organization",
      name: "Permanent Records LLC",
      url: "https://www.permrecords.com/",
    },
  };

  const podcastJsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: "Albums Anonymous",
    description:
      "A comedy music podcast where classic albums get the parody-song treatment.",
    url: "https://albumsanonymous.com",
    sameAs: PODCAST_PLATFORMS.map((platform) => platform.href),
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastJsonLd) }}
      />
      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Albums <span className="text-[#F760D6]">Anonymous</span>
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            An immature book club for great albums - with original song
            blindsides.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          {PODCAST_PLATFORMS.map((platform) => (
            <EntryChoiceLink
              key={platform.name}
              href={platform.href}
              choice={platform.choice}
              external
              className="flex items-center justify-center gap-3 rounded-2xl border border-black/15 px-6 py-5 text-base font-semibold transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              <PodcastPlatformIcon
                slug={platform.slug}
                className="h-5 w-5 shrink-0"
              />
              {platform.name}
            </EntryChoiceLink>
          ))}
        </div>

        <EntryChoiceLink
          href="/listen"
          choice="listen"
          className="text-xs font-medium text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          Or listen to the songs
        </EntryChoiceLink>
      </div>
    </div>
  );
}
