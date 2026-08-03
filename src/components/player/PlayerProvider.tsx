"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { trackSongPlay, trackSongProgress } from "@/lib/analyticsClient";

export type PlayerSong = {
  id: string;
  title: string;
  artistName: string;
  src: string;
  podcastEpisodeTitle?: string | null;
  podcastEpisodeUrl?: string | null;
};

type PlayerContextValue = {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  playSong: (song: PlayerSong) => void;
  playQueue: (songs: PlayerSong[], startIndex: number) => void;
  togglePlay: () => void;
  streamLimitReached: boolean;
  dismissStreamLimit: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef<PlayerSong[]>([]);
  const queueIndexRef = useRef(0);
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamLimitReached, setStreamLimitReached] = useState(false);
  const { isSignedIn } = useUser();

  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Play analytics: which SongPlayEvent is currently open, flushed
  // (with how far the listener got) whenever it stops being current.
  const playEventIdRef = useRef<string | null>(null);

  const flushSongProgress = useCallback(() => {
    const audio = audioRef.current;
    const eventId = playEventIdRef.current;
    if (!eventId || !audio) return;
    const completed =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.currentTime / audio.duration >= 0.9
        : false;
    trackSongProgress(eventId, Math.round(audio.currentTime), completed);
    playEventIdRef.current = null;
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) flushSongProgress();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushSongProgress);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushSongProgress);
    };
  }, [flushSongProgress]);

  const loadAndPlay = (song: PlayerSong) => {
    const audio = audioRef.current;
    if (!audio) return;
    flushSongProgress();
    audio.src = song.src;
    audio.play().catch(() => {
      // A rapid song switch (e.g. drag-scrubbing the record needle, or
      // auto-advancing quickly) can abort a pending play() request — benign.
    });
    setCurrentSong(song);
    trackSongPlay(song.id, pathnameRef.current ?? "/").then((result) => {
      playEventIdRef.current = result?.eventId ?? null;
    });
  };

  const playQueue = (songs: PlayerSong[], startIndex: number) => {
    if (songs.length === 0) return;
    const index = Math.min(Math.max(startIndex, 0), songs.length - 1);
    const song = songs[index];

    queueRef.current = songs;
    queueIndexRef.current = index;

    if (currentSong?.id === song.id) {
      const audio = audioRef.current;
      if (audio?.paused) audio.play();
      return;
    }

    loadAndPlay(song);
  };

  const playSong = (song: PlayerSong) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentSong?.id === song.id) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
      return;
    }

    playQueue([song], 0);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleEnded = () => {
    const nextIndex = queueIndexRef.current + 1;
    const next = queueRef.current[nextIndex];
    if (next) {
      queueIndexRef.current = nextIndex;
      loadAndPlay(next);
    } else {
      flushSongProgress();
      setIsPlaying(false);
    }
  };

  const dismissStreamLimit = () => setStreamLimitReached(false);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        playSong,
        playQueue,
        togglePlay,
        streamLimitReached: streamLimitReached && !isSignedIn,
        dismissStreamLimit,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
