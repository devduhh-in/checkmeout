"use client";

import { useEffect, useState } from "react";

import { cn, Spinner } from "@/design-system";

type Status =
  | { state: "checking" }
  | { state: "healthy"; version: string }
  | { state: "unreachable"; reason: string };

const TIMEOUT_MS = 5000;

/**
 * Asks the backend for its health through the same /api path the real
 * dashboard will use, proving browser → proxy → FastAPI works end to end.
 */
export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: "checking" });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);

    async function check() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          // 5xx here usually means the forwarding step couldn't reach the backend.
          const reason =
            response.status >= 500
              ? "the API is not responding"
              : `the API answered with ${response.status}`;
          setStatus({ state: "unreachable", reason });
          return;
        }
        const body: unknown = await response.json();
        const ok =
          typeof body === "object" &&
          body !== null &&
          (body as { status?: unknown }).status === "ok";
        if (!ok) {
          setStatus({ state: "unreachable", reason: "unexpected response from the API" });
          return;
        }
        const version = String((body as { version?: unknown }).version ?? "unknown");
        setStatus({ state: "healthy", version });
      } catch {
        if (controller.signal.reason === "unmounted") return;
        setStatus({ state: "unreachable", reason: "the API could not be reached" });
      } finally {
        clearTimeout(timer);
      }
    }

    void check();
    return () => {
      clearTimeout(timer);
      controller.abort("unmounted");
    };
  }, []);

  return (
    <p
      role="status"
      aria-live="polite"
      data-api-status={status.state}
      className={cn(
        "flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium",
        status.state === "checking" && "border-border bg-surface-sunken text-muted",
        status.state === "healthy" && "border-success/30 bg-success-soft text-success",
        status.state === "unreachable" && "border-danger/30 bg-danger-soft text-danger",
      )}
    >
      {status.state === "checking" && (
        <>
          <Spinner size="sm" /> API: checking…
        </>
      )}
      {status.state === "healthy" && `API: healthy (version ${status.version})`}
      {status.state === "unreachable" &&
        `API: unreachable — ${status.reason}. Is the backend running?`}
    </p>
  );
}
