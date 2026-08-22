"use client";

import { setClientCookie } from "../cookie.client";
import { setLocalStorageValue } from "../local-storage.client";
import { PREFERENCE_PERSISTENCE, type PreferenceKey } from "./preferences-config";

export async function persistPreference(key: PreferenceKey, value: string, options?: { throwOnError?: boolean }) {
  try {
    const mode = PREFERENCE_PERSISTENCE[key];

    switch (mode) {
      case "none":
        return;
      case "client-cookie":
      case "server-cookie":
        setClientCookie(key, value);
        return;
      case "localStorage":
        if (options?.throwOnError) window.localStorage.setItem(key, value);
        else setLocalStorageValue(key, value);
        return;
      default:
        return;
    }
  } catch (error) {
    if (options?.throwOnError) throw error;
  }
}
