"use client";

import type { InputHTMLAttributes, Ref } from "react";

import { cn } from "@/design-system/cn";
import { Field, controlClasses } from "@/design-system/components/Field";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ label, hint, error, required, id, className, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} id={id}>
      {(control) => (
        <input {...control} className={cn(controlClasses, "h-11", className)} {...rest} />
      )}
    </Field>
  );
}
