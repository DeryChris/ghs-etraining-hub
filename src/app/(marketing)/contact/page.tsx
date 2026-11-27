import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  FileText,
  Headset,
  LifeBuoy,
  Mail,
  MessageSquareWarning,
  Phone,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact and Support",
  description: "Who to contact about accounts, technical problems, training resources and reporting an issue.",
};

export default function ContactPage() {
  const channels: {
    icon: typeof Building2;
    title: string;
    body: string;
    detail?: { label: string; value: string; href: string } | null;
    phone?: { label: string; value: string; href: string } | null;
    fallback?: string | null;
    action?: { label: string; href: string };
  }[] = [
    {
      icon: Users,
      title: "General enquiries",
      body: "Questions about what the library is, who it is for and how your facility gets access.",
      fallback: "Your facility or regional administrator is the first point of contact for access to the platform.",
      action: { label: "Read about the Library", href: "/about" },
    },
    {
      icon: Building2,
      title: "Account assistance",
      body: "Locked out, missing from the directory, or changing your posting? Your facility ICT officer can fix it fastest.",
      fallback: SITE.supportEmail
        ? null
        : "Ask your facility ICT officer for the helpdesk contact details.",
      detail: SITE.supportEmail
        ? { label: "Email", value: SITE.supportEmail, href: `mailto:${SITE.supportEmail}` }
        : null,
    },
    {
      icon: LifeBuoy,
      title: "Technical support",
      body: "For platform faults that your facility cannot resolve.",
      detail: SITE.supportEmail
        ? { label: "Email", value: SITE.supportEmail, href: `mailto:${SITE.supportEmail}` }
        : null,
      phone: SITE.supportPhone
        ? { label: "Phone", value: SITE.supportPhone, href: `tel:${SITE.supportPhone.replace(/\s+/g, "")}` }
        : null,
      fallback: "Ask your facility ICT officer for the helpdesk contact details.",
    },
    {
      icon: FileText,
      title: "Resource-related enquiries",
      body: "Questions about a document belong with the facilitator for that Programme Area. Sign in and use Messages to reach them.",
      action: { label: "Sign in to the Library", href: "/login" },
    },
    {
      icon: MessageSquareWarning,
      title: "Reporting an issue",
      body: "Something not working, a document that will not open, or personal details that are wrong? The Complaint Hub records it, names a handler and keeps the answer on file.",
      action: { label: "Open the Complaint Hub", href: "/help/report" },
    },
  ];

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16 lg:px-10">
          <Reveal className="max-w-3xl space-y-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Headset className="h-4 w-4" aria-hidden />
              Contact and Support
            </p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Get the right person, first time.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              Most questions have a quickest route. Pick the section that matches your problem.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-label="Contact routes" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <ul className="grid gap-5 md:grid-cols-2">
          {channels.map((channel, index) => {
            const Icon = channel.icon;
            const hasContact = Boolean(channel.detail || channel.phone);
            return (
              <Reveal key={channel.title} delay={index * 0.06}>
                <li className="flex h-full flex-col rounded-card border border-hairline bg-surface p-8 shadow-panel">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-mint text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="mt-6 text-xl font-bold text-ink">{channel.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{channel.body}</p>

                  <div className="mt-auto space-y-3 pt-6">
                    {channel.detail && (
                      <a
                        href={channel.detail.href}
                        className="flex min-h-11 items-center gap-3 rounded-control border border-hairline bg-canvas px-4 text-sm font-semibold text-ink hover:border-primary/50"
                      >
                        <Mail className="h-4 w-4 text-primary" aria-hidden />
                        {channel.detail.value}
                      </a>
                    )}
                    {channel.phone && (
                      <a
                        href={channel.phone.href}
                        className="flex min-h-11 items-center gap-3 rounded-control border border-hairline bg-canvas px-4 text-sm font-semibold text-ink hover:border-primary/50"
                      >
                        <Phone className="h-4 w-4 text-primary" aria-hidden />
                        {channel.phone.value}
                      </a>
                    )}
                    {!hasContact && channel.fallback && (
                      <p className="rounded-control border border-dashed border-hairline px-4 py-3 text-sm text-ink-muted">
                        {channel.fallback}
                      </p>
                    )}
                    {channel.action && (
                      <Link
                        href={channel.action.href}
                        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-primary/40 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-ink"
                      >
                        {channel.action.label}
                      </Link>
                    )}
                  </div>
                </li>
              </Reveal>
            );
          })}
        </ul>

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ink-muted">
          Please do not include patient information in any message, email or support request. Describe the problem, your
          facility and your staff ID instead. Personal data requests are handled under the{" "}
          <Link href="/privacy" className="font-semibold text-primary underline-offset-4 hover:underline">
            privacy notice
          </Link>
          .
        </p>
      </section>
    </>
  );
}
