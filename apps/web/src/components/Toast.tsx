"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ToastState {
  message: string;
  id: number;
}

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    setToast({ message, id: Date.now() });

    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-none fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 animate-fade-in-up"
        >
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950/95 px-4 py-2.5 text-sm text-zinc-100 shadow-xl">
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return ctx;
}
