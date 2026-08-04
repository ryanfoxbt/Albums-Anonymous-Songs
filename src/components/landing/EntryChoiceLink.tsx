"use client";

import Link from "next/link";
import { trackEntryChoice } from "@/lib/analyticsClient";

export function EntryChoiceLink({
  href,
  choice,
  className,
  children,
}: {
  href: string;
  choice: "listen" | "watch";
  className?: string;
  children: React.ReactNode;
}) {
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
