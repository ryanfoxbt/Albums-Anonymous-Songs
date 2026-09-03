// The wire format for a recorded DJ performance. A mix is NOT an audio file —
// it's this ordered list of control events (`t` = ms since Record was pressed)
// plus the ids of the songs that were loaded. The /mix/[slug] page re-runs the
// events against the same source songs so a viewer hears the mix and watches
// the faders/knobs/scratches move.

export type DeckId = "A" | "B";

export type ScratchPattern = "A" | "B" | "C";

/** Every per-deck continuous/toggle control that a viewer should see move. */
export type FxKey =
  | "trim"
  | "filter"
  | "eqLow"
  | "eqMid"
  | "eqHigh"
  | "echoOn"
  | "echoMix"
  | "reverbOn"
  | "reverbMix"
  | "flangerOn"
  | "flangerMix";

export type MixEvent =
  | { t: number; k: "load"; deck: DeckId; songId: string }
  | { t: number; k: "play"; deck: DeckId }
  | { t: number; k: "pause"; deck: DeckId }
  | { t: number; k: "seek"; deck: DeckId; pos: number } // 0..1 of duration
  | { t: number; k: "cueSet"; deck: DeckId; pos?: number } // pos 0..1; absent = playhead at replay
  | { t: number; k: "cue"; deck: DeckId }
  | { t: number; k: "cueClear"; deck: DeckId }
  | { t: number; k: "loopSet"; deck: DeckId; start: number; end: number } // seconds
  | { t: number; k: "loopExit"; deck: DeckId }
  | { t: number; k: "scratch"; deck: DeckId; pattern: ScratchPattern }
  | { t: number; k: "tempo"; deck: DeckId; v: number }
  | { t: number; k: "fx"; deck: DeckId; key: FxKey; v: number } // bool encoded 0/1
  | { t: number; k: "crossfader"; v: number }
  | { t: number; k: "autoDj"; v: number } // 0/1
  // The optional Kall of Booty dancer. `move` is a move name, or "enter"/"exit"
  // when it toggles on/off. `x` is 0..1 of the viewport width; `facing` is 1/-1.
  // (His on-screen size and AUTO freestyle are local view prefs, not recorded.)
  | { t: number; k: "dancer"; move: string; x: number; facing: number };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/** An event before the recorder timestamps it. DjBoard emits these; the
 *  recorder adds `t`. Replay passes full MixEvents, which are structurally
 *  assignable here (the extra `t` is ignored). */
export type RawMixEvent = DistributiveOmit<MixEvent, "t">;

export type MixProgram = {
  songIds: string[];
  durationMs: number;
  events: MixEvent[];
};

export const MIX_MAX_MS = 3 * 60 * 1000; // hard cap on a recording
export const MIX_MAX_EVENTS = 60_000; // sanity ceiling for the API
