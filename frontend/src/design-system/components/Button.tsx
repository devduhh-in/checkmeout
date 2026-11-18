import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/design-system/cn";
import { Spinner } from "@/design-system/components/Spinner";

const VARIANTS = {
  primary: "bg-primary text-on-primary shadow-sm hover:bg-primary-hover",
  secondary: "bg-surface text-text border border-border-strong shadow-sm hover:bg-surface-sunken",
  ghost: "bg-transparent text-text hover:bg-surface-sunken",
  danger: "bg-danger text-on-danger shadow-sm hover:bg-danger-hover",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and tells assistive tech it is busy. */
  loading?: boolean;
  fullWidth?: boolean;
  /** Optional icon before the label (replaced by the spinner while loading). */
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold whitespace-nowrap",
        "transition-colors duration-(--cmo-duration-fast) select-none",
        "disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}
