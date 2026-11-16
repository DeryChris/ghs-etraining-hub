/** Shown while a signed-in page streams in. Shapes match the real layout, so nothing jumps. */
export default function DashboardLoading() {
  return (
    <div className="space-y-8" role="status" aria-live="polite" aria-label="Loading">
      <div className="space-y-4">
        <div className="skeleton h-3 w-32 rounded-full" />
        <div className="skeleton h-9 w-2/3 max-w-md rounded-control" />
        <div className="skeleton h-4 w-full max-w-xl rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="surface-card space-y-4 p-5">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-8 w-16 rounded-control" />
            <div className="skeleton h-3 w-32 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="surface-card h-28 p-5">
              <div className="skeleton h-full rounded-control" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="surface-card h-36 p-5">
              <div className="skeleton h-full rounded-control" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
