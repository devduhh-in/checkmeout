"use client";

import { useId, type ReactNode } from "react";

/** What a form control needs from its Field to be wired up accessibly. */
export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required?: boolean;
}

export interface FieldProps {
  label: string;
  /** Short help text shown under the control. */
  hint?: string;
  /** Validation message. Marks the control invalid and is announced with it. */
  error?: string;
  required?: boolean;
  /** Use an existing id instead of a generated one. */
  id?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Shared label + hint + error layout for every form control (Input, Textarea,
 * Select), so they all look and behave the same way and stay accessible.
 */
export function Field({ label, hint, error, required, id, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={controlId} className="text-sm font-semibold text-text">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required,
      })}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Base look shared by all text-like controls. */
export const controlClasses = [
  "w-full rounded-md border border-border-strong bg-surface px-3 text-base text-text",
  "placeholder:text-muted transition-colors duration-(--cmo-duration-fast)",
  "hover:border-text/60 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70",
  "aria-invalid:border-danger aria-invalid:focus-visible:outline-danger",
].join(" ");
