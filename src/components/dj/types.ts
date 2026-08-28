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
  /** The podcast episode this song first appeared on — shown as an "Ep NN"
   *  link on the deck so a DJ (or a viewer of a shared mix) can jump to it. */
  podcastEpisodeTitle: string | null;
  podcastEpisodeUrl: string | null;
  firstHeardOnEpisode: number | null;
};

export const DJ_DRAG_MIME = "application/x-dj-song-id";

/** Per-deck continuous/toggle controls, lifted to DjBoard so a performance can
 *  be both user-driven and replayed. Keys match {@link FxKey} in mixTypes. */
export type DeckFx = {
  trim: number;
  filter: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  echoOn: boolean;
  echoMix: number;
  reverbOn: boolean;
  reverbMix: number;
  flangerOn: boolean;
  flangerMix: number;
};

export const DEFAULT_DECK_FX: DeckFx = {
  trim: 1,
  filter: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  echoOn: false,
  echoMix: 0.3,
  reverbOn: false,
  reverbMix: 0.35,
  flangerOn: false,
  flangerMix: 0.5,
};
