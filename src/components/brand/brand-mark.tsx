import Image from "next/image";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The Ghana Health Service emblem, in the two tone variants the crest needs: the
 * dark-text artwork on light surfaces, the white-text artwork on the dark theme.
 * The source artwork is raster (973×1091), so both files are pre-rendered at the
 * largest size used on screen and the theme switch happens in CSS — see
 * `.brand-emblem` in globals.css. Rendering both keeps the layout stable: they
 * share one aspect ratio and one absolutely-positioned box.
 *
 * The emblem is never stretched, never recoloured and never redrawn.
 */
const EMBLEM_ASPECT = 320 / 359;

export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("brand-emblem relative inline-block shrink-0 select-none", className)}
      style={{ height: size, width: Math.round(size * EMBLEM_ASPECT) }}
    >
      <Image
        src="/brand/ghs-emblem-light.png"
        alt=""
        fill
        sizes={`${size}px`}
        unoptimized
        className="brand-emblem-light object-contain"
      />
      <Image
        src="/brand/ghs-emblem-dark.png"
        alt=""
        fill
        sizes={`${size}px`}
        unoptimized
        className="brand-emblem-dark object-contain"
      />
    </span>
  );
}

/** Compact wordmark: emblem, system identifier, short interface name. */
export function Wordmark({ size = 36, className, tagline = true }: { size?: number; className?: string; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-extrabold tracking-tight text-ink">{SITE.code}</span>
        {tagline && (
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-muted">{SITE.tagline}</span>
        )}
      </span>
    </span>
  );
}

/**
 * The full institutional lockup: emblem beside the three-line brand block the
 * identity spec calls for —
 *
 *   GHANA HEALTH SERVICE
 *   UPPER WEST REGIONAL HEALTH DIRECTORATE
 *   TRAINING LIBRARY
 *
 * `compact` collapses it to two lines for narrow chrome (mobile header, sidebar)
 * where the full authority line would not fit without shrinking below legibility.
 */
export function BrandLockup({
  size = 40,
  compact = false,
  className,
  tone = "default",
}: {
  size?: number;
  compact?: boolean;
  className?: string;
  /** `nav` renders on the fixed green sidebar, where ink comes from nav tokens. */
  tone?: "default" | "nav";
}) {
  const primary = tone === "nav" ? "text-[var(--nav-ink)]" : "text-ink";
  const muted = tone === "nav" ? "text-[var(--nav-muted)]" : "text-ink-muted";

  if (compact) {
    return (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <BrandMark size={size} />
        <span className="flex min-w-0 flex-col leading-none">
          <span className={cn("truncate text-[13px] font-extrabold tracking-tight", primary)}>{SITE.code}</span>
          <span className={cn("mt-1 text-[9px] font-semibold uppercase tracking-[0.2em]", muted)}>{SITE.tagline}</span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark size={size} />
      <span className="flex min-w-0 flex-col gap-[3px] leading-none">
        <span className={cn("text-[8.5px] font-bold uppercase tracking-[0.16em]", muted)}>{SITE.institution}</span>
        <span className={cn("text-[8.5px] font-bold uppercase tracking-[0.13em]", muted)}>{SITE.authority}</span>
        <span className={cn("text-[13.5px] font-extrabold uppercase tracking-[0.08em]", primary)}>{SITE.tagline}</span>
      </span>
    </span>
  );
}
