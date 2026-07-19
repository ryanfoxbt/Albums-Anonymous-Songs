"use client";

import { createContext, useContext, useRef, useState } from "react";

export type PlayerSong = {
  id: string;
  title: string;
  artistName: string;
  src: string;
};

type PlayerContextValue = {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  playSong: (song: PlayerSong) => void;
  togglePlay: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentSong, setCurrentSong] = useState<PlayerSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

    audio.src = song.src;
    audio.play();
    setCurrentSong(song);
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

  return (
    <PlayerContext.Provider
      value={{ currentSong, isPlaying, playSong, togglePlay }}
    >
      {children}
      <audio
        ref={audioRef}
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
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
