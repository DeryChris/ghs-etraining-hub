import { Plus } from "lucide-react";

/** Native disclosure: works without JavaScript and is announced correctly by screen readers. */
export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-left font-semibold text-ink transition-colors hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <Plus className="h-5 w-5 shrink-0 text-primary transition-transform duration-base ease-out-quint group-open:rotate-45" aria-hidden />
          </summary>
          <div className="px-6 pb-6 text-sm leading-relaxed text-ink-muted sm:text-base">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
