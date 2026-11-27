import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
/*
 * The typefaces are vendored through `@fontsource-variable/*` (SIL OFL 1.1),
 * resolved from node_modules at build time. next/font/google downloads at
 * build time, which fails in offline or egress-restricted CI — bundling the
 * variable fonts makes the build hermetic and removes a third-party request
 * from the critical path for learners on metered mobile data.
 */
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "./globals.css";
import { MotionProvider } from "@/components/motion-provider";
import { FormDrafts } from "@/components/ui/form-drafts";
import { resolveAppUrl } from "@/lib/app-url";
import { SITE } from "@/lib/site";
import { themeBootScript } from "@/lib/theme";

/*
 * Resolved, repaired and never thrown: a typo in NEXT_PUBLIC_APP_URL used to fail
 * the whole production build here (see src/lib/app-url.ts).
 */
const APP_URL = resolveAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL.url),
  title: {
    default: `${SITE.name} | Ghana Health Service`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  // Internal government platform: keep it out of public search indexes.
  robots: { index: false, follow: false },
  openGraph: {
    title: `${SITE.name} | Ghana Health Service`,
    description: SITE.purpose,
    siteName: SITE.name,
    locale: "en_GH",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1310" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GH" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <FormDrafts />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
