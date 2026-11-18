"use client";

import { X } from "lucide-react";
import type { ButtonHTMLAttributes, Ref } from "react";

import { cn } from "@/design-system/cn";

/** The shared "×" button used by modals, drawers and toasts. */
export function CloseButton({
  className,
  ref,
  "aria-label": ariaLabel = "Close",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted",
        "transition-colors duration-(--cmo-duration-fast) hover:bg-surface-sunken hover:text-text",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      <X aria-hidden="true" className="size-5" />
    </button>
  );
}
