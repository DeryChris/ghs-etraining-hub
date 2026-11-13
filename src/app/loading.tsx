export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-hairline border-t-primary rounded-full animate-spin"></div>
        <p className="text-ink-muted text-sm">Loading</p>
      </div>
    </div>
  );
}
