"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ConfirmationModal, type ConfirmationOptions } from "@/overlays/ConfirmationModal";
import { FormModal, type FormModalOptions } from "@/overlays/FormModal";
import type { OverlayControlProps } from "@/overlays/types";

type RenderOverlay = (controls: OverlayControlProps) => ReactNode;

interface Entry {
  id: number;
  open: boolean;
  render: RenderOverlay;
}

export interface ModalApi {
  /**
   * Open any overlay. The render function receives open/close wiring to spread
   * onto ModalShell, Drawer, FormModal or ConfirmationModal.
   */
  open(render: RenderOverlay, options?: { onClose?: () => void }): { close: () => void };
  /** Ask a yes/no question. Resolves true if confirmed, false if cancelled or dismissed. */
  confirm(options: ConfirmationOptions): Promise<boolean>;
  /** Show a form. Resolves with onSubmit's result, or undefined if cancelled. */
  form<Result>(options: FormModalOptions<Result>): Promise<Result | undefined>;
}

const ModalContext = createContext<ModalApi | null>(null);

// Safety net in case an overlay never reports that its exit animation ended.
const REMOVE_FALLBACK_MS = 1000;

/** Central controller: renders every open modal/drawer in one place. */
export function ModalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(1);
  const closed = useRef(new Set<number>());
  // Close callbacks live outside state so they run exactly once, outside render.
  const onCloseCallbacks = useRef(new Map<number, () => void>());

  const remove = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    closed.current.delete(id);
  }, []);

  const close = useCallback(
    (id: number) => {
      if (closed.current.has(id)) return;
      closed.current.add(id);
      onCloseCallbacks.current.get(id)?.();
      onCloseCallbacks.current.delete(id);
      setEntries((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, open: false } : entry)),
      );
      setTimeout(() => remove(id), REMOVE_FALLBACK_MS);
    },
    [remove],
  );

  const api = useMemo<ModalApi>(() => {
    const open: ModalApi["open"] = (render, options) => {
      const id = nextId.current++;
      if (options?.onClose) onCloseCallbacks.current.set(id, options.onClose);
      setEntries((current) => [...current, { id, open: true, render }]);
      return { close: () => close(id) };
    };

    return {
      open,
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          let confirmed = false;
          open(
            (controls) => (
              <ConfirmationModal
                {...options}
                {...controls}
                onConfirm={async () => {
                  await options.onConfirm?.();
                  confirmed = true;
                }}
              />
            ),
            { onClose: () => resolve(confirmed) },
          );
        }),
      form: <Result,>(options: FormModalOptions<Result>) =>
        new Promise<Result | undefined>((resolve) => {
          let outcome: { result: Result } | undefined;
          open(
            (controls) => (
              <FormModal<Result>
                {...options}
                {...controls}
                onSuccess={(result) => {
                  outcome = { result };
                  options.onSuccess?.(result);
                }}
              />
            ),
            { onClose: () => resolve(outcome?.result) },
          );
        }),
    };
  }, [close]);

  return (
    <ModalContext.Provider value={api}>
      {children}
      {entries.map((entry) => (
        <OverlayEntry key={entry.id} entry={entry} onClose={close} onRemove={remove} />
      ))}
    </ModalContext.Provider>
  );
}

function OverlayEntry({
  entry,
  onClose,
  onRemove,
}: {
  entry: Entry;
  onClose: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  return entry.render({
    open: entry.open,
    onOpenChange: (next) => {
      if (!next) onClose(entry.id);
    },
    onExited: () => onRemove(entry.id),
  });
}

/** Open modals, confirmations, forms and drawers from anywhere in the app. */
export function useModal(): ModalApi {
  const api = useContext(ModalContext);
  if (!api) throw new Error("useModal must be used inside <OverlayProvider>.");
  return api;
}
