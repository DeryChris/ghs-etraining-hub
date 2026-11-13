"use client";

export default function GlobalError() {
  return (
    <html>
      <body className="bg-canvas text-ink flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink">System Error</h1>
          <p className="text-ink-muted text-sm mt-2">
            A critical error occurred. Please refresh the page.
          </p>
        </div>
      </body>
    </html>
  );
}
