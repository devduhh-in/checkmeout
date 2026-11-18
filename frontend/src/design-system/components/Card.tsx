import type { HTMLAttributes } from "react";

import { cn } from "@/design-system/cn";

const PADDING = { none: "", sm: "p-4", md: "p-6", lg: "p-8" } as const;
const TONES = {
  raised: "bg-surface border border-border shadow-md",
  flat: "bg-surface border border-border",
  sunken: "bg-surface-sunken",
} as const;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof PADDING;
  tone?: keyof typeof TONES;
}

/** A soft, rounded container for grouping related content. */
export function Card({ padding = "md", tone = "raised", className, ...rest }: CardProps) {
  return <div className={cn("rounded-lg", TONES[tone], PADDING[padding], className)} {...rest} />;
}
