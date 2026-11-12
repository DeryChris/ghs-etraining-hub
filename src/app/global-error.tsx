export default function GlobalError() {
  return (
    <html>
      <body className="bg-slate-950 text-slate-200 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">System Error</h1>
          <p className="text-slate-400 mt-2">
            A critical error occurred. Please refresh the page.
          </p>
        </div>
      </body>
    </html>
  );
}
