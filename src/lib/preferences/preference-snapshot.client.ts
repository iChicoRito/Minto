"use client";

import { getLocalStorageValue } from "@/lib/local-storage.client";

import { defaultPreferenceSnapshot, normalizePreferenceSnapshot, type PreferenceSnapshot } from "./preference-snapshot";
import { PREFERENCE_PERSISTENCE } from "./preferences-config";

export function readPreferenceSnapshot(): PreferenceSnapshot {
  const root = document.documentElement;
  const values = Object.fromEntries(
    Object.keys(PREFERENCE_PERSISTENCE).map((key) => {
      const attribute = key.replaceAll("_", "-");
      const mode = PREFERENCE_PERSISTENCE[key as keyof typeof PREFERENCE_PERSISTENCE];
      const value = mode === "localStorage" ? getLocalStorageValue(key) : root.getAttribute(`data-${attribute}`);
      return [key, value ?? undefined];
    }),
  ) as Partial<Record<keyof PreferenceSnapshot, string>>;
  return normalizePreferenceSnapshot(values);
}

export function readDefaultPreferenceSnapshot(): PreferenceSnapshot {
  return defaultPreferenceSnapshot();
}
