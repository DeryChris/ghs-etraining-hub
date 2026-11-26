"use client";

import Link from "next/link";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import { FieldTileIcon, fieldTint } from "@/components/ui/field-tile-icon";

/**
 * One programme field, as a card in the catalogue.
 *
 * The colour comes from the field code, and it is used as a wash rather than a
 * fill: a 6–10% gradient of the same hue behind the name, a hairline of the same
 * hue at 30%, and the glyph in full strength. That is what lets ten differently
 * coloured cards sit together on one page without turning the grid into a
 * paintbox — the page stays white, the fields are told apart by accent.
 */
export function ProgrammeCard({
  field,
}: {
  field: { id: string; code: string; name: string; description?: string | null; areaCount: number; materialCount: number };
}) {
  const tint = fieldTint(field.code);

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-card border p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        borderColor: `${tint.light}38`,
        backgroundImage: `linear-gradient(158deg, ${tint.light}1f 0%, rgba(255,255,255,0) 56%), linear-gradient(0deg, ${tint.light}0a 0%, rgba(255,255,255,0) 40%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <FieldTileIcon code={field.code} size={46} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
        <span
          className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide"
          style={{ backgroundColor: `${tint.light}1c`, color: tint.deep }}
        >
          {field.code}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
        <Link
          href={`/trainings?field=${field.id}#register`}
          className="transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {field.name}
        </Link>
      </h3>

      {field.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{field.description}</p>}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
        <span className="text-xs font-semibold text-ink-muted">
          {field.areaCount} {field.areaCount === 1 ? "programme area" : "programme areas"} · {field.materialCount}{" "}
          {field.materialCount === 1 ? "material" : "materials"}
        </span>
        <Link
          href={`/trainings?field=${field.id}#register`}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Filter register
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link
          href={`/catalogue/${field.code}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          Areas &amp; materials
        </Link>
      </div>
    </div>
  );
}
