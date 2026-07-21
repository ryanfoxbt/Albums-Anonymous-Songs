import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { NowPlayingBar } from "@/components/player/NowPlayingBar";
import { StreamLimitOverlay } from "@/components/player/StreamLimitOverlay";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Albums Anonymous",
  description:
    "Funny original songs under parody artists — stream free, no login required.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <PlayerProvider>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <NowPlayingBar />
            <StreamLimitOverlay />
          </PlayerProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
