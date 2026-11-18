/**
 * The one-line result of a form post: "Added X" or "That did not work, because…".
 * Plain HTML, no client JavaScript — these pages are form posts to Server
 * Actions and the message arrives in the URL, so it survives a reload.
 */
export function Notice({ notice, error }: { notice?: string | null; error?: string | null }) {
  if (!notice && !error) return null;

  return (
    <p
      role="status"
      className={`rounded-control border px-4 py-3 text-sm font-medium ${
        error ? "border-danger/40 bg-danger/10 text-danger" : "border-primary/30 bg-primary/10 text-primary"
      }`}
    >
      {error ?? notice}
    </p>
  );
}
