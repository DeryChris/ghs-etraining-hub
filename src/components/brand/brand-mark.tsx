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

export function Wordmark({ size = 36, className, tagline = true }: { size?: number; className?: string; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
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
