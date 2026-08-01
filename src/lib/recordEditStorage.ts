import { useSyncExternalStore } from "react";

export function editTokenStorageKey(slug: string): string {
  return `record-edit-token:${slug}`;
}

export function getStoredEditToken(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(editTokenStorageKey(slug));
}

function subscribeNoop() {
  return () => {};
}

// localStorage is set once, before this ever renders for a given slug, so
// there's nothing external to subscribe to — this just gives a hydration-safe
// way to read it (SSR/first paint sees null, then syncs to the real value).
export function useStoredEditToken(slug: string): string | null {
  return useSyncExternalStore(
    subscribeNoop,
    () => getStoredEditToken(slug),
    () => null,
  );
}
