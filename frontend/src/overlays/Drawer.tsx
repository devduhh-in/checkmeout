"use client";

import { ModalShell, type ModalShellProps } from "@/overlays/ModalShell";

export type DrawerProps = Omit<ModalShellProps, "placement" | "size">;

/** A side panel. Same behaviour as a modal, sliding in from the right. */
export function Drawer(props: DrawerProps) {
  return <ModalShell {...props} placement="right" />;
}
