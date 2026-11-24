import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";
import { MotionProvider } from "@/components/motion-provider";
import { resolveAppUrl } from "@/lib/app-url";
import { SITE } from "@/lib/site";
import { themeBootScript } from "@/lib/theme";

/*
 * The typeface is vendored under src/assets/fonts (SIL OFL 1.1, see OFL.txt).
 * next/font/google downloads at build time, which fails in offline or
 * egress-restricted CI — a self-hosted variable font makes the build hermetic
 * and removes a third-party request from the critical path for learners on
 * metered mobile data.
 */
const jakarta = localFont({
  src: "../assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

/*
 * Resolved, repaired and never thrown: a typo in NEXT_PUBLIC_APP_URL used to fail
 * the whole production build here (see src/lib/app-url.ts).
 */
const APP_URL = resolveAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL.url),
  title: {
    default: `${SITE.code} · ${SITE.fullName}`,
    template: `%s · ${SITE.code}`,
  },
  description: SITE.description,
  applicationName: SITE.code,
  // Internal government platform: keep it out of public search indexes.
  robots: { index: false, follow: false },
  openGraph: {
    title: `${SITE.code} · ${SITE.fullName}`,
    description: SITE.purpose,
    siteName: SITE.code,
    locale: "en_GH",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#050d09" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GH" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
