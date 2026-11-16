import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl space-y-4", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <span className="h-px w-6 bg-current" aria-hidden />
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description && <p className="text-base leading-relaxed text-ink-muted sm:text-lg">{description}</p>}
    </div>
  );
}
