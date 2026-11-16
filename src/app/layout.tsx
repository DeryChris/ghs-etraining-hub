import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { MotionProvider } from "@/components/motion-provider";
import { themeBootScript } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "GHS-ELN · Ghana Health Service eTraining Network",
    template: "%s · GHS-ELN",
  },
  description:
    "Clinical protocols, practical training and verifiable CPD for Ghana Health Service staff in every region.",
  applicationName: "GHS-ELN",
  // Internal government platform: keep it out of public search indexes.
  robots: { index: false, follow: false },
  openGraph: {
    title: "GHS-ELN · Ghana Health Service eTraining Network",
    description: "Clinical protocols, practical training and verifiable CPD for GHS staff.",
    siteName: "GHS-ELN",
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
