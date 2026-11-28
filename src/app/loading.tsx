export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas" aria-busy="true">
      <div role="status" aria-label="Loading" className="flex flex-col items-center gap-3">
        <span aria-hidden="true" className="flex h-8 items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce" />
          <span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce" style={{ animationDelay: "120ms" }} />
          <span className="h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce" style={{ animationDelay: "240ms" }} />
        </span>
        <p className="text-sm text-ink-muted">Loading</p>
      </div>
    </main>
  );
}
