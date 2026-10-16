"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mcu-watched";

function readFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeToStorage(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // storage unavailable — silently ignore
  }
}

export interface UseWatched {
  watchedIds: Set<string>;
  isWatched: (id: string) => boolean;
  toggle: (id: string) => void;
  reset: () => void;
}

export function useWatched(): UseWatched {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setWatchedIds(readFromStorage());
  }, []);

  const toggle = useCallback((id: string) => {
    setWatchedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      writeToStorage(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const empty = new Set<string>();
    writeToStorage(empty);
    setWatchedIds(empty);
  }, []);

  const isWatched = useCallback((id: string) => watchedIds.has(id), [watchedIds]);

  return { watchedIds, isWatched, toggle, reset };
}
