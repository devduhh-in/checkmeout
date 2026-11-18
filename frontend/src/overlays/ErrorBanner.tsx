/** Inline error shown inside overlays when an action fails. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
    >
      {message}
    </div>
  );
}
