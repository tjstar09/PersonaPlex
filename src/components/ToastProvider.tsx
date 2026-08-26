"use client";

import { ToastContainer, useToastStore, type ToastType } from "@/lib/toast";

/** Convenience function to show toast from anywhere */
export function showToast(
  message: string,
  type: ToastType = "info",
  duration?: number
) {
  useToastStore.getState().add({ message, type, duration });
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
