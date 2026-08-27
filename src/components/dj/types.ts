export type DjSong = {
  id: string;
  title: string;
  artistName: string;
  audioUrl: string;
  coverImageUrl: string | null;
  hidden: boolean;
  durationSeconds: number | null;
  playCount: number;
  /** ISO string of when the Song row was created — for "Newest" sorting. */
  createdAt: string;
  /** Stored BPM from the Song record, if an admin has saved one. */
  bpm: number | null;
};

export const DJ_DRAG_MIME = "application/x-dj-song-id";
