import type { MixEvent, RawMixEvent } from "./mixTypes";

// Collects control events during a live DJ take. Framework-free so it can be
// held in a ref and poked from event handlers without re-renders.

const THROTTLE_MS = 40; // ~25 Hz for dragged sliders / auto-crossfade tweens

type RawEvent = RawMixEvent;

function throttleKeyOf(e: RawEvent): string | null {
  switch (e.k) {
    case "crossfader":
      return "crossfader";
    case "tempo":
      return `tempo:${e.deck}`;
    case "fx":
      // Toggles (…On) are discrete — never throttle those.
      return e.key.endsWith("On") ? null : `fx:${e.deck}:${e.key}`;
    default:
      return null;
  }
}

export class MixRecorder {
  private t0 = 0;
  private events: MixEvent[] = [];
  private recording = false;
  private lastAt = new Map<string, number>();
  private lastThrottleKey: string | null = null;
  private songIds: string[] = [];

  start(): void {
    this.t0 = performance.now();
    this.events = [];
    this.lastAt.clear();
    this.lastThrottleKey = null;
    this.songIds = [];
    this.recording = true;
  }

  get isRecording(): boolean {
    return this.recording;
  }

  get elapsedMs(): number {
    return this.recording ? performance.now() - this.t0 : 0;
  }

  get eventCount(): number {
    return this.events.length;
  }

  record(e: RawEvent): void {
    if (!this.recording) return;
    const t = Math.round(performance.now() - this.t0);
    const tk = throttleKeyOf(e);

    if (tk) {
      const last = this.lastAt.get(tk) ?? Number.NEGATIVE_INFINITY;
      if (t - last < THROTTLE_MS && this.lastThrottleKey === tk) {
        // Within the window and we're the most recent event — overwrite the
        // tail so the final resting value is always kept, cheaply.
        this.events[this.events.length - 1] = { ...e, t } as MixEvent;
        return;
      }
      this.lastAt.set(tk, t);
      this.lastThrottleKey = tk;
    } else {
      this.lastThrottleKey = null;
    }

    if (e.k === "load" && !this.songIds.includes(e.songId)) {
      this.songIds.push(e.songId);
    }
    this.events.push({ ...e, t } as MixEvent);
  }

  stop(): { songIds: string[]; durationMs: number; events: MixEvent[] } {
    this.recording = false;
    const durationMs = this.events.length
      ? this.events[this.events.length - 1].t
      : 0;
    return { songIds: [...this.songIds], durationMs, events: this.events };
  }
}
