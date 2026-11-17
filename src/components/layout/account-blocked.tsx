import { ShieldAlert, UserX } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOutAction } from "@/lib/server/actions/auth";
import { SITE } from "@/lib/site";

const COPY = {
  unprovisioned: {
    icon: ShieldAlert,
    title: "Your account is not set up yet",
    body: `You have signed in, but your staff record is not on the ${SITE.fullName} directory yet. Ask your facility administrator to add you, then sign in again.`,
  },
  inactive: {
    icon: UserX,
    title: "This account is inactive",
    body: `Your ${SITE.name} access has been paused. Contact your facility administrator or the GHS ICT helpdesk.`,
  },
} as const;

export function AccountBlocked({ state }: { state: keyof typeof COPY }) {
  const copy = COPY[state];
  const Icon = copy.icon;
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-5">
      <div className="surface-card w-full max-w-md space-y-6 p-8 text-center">
        <BrandMark size={44} className="mx-auto" />
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn/12 text-warn">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">{copy.title}</h1>
          <p className="text-sm leading-relaxed text-ink-muted">{copy.body}</p>
        </div>
        <form action={signOutAction}>
          <SubmitButton variant="secondary" className="w-full rounded-[var(--radius-pill)]" pendingLabel="Signing out…">
            Sign out
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
