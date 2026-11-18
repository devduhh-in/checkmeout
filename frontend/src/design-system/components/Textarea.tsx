"use client";

import type { Ref, TextareaHTMLAttributes } from "react";

import { cn } from "@/design-system/cn";
import { Field, controlClasses } from "@/design-system/components/Field";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  label,
  hint,
  error,
  required,
  id,
  rows = 4,
  className,
  ...rest
}: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id}>
      {(control) => (
        <textarea
          {...control}
          rows={rows}
          className={cn(controlClasses, "resize-y py-2.5", className)}
          {...rest}
        />
      )}
    </Field>
  );
}
