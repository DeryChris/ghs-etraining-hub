import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { resolveAccount } from "@/lib/server/session";

/** Public pages. The header adapts its call to action for signed-in staff. */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const account = await resolveAccount();
  const signedIn = account.state === "active";

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-ink"
      >
        Skip to main content
      </a>
      <SiteHeader signedIn={signedIn} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
