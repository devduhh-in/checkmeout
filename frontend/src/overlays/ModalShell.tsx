"use client";

import { Dialog } from "radix-ui";
import { useRef, type ReactNode } from "react";

import { cn } from "@/design-system/cn";
import { CloseButton } from "@/overlays/CloseButton";
import type { OverlayControlProps } from "@/overlays/types";

const SIZES = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" } as const;

const PLACEMENT = {
  // Phones: a sheet rising from the bottom, padded clear of the iPhone home
  // indicator. Larger screens: a centred card (no edge, so no padding).
  center: cn(
    "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl pb-safe sm:pb-0",
    "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
    "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100vw-2rem)] sm:max-h-[calc(100dvh-4rem)]",
    "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
    "sm:data-[state=open]:animate-modal-in sm:data-[state=closed]:animate-modal-out",
  ),
  // A full-height panel sliding in from the right (full width on phones),
  // padded clear of the notch, home indicator and sideways-phone edge.
  right: cn(
    "inset-y-0 right-0 h-dvh w-full pt-safe pr-safe pb-safe sm:max-w-md sm:rounded-l-xl",
    "data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out",
  ),
} as const;

export interface ModalShellProps extends OverlayControlProps {
  title: string;
  description?: string;
  children?: ReactNode;
  /** Action buttons, shown in a footer that stays visible while the body scrolls. */
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  placement?: keyof typeof PLACEMENT;
  /**
   * When false, Escape, clicking outside and the close button do nothing.
   * Used while something is saving so it can't be interrupted halfway.
   */
  dismissible?: boolean;
  /** Choose which element gets focus when it opens (defaults to the first focusable one). */
  initialFocus?: () => HTMLElement | null | undefined;
}

/**
 * The one visual and behavioural frame for every modal and drawer.
 *
 * Radix Dialog provides the accessibility: focus moves into the dialog and is
 * trapped there, Escape closes it, the page behind stops scrolling, screen
 * readers announce the title, and focus returns to where it was on close.
 */
export function ModalShell({
  open,
  onOpenChange,
  onExited,
  title,
  description,
  children,
  footer,
  size = "md",
  placement = "center",
  dismissible = true,
  initialFocus,
}: ModalShellProps) {
  // Radix only restores focus to its own <Dialog.Trigger>. Our overlays are often
  // opened from code, so remember what had focus and put it back on close.
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const blockIfLocked = (event: Event) => {
    if (!dismissible) event.preventDefault();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (next || dismissible) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-overlay",
            "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out",
          )}
        />
        <Dialog.Content
          // Without a description, tell Radix there's intentionally nothing to link.
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            returnFocusTo.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            const target = initialFocus?.();
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          onEscapeKeyDown={blockIfLocked}
          onPointerDownOutside={blockIfLocked}
          onInteractOutside={blockIfLocked}
          // Runs once the dialog has fully closed (after its exit animation).
          onCloseAutoFocus={(event) => {
            const target = returnFocusTo.current;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
            onExited?.();
          }}
          className={cn(
            "fixed z-50 flex flex-col bg-surface text-text shadow-lg outline-none",
            PLACEMENT[placement],
            placement === "center" && SIZES[size],
          )}
        >
          <header className="flex items-start gap-4 px-6 pt-6 pb-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <CloseButton disabled={!dismissible} className="-m-1.5" />
            </Dialog.Close>
          </header>

          {children && <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>}

          {footer && (
            <footer
              className={cn(
                "flex flex-col-reverse gap-2 border-t border-border px-6 py-4",
                "sm:flex-row sm:justify-end",
                placement === "right" && "mt-auto",
              )}
            >
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
