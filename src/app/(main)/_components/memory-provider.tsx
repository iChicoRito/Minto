"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { type MemoryRepository, memoryRepository } from "@/lib/browser-memory/repository.client";
import type { MemoryRepositoryError } from "@/lib/browser-memory/types";

type MemoryContextValue = {
  status: "loading" | "ready" | "unavailable";
  error: MemoryRepositoryError | null;
  repository: MemoryRepository;
  retry: () => void;
};

const MemoryContext = createContext<MemoryContextValue | null>(null);

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<MemoryContextValue["status"]>("loading");
  const [error, setError] = useState<MemoryRepositoryError | null>(null);

  useEffect(() => {
    void attempt;
    let active = true;
    setStatus("loading");
    void memoryRepository.open().then(
      () => {
        if (active) {
          setStatus("ready");
          setError(null);
        }
      },
      (reason: MemoryRepositoryError) => {
        if (active) {
          setStatus("unavailable");
          setError(reason);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const value = useMemo(
    () => ({ status, error, repository: memoryRepository, retry: () => setAttempt((value) => value + 1) }),
    [error, status],
  );
  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
}

export function useMemory(): MemoryContextValue {
  const value = useContext(MemoryContext);
  if (!value) throw new Error("Missing MemoryProvider");
  return value;
}
