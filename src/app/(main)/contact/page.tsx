import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/siteUrl";

export const revalidate = 86400;

const CONTACT_EMAIL = "contact@permrecords.com";

const title = "Contact";
const description =
  "Get in touch with Albums Anonymous and Permanent Records LLC — song licensing, press, guest requests, or just to say a song ruined your commute.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: { title, description, url: absoluteUrl("/contact") },
  twitter: { title, description },
};

const REASONS: { h: string; p: string }[] = [
  {
    h: "Using a song",
    p: "Want to use a track in a video, stream or project? These are original recordings, not public domain — email first and we'll usually say yes. Mixing and sharing inside the on-site DJ booth is already free.",
  },
  {
    h: "Press & guests",
    p: "Interview requests, festival bookings, or pitching yourself as an album-club guest — same address.",
  },
  {
    h: "Something's broken",
    p: "A song won't play, a download link is dead, a page looks wrong — tell us what device and browser and we'll fix it.",
  },
];

export default function ContactPage() {
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Albums Anonymous",
    url: absoluteUrl("/contact"),
    mainEntity: {
      "@type": "Organization",
      name: "Permanent Records LLC",
      email: CONTACT_EMAIL,
      url: "https://www.permrecords.com/",
      brand: { "@type": "Brand", name: "Albums Anonymous" },
    },
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Contact</h1>
          <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
            Albums Anonymous is made by{" "}
            <a
              href="https://www.permrecords.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Permanent Records LLC
            </a>
            . One inbox handles all of it:
          </p>
          <p className="text-base font-medium">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="underline decoration-[#F760D6] decoration-2 underline-offset-2 hover:text-[#F760D6]"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </header>

        <section className="flex flex-col gap-4 border-t border-black/10 pt-5 dark:border-white/10">
          {REASONS.map((r) => (
            <div key={r.h} className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">{r.h}</h2>
              <p className="text-sm text-black/70 dark:text-white/70">{r.p}</p>
            </div>
          ))}
        </section>

        <p className="border-t border-black/10 pt-5 text-sm text-black/55 dark:border-white/10 dark:text-white/55">
          Not a contact thing, but useful:{" "}
          <Link href="/listen" className="underline hover:text-foreground">
            all the songs
          </Link>
          ,{" "}
          <Link href="/podcast" className="underline hover:text-foreground">
            the podcast
          </Link>
          , and{" "}
          <Link href="/free-comedy-music" className="underline hover:text-foreground">
            how downloads work
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
