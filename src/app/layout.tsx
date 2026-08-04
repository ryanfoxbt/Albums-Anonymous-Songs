import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { NowPlayingBar } from "@/components/player/NowPlayingBar";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { getSiteLogoUrl } from "@/lib/siteSettings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "Funny original songs under parody artists, plus the comedy podcast where they're born. Stream free, no login required.";

export const metadata: Metadata = {
  metadataBase: new URL("https://albumsanonymous.com"),
  title: {
    default: "Albums Anonymous — Funny Songs & a Comedy Music Podcast",
    template: "%s | Albums Anonymous",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "funny songs",
    "parody songs",
    "comedy music podcast",
    "funny podcast",
    "comedy songs",
    "funny original songs",
    "Albums Anonymous",
  ],
  openGraph: {
    title: "Albums Anonymous",
    description: SITE_DESCRIPTION,
    url: "https://albumsanonymous.com",
    siteName: "Albums Anonymous",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Albums Anonymous",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logoUrl = await getSiteLogoUrl();

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <AnalyticsTracker />
          <PlayerProvider logoUrl={logoUrl}>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
            <NowPlayingBar />
          </PlayerProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
