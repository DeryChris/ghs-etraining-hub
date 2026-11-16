import { FileText } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

/** Shared layout for policy pages. Every page carries a clear draft notice until legal sign-off. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
          <Reveal className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">{title}</h1>
            <p className="text-lg leading-relaxed text-ink-muted">{intro}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Last updated {updated}</p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-5 pb-28 sm:px-8">
        <aside className="flex gap-4 rounded-card border border-warn/40 bg-warn/8 p-5">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-warn" aria-hidden />
          <p className="text-sm leading-relaxed text-ink">
            <strong className="font-semibold">Working draft.</strong> This text is prepared for review by GHS legal counsel and the data
            protection lead. It is not binding until it has been approved and published.
          </p>
        </aside>

        {sections.map((section, index) => (
          <Reveal key={section.heading} delay={Math.min(index * 0.03, 0.2)}>
            <section aria-labelledby={`section-${index}`} className="space-y-4 border-t border-hairline pt-8">
              <h2 id={`section-${index}`} className="text-xl font-bold text-ink">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-[1.75] text-ink-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          </Reveal>
        ))}
      </div>
    </>
  );
}
