"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastApi {
  push: (message: string, tone?: Tone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toneStyles: Record<Tone, { wrap: string; icon: ReactNode }> = {
  success: {
    wrap: "border-accent/25 bg-surface",
    icon: <CheckCircle2 size={17} className="text-accent" />,
  },
  error: {
    wrap: "border-danger/25 bg-surface",
    icon: <AlertCircle size={17} className="text-danger" />,
  },
  info: {
    wrap: "border-line-strong bg-surface",
    icon: <Info size={17} className="text-muted" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = nextId.current++;
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 5200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end sm:px-0"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "animate-rise pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg shadow-ink/5",
              toneStyles[item.tone].wrap,
            )}
          >
            <span className="mt-0.5 shrink-0">{toneStyles[item.tone].icon}</span>
            <p className="flex-1 text-[13px] leading-relaxed text-ink-soft">
              {item.message}
            </p>
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label="关闭提示"
              className="mt-0.5 shrink-0 rounded p-0.5 text-muted transition-colors hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
