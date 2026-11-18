"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { Toast } from "radix-ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/design-system/cn";
import { CloseButton } from "@/overlays/CloseButton";

export type ToastTone = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** How long it stays visible, in milliseconds. */
  duration?: number;
}

export interface ToastApi {
  show(options: ToastOptions): void;
  success(title: string, description?: string): void;
  error(title: string, description?: string): void;
  info(title: string, description?: string): void;
}

interface Item extends ToastOptions {
  id: number;
  open: boolean;
}

const TONES = {
  success: { icon: CircleCheck, className: "text-success" },
  error: { icon: CircleAlert, className: "text-danger" },
  info: { icon: Info, className: "text-info" },
} as const;

const DEFAULT_DURATION_MS = 5000;
// Errors stay a little longer so there's time to read them.
const ERROR_DURATION_MS = 8000;
const REMOVE_AFTER_CLOSE_MS = 400;

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Notifications in the corner of the screen. Built on Radix Toast: screen
 * readers announce them (errors assertively), they pause while hovered or
 * focused, can be swiped away, and F8 jumps to them from the keyboard.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, open: false } : item)),
    );
    setTimeout(
      () => setItems((current) => current.filter((item) => item.id !== id)),
      REMOVE_AFTER_CLOSE_MS,
    );
  }, []);

  const api = useMemo<ToastApi>(() => {
    const show = (options: ToastOptions) =>
      setItems((current) => [...current, { ...options, id: nextId.current++, open: true }]);
    return {
      show,
      success: (title, description) => show({ title, description, tone: "success" }),
      error: (title, description) => show({ title, description, tone: "error" }),
      info: (title, description) => show({ title, description, tone: "info" }),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      <Toast.Provider swipeDirection="right" duration={DEFAULT_DURATION_MS} label="Notification">
        {children}
        {items.map((item) => {
          const tone = TONES[item.tone ?? "info"];
          const Icon = tone.icon;
          return (
            <Toast.Root
              key={item.id}
              open={item.open}
              onOpenChange={(open) => !open && dismiss(item.id)}
              type={item.tone === "error" ? "foreground" : "background"}
              duration={item.duration ?? (item.tone === "error" ? ERROR_DURATION_MS : undefined)}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border bg-surface p-4 text-text shadow-lg",
                "data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out",
                "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)",
                "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform",
                "data-[swipe=end]:animate-toast-out",
              )}
            >
              <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", tone.className)} />
              <div className="min-w-0 flex-1">
                <Toast.Title className="text-sm font-semibold">{item.title}</Toast.Title>
                {item.description && (
                  <Toast.Description className="mt-0.5 text-sm text-muted">
                    {item.description}
                  </Toast.Description>
                )}
              </div>
              <Toast.Close asChild>
                <CloseButton aria-label="Dismiss notification" className="-m-1.5 size-8" />
              </Toast.Close>
            </Toast.Root>
          );
        })}
        <Toast.Viewport
          className={cn(
            "fixed right-0 bottom-0 z-[60] m-0 flex w-full list-none flex-col gap-2 p-4 outline-none",
            // Stay above the iPhone home indicator and clear of a sideways notch.
            "pr-[calc(--spacing(4)+env(safe-area-inset-right,0px))]",
            "pb-[calc(--spacing(4)+env(safe-area-inset-bottom,0px))]",
            "sm:max-w-sm",
          )}
        />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

/** Show a notification from anywhere in the app. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <OverlayProvider>.");
  return api;
}
