"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function guessImageMimeType(url: string): string {
  const extension = url.split(".").pop()?.toLowerCase().split("?")[0];
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}

export function PlayerProvider({
  children,
  logoUrl,
}: {
  children: React.ReactNode;
  logoUrl?: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const queueRef = useRef<PlayerSong[]>([]);
  const queueIndexRef = useRef(0);
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const playNext = () => {
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

  const playPrevious = () => {
    const previousIndex = queueIndexRef.current - 1;
    const previous = queueRef.current[previousIndex];
    if (!previous) return;
    queueIndexRef.current = previousIndex;
    loadAndPlay(previous);
  };

  const handleEnded = () => playNext();

  const updatePositionState = () => {
    const audio = audioRef.current;
    if (
      !audio ||
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      !navigator.mediaSession.setPositionState ||
      !Number.isFinite(audio.duration) ||
      audio.duration <= 0
    ) {
      return;
    }
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime,
      });
    } catch {
      // Stale/invalid state (e.g. mid-seek) — safe to ignore.
    }
  };

  // Keeps the screen awake while a song is actively playing. This only
  // helps the screen-on case (phone paused in a cupholder, browsing while
  // listening) — it can't prevent iOS Safari from suspending a backgrounded
  // tab once the screen locks or the audio is paused, which is a platform
  // limitation no website JS can override.
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
        lock.addEventListener("release", () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null;
        });
      } catch {
        // Denied (e.g. low battery, backgrounded tab) — non-fatal.
      }
    };

    if (isPlaying) {
      acquire();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isPlaying && !wakeLockRef.current) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isPlaying]);

  // Car head units, CarPlay/Android Auto, and lock screens all read the
  // Media Session API for "Now Playing" title/artist/artwork — without it
  // they fall back to a generic placeholder icon and the page title.
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artistName,
      album: "Albums Anonymous",
      artwork: logoUrl
        ? [96, 192, 512].map((size) => ({
            src: logoUrl,
            sizes: `${size}x${size}`,
            type: guessImageMimeType(logoUrl),
          }))
        : [],
    });
  }, [currentSong, logoUrl]);

  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    const audio = audioRef.current;
    navigator.mediaSession.setActionHandler("play", () => audio?.play());
    navigator.mediaSession.setActionHandler("pause", () => audio?.pause());
    navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
    navigator.mediaSession.setActionHandler("nexttrack", playNext);
    navigator.mediaSession.setActionHandler("stop", () => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("stop", null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        playSong,
        playQueue,
        togglePlay,
      }}
    >
      {children}
      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onLoadedMetadata={updatePositionState}
        onTimeUpdate={updatePositionState}
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
