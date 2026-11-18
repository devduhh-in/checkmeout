"use client";

import { ChevronDown } from "lucide-react";
import type { Ref, SelectHTMLAttributes } from "react";

import { cn } from "@/design-system/cn";
import { Field, controlClasses } from "@/design-system/components/Field";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  options: SelectOption[];
  /** Shown as a first, empty choice (e.g. "Choose a profession"). */
  placeholder?: string;
  hint?: string;
  error?: string;
  id?: string;
  ref?: Ref<HTMLSelectElement>;
}

/**
 * Uses the browser's native <select>: fully accessible and gives people the
 * familiar picker on phones, styled to match the other controls.
 */
export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  required,
  id,
  className,
  defaultValue,
  value,
  ...rest
}: SelectProps) {
  // With a placeholder and no chosen value, start on the empty option.
  const initial = value === undefined && defaultValue === undefined && placeholder ? "" : undefined;

  return (
    <Field label={label} hint={hint} error={error} required={required} id={id}>
      {(control) => (
        <div className="relative">
          <select
            {...control}
            value={value}
            defaultValue={defaultValue ?? initial}
            className={cn(controlClasses, "h-11 cursor-pointer appearance-none pr-10", className)}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
          />
        </div>
      )}
    </Field>
  );
}
