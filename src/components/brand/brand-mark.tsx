import Image from "next/image";
import { cn } from "@/lib/utils";

/** The GHS-ELN mark: flag bands, white disc and the Ghana star (public/brand). */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/ghs-eln-mark.svg"
      alt=""
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 select-none", className)}
    />
  );
}

export function Wordmark({ size = 36, className, tagline = true }: { size?: number; className?: string; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-extrabold tracking-tight text-ink">GHS-ELN</span>
        {tagline && (
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-muted">eLearning Network</span>
        )}
      </span>
    </span>
  );
}
