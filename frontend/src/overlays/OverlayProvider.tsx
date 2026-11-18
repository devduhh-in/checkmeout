"use client";

import type { ReactNode } from "react";

import { ModalProvider } from "@/overlays/ModalProvider";
import { ToastProvider } from "@/overlays/ToastProvider";

/** Enables useModal() and useToast() for everything inside it. */
export function OverlayProvider({ children }: { children: ReactNode }) {
  // Toasts sit outside modals so a modal can show a toast (e.g. "Saved").
  return (
    <ToastProvider>
      <ModalProvider>{children}</ModalProvider>
    </ToastProvider>
  );
}
