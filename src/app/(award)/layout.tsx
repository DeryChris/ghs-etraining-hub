import type { ReactNode } from "react";

/**
 * Print-first layout: no shell, no navigation, nothing to strip before saving as
 * PDF. The proxy still gates these routes, and each page re-checks the session.
 */
export default function AwardLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-5 py-10 print:max-w-none print:p-0">{children}</div>;
}
