/**
 * The shape of a page while it loads. One component, four call sites, so every
 * tab acknowledges a click with the same rhythm instead of a blank panel — which
 * is what makes a slow query look like a broken menu.
 */
export function PageSkeleton({
  label = "Loading",
  rows = 4,
  showStats = true,
}: {
  label?: string;
  rows?: number;
  showStats?: boolean;
}) {
  return (
    <div className="space-y-8" role="status" aria-live="polite" aria-label={label}>
      <div className="space-y-4">
        <div className="skeleton h-3 w-28 rounded-full" />
        <div className="skeleton h-8 w-64 max-w-full rounded-control" />
        <div className="skeleton h-4 w-full max-w-xl rounded-full" />
      </div>
      {showStats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="surface-card space-y-3 p-5">
              <div className="skeleton h-3 w-20 rounded-full" />
              <div className="skeleton h-7 w-14 rounded-control" />
            </div>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="surface-card flex items-center gap-4 p-5">
            <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-4 w-1/2 rounded-full" />
              <div className="skeleton h-3 w-3/4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
