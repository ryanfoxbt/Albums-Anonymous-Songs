"use client";

import Link from "next/link";
import { trackEntryChoice, type EntryChoice } from "@/lib/analyticsClient";

// Records which homepage route a session picked. `external` renders a plain
// anchor (for the podcast platforms, which open in a new tab); otherwise an
// internal <Link> (the "listen" links). sendBeacon fires synchronously in the
// click handler, so it lands even as the tab navigates.
export function EntryChoiceLink({
  href,
  choice,
  external = false,
  className,
  children,
}: {
  href: string;
  choice: EntryChoice;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => trackEntryChoice(choice)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEntryChoice(choice)}
    >
      {children}
    </Link>
  );
}
