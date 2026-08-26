"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => string;
  remove: (id: string) => void;
  clear: () => void;
}

let idCounter = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  add: (toast) => {
    const id = `toast-${Date.now()}-${++idCounter}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    if (toast.duration !== 0) {
      setTimeout(() => get().remove(id), toast.duration ?? 4000);
    }
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Convenience helpers */
export const toast = {
  info: (message: string, duration?: number) =>
    useToastStore.getState().add({ message, type: "info", duration }),
  success: (message: string, duration?: number) =>
    useToastStore.getState().add({ message, type: "success", duration }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().add({ message, type: "warning", duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().add({ message, type: "error", duration }),
  dismiss: (id: string) => useToastStore.getState().remove(id),
  clear: () => useToastStore.getState().clear(),
};

/** React component to render toasts */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const icons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  };
  const colors = {
    info: "border-accent-2/50 bg-cyan-400/10 text-cyan-300",
    success: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300",
    warning: "border-warning/50 bg-warning/10 text-warning",
    error: "border-danger/50 bg-danger/10 text-danger",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 100, y: 20 }}
      className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-3 max-w-xs shadow-xl ${colors[toast.type]}`}
    >
      <span className="text-lg">{icons[toast.type]}</span>
      <span className="flex-1 text-sm">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            useToastStore.getState().remove(toast.id);
          }}
          className="text-xs underline hover:no-underline"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => useToastStore.getState().remove(toast.id)}
        className="p-1 hover:bg-white/10 rounded"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </motion.div>
  );
}
