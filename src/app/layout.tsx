import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "GHS eTraining Hub - Ghana Health Service CPD Portal",
  description:
    "Ghana Health Service Continuous Professional Development & Clinical Learning Portal. Role-based e-learning for medical officers, nurses, midwives, pharmacists, and administrative personnel across all 16 regions of Ghana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen`}>{children}</body>
    </html>
  );
}
