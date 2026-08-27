export type DjSong = {
  id: string;
  title: string;
  artistName: string;
  audioUrl: string;
  coverImageUrl: string | null;
  hidden: boolean;
  durationSeconds: number | null;
  playCount: number;
  /** Stored BPM from the Song record, if an admin has saved one. */
  bpm: number | null;
};

export const DJ_DRAG_MIME = "application/x-dj-song-id";
