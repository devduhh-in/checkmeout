"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/design-system/components/Button";
import { ErrorBanner } from "@/overlays/ErrorBanner";
import { errorMessage } from "@/overlays/error-message";
import { ModalShell, type ModalShellProps } from "@/overlays/ModalShell";
import type { OverlayControlProps } from "@/overlays/types";

/** Form values by field name (from each control's `name` attribute). */
export type FormValues = Record<string, string>;
/** Validation messages by field name; an empty object means "valid". */
export type FieldErrors = Partial<Record<string, string>>;

export interface FormModalState {
  errors: FieldErrors;
  submitting: boolean;
}

export interface FormModalOptions<Result = unknown> {
  title: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  size?: ModalShellProps["size"];
  /**
   * The form fields. Pass a function to receive validation errors, e.g.
   * ({ errors }) => <Input name="name" label="Name" error={errors.name} />
   */
  fields: ReactNode | ((state: FormModalState) => ReactNode);
  /** Return messages for invalid fields; the form won't submit until it's valid. */
  validate?: (values: FormValues) => FieldErrors;
  /** Save the data. Throw to show an error and keep the form open. */
  onSubmit: (values: FormValues) => Result | Promise<Result>;
  /** Called with onSubmit's result after a successful save, just before closing. */
  onSuccess?: (result: Result) => void;
}

export type FormModalProps<Result = unknown> = FormModalOptions<Result> & OverlayControlProps;

/**
 * A modal containing a form. Feature code supplies only the fields,
 * validation and save function; this handles submitting, loading, errors,
 * focus and closing the same way everywhere.
 */
export function FormModal<Result = unknown>({
  open,
  onOpenChange,
  onExited,
  title,
  description,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  size = "md",
  fields,
  validate,
  onSubmit,
  onSuccess,
}: FormModalProps<Result>) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // After a failed validation, move focus to the first invalid field.
  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = readValues(event.currentTarget);

    const found = validate?.(values) ?? {};
    const invalid = Object.fromEntries(Object.entries(found).filter(([, message]) => message));
    setErrors(invalid);
    setSubmitError(undefined);
    if (Object.keys(invalid).length > 0) return;

    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      onSuccess?.(result);
      onOpenChange(false);
    } catch (caught) {
      setSubmitError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      onExited={onExited}
      title={title}
      description={description}
      size={size}
      dismissible={!submitting}
      initialFocus={() =>
        formRef.current?.querySelector<HTMLElement>("input, textarea, select") ?? undefined
      }
      footer={
        <>
          <Button variant="secondary" disabled={submitting} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        {submitError && <ErrorBanner message={submitError} />}
        <fieldset disabled={submitting} className="flex flex-col gap-4">
          {typeof fields === "function" ? fields({ errors, submitting }) : fields}
        </fieldset>
      </form>
    </ModalShell>
  );
}

function readValues(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  for (const [name, value] of new FormData(form)) {
    // Only text values for now; file uploads arrive with the media milestone.
    if (typeof value === "string") values[name] = value;
  }
  return values;
}
