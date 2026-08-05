import Link from "next/link";

const TABS = [
  { href: "/admin/analytics", label: "Overview" },
  { href: "/admin/analytics/visitors", label: "Visitors" },
  { href: "/admin/analytics/songs", label: "Songs" },
  { href: "/admin/analytics/entry-choice", label: "Listen vs Watch" },
  { href: "/admin/analytics/utm", label: "UTM Links" },
  { href: "/admin/analytics/search", label: "Google Search" },
] as const;

export function AnalyticsTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-3 py-1.5 ${
            tab.href === active
              ? "bg-foreground text-background"
              : "border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
