import type { ReactNode } from "react";
import { AuthArt } from "@/components/brand/auth-art";

/**
 * The signed-out frame: a backdrop, and whatever card the page draws on it.
 *
 * The card is the page's own — sign in wants two halves, registration wants one
 * column — so this layout only centres, paints and signs the page. The backdrop
 * is decorative and the card is the brightest thing on it, which is where the eye
 * should land.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden">
      <AuthArt />
      <div className="flag-stripe absolute inset-x-0 top-0 z-10 h-1.5" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-4xl">
          <div className="flex justify-center">{children}</div>

          <p className="mt-5 text-center text-[13px] font-semibold leading-relaxed text-white/90">
            Internal platform. Access is monitored and recorded.
          </p>
        </div>
      </div>
    </main>
  );
}
