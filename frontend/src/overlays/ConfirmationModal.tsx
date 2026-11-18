"use client";

import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/design-system/components/Button";
import { ErrorBanner } from "@/overlays/ErrorBanner";
import { errorMessage } from "@/overlays/error-message";
import { ModalShell } from "@/overlays/ModalShell";
import type { OverlayControlProps } from "@/overlays/types";

export interface ConfirmationOptions {
  title: string;
  description?: string;
  /** Extra content under the description (e.g. what exactly will be deleted). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions like deleting: red button, Cancel focused first. */
  tone?: "default" | "danger";
  /**
   * Runs when the person confirms. While it runs the modal shows a loading
   * state and can't be dismissed; if it throws, the error is shown and the
   * modal stays open so they can retry or cancel.
   */
  onConfirm?: () => void | Promise<void>;
}

export type ConfirmationModalProps = ConfirmationOptions & OverlayControlProps;

export function ConfirmationModal({
  open,
  onOpenChange,
  onExited,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
}: ConfirmationModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm?.();
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      onExited={onExited}
      title={title}
      description={description}
      size="sm"
      dismissible={!busy}
      initialFocus={() => (tone === "danger" ? cancelRef.current : confirmRef.current)}
      footer={
        <>
          <Button
            ref={cancelRef}
            variant="secondary"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === "danger" ? "danger" : "primary"}
            loading={busy}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {(children || error) && (
        <div className="flex flex-col gap-3">
          {children}
          {error && <ErrorBanner message={error} />}
        </div>
      )}
    </ModalShell>
  );
}
