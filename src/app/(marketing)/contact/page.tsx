import type { Metadata } from "next";
import { Building2, LifeBuoy, Mail, MessagesSquare, Phone, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Who to contact about accounts, clinical content and privacy.",
};

export default function ContactPage() {
  const channels = [
    {
      icon: Building2,
      title: "Account problems",
      body: "Locked out, missing from the directory, or changing your posting? Your facility ICT officer can fix it fastest.",
    },
    {
      icon: LifeBuoy,
      title: "GHS ICT helpdesk",
      body: "For platform faults that your facility cannot resolve.",
      detail: SITE.supportEmail
        ? { label: "Email", value: SITE.supportEmail, href: `mailto:${SITE.supportEmail}` }
        : null,
      phone: SITE.supportPhone ? { label: "Phone", value: SITE.supportPhone, href: `tel:${SITE.supportPhone.replace(/\s+/g, "")}` } : null,
      fallback: "Ask your facility ICT officer for the helpdesk contact details.",
    },
    {
      icon: MessagesSquare,
      title: "Clinical content",
      body: "Questions about a protocol belong with the facilitator for that directorate. Sign in and use Messages to reach them.",
    },
    {
      icon: ShieldCheck,
      title: "Privacy requests",
      body: "To see, correct or ask about the personal data we hold, use the contact in the privacy notice.",
    },
  ];

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-16 sm:px-8 sm:pt-24 lg:px-10">
          <Reveal className="max-w-3xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Contact</p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Get the right person, first time.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              Most questions have a quickest route. Pick the one that matches your problem.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-label="Contact routes" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <ul className="grid gap-5 md:grid-cols-2">
          {channels.map((channel, index) => {
            const Icon = channel.icon;
            return (
              <Reveal key={channel.title} delay={index * 0.06}>
                <li className="h-full list-none rounded-card border border-hairline bg-surface p-8 shadow-panel">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="mt-6 text-xl font-bold text-ink">{channel.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{channel.body}</p>

                  {"detail" in channel && (
                    <div className="mt-6 space-y-3">
                      {channel.detail ? (
                        <a href={channel.detail.href} className="flex min-h-11 items-center gap-3 rounded-control border border-hairline bg-canvas px-4 text-sm font-semibold text-ink hover:border-primary/50">
                          <Mail className="h-4 w-4 text-primary" aria-hidden />
                          {channel.detail.value}
                        </a>
                      ) : null}
                      {"phone" in channel && channel.phone ? (
                        <a href={channel.phone.href} className="flex min-h-11 items-center gap-3 rounded-control border border-hairline bg-canvas px-4 text-sm font-semibold text-ink hover:border-primary/50">
                          <Phone className="h-4 w-4 text-primary" aria-hidden />
                          {channel.phone.value}
                        </a>
                      ) : null}
                      {!channel.detail && !("phone" in channel && channel.phone) && (
                        <p className="rounded-control border border-dashed border-hairline px-4 py-3 text-sm text-ink-muted">{channel.fallback}</p>
                      )}
                    </div>
                  )}
                </li>
              </Reveal>
            );
          })}
        </ul>
        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Please do not include patient information in any message, email or support request. Describe the problem, your facility and your
          staff ID instead.
        </p>
      </section>
    </>
  );
}
