import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHS-ELN - Ghana Health Service eLearning Network",
  description: "Continuous Professional Development & Clinical Learning Portal for Ghana Health Service staff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
