// Client-only "soft gate": streaming is always free, but downloading an MP3
// or sharing a DJ mix asks for an email once. The unlock is a local flag —
// the actual email lands on the Resend list via /api/subscribe. This is a
// friction-reducer, not a security boundary (the asset URLs are public).

const UNLOCK_KEY = "aa_unlocked";

export function isEmailUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(UNLOCK_KEY) !== null;
  } catch {
    return false;
  }
}

export function markEmailUnlocked(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UNLOCK_KEY, String(Date.now()));
  } catch {
    // Storage blocked (private mode, etc.) — the gate just re-prompts next time.
  }
}
