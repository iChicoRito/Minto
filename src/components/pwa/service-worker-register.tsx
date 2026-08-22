"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1" || !("serviceWorker" in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    void navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` });
  }, []);

  return null;
}
