import Link from "next/link";
import { ComplainLink } from "@/components/ComplainLink";
import { PodcastLinks } from "@/components/PodcastLinks";
import { SocialLinks } from "@/components/SocialLinks";
import { SubscribeForm } from "@/components/SubscribeForm";

export function Footer() {
  return (
    <footer className="border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div id="subscribe" className="scroll-mt-20">
          <SubscribeForm />
        </div>

        <div className="flex flex-wrap gap-8">
          <PodcastLinks />
          <SocialLinks />
        </div>

        <p className="text-xs text-black/40 dark:text-white/40">
          Albums Anonymous is a podcast from{" "}
          <a
            href="https://www.permrecords.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-black/60 dark:hover:text-white/60"
          >
            Permanent Records LLC
          </a>
          .{" "}
          <Link
            href="/contact"
            className="underline hover:text-black/60 dark:hover:text-white/60"
          >
            Contact
          </Link>
          . <ComplainLink />
        </p>
      </div>
    </footer>
  );
}
