"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, FolderOpen } from "lucide-react";
import { AreaTileIcon, FieldTileIcon, fieldTint } from "@/components/ui/field-tile-icon";

/**
 * One tile family for programmes and the areas inside them.
 *
 * The programme field cards in the training register set the house style: a
 * coloured glyph sitting on the card (no badge behind it), a wash of the same hue
 * at low strength, a hairline of that hue, and a lift on hover. The signed-out
 * landing page, /programmes and the catalogue were drawing the same objects as
 * plain bordered boxes, so the same page could show a field three ways. These two
 * components are now the only way a field or an area is drawn as a card.
 *
 * Colour comes from the code, never from position, so a field keeps its hue on
 * every screen and an area keeps the hue of its own code inside any field.
 */

interface TileChromeProps {
  code: string;
  name: string;
  description?: string | null;
  href: string;
  icon: React.ReactNode;
  /** The line under the title: counts, progress, a prompt to open it. */
  meta: React.ReactNode;
  /** Extra links under the meta line, used by the register's field cards. */
  actions?: React.ReactNode;
  className?: string;
}

function Tile({ code, name, description, href, icon, meta, actions, className = "" }: TileChromeProps) {
  const tint = fieldTint(code);

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-card border p-5 shadow-panel transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${className}`}
      style={{
        borderColor: `${tint.light}38`,
        backgroundImage: `linear-gradient(158deg, ${tint.light}1f 0%, rgba(255,255,255,0) 56%), linear-gradient(0deg, ${tint.light}0a 0%, rgba(255,255,255,0) 40%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="transition-transform duration-200 group-hover:-translate-y-0.5">{icon}</span>
        <span
          className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold tracking-wide"
          style={{ backgroundColor: `${tint.light}1c`, color: tint.deep }}
        >
          {code}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
        <Link
          href={href}
          className="transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {name}
        </Link>
      </h3>

      {description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{description}</p>}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
        <span className="text-xs font-semibold text-ink-muted">{meta}</span>
        {actions ?? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Open
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

export function ProgrammeFieldTile({
  field,
  href,
}: {
  field: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    areaCount: number;
    materialCount: number;
    trainingCount?: number;
  };
  /** Where the tile goes: the catalogue (signed in) or the public list. */
  href: string;
}) {
  return (
    <Tile
      code={field.code}
      name={field.name}
      description={field.description}
      href={href}
      icon={<FieldTileIcon code={field.code} size={46} />}
      meta={
        <>
          {field.areaCount} {field.areaCount === 1 ? "programme area" : "programme areas"} ·{" "}
          {field.materialCount} {field.materialCount === 1 ? "material" : "materials"}
          {typeof field.trainingCount === "number" ? (
            <> · {field.trainingCount} {field.trainingCount === 1 ? "training" : "trainings"}</>
          ) : null}
        </>
      }
      actions={
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary underline-offset-4 hover:underline"
        >
          {href.startsWith("/trainings") ? "Filter register" : href.startsWith("/programmes") ? "Open programmes" : "Open field"}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }
    />
  );
}

export function ProgrammeAreaTile({
  area,
  href,
  meta,
}: {
  area: { id: string; code: string; name: string; description?: string | null };
  href: string;
  /** Whatever the page knows about this area: how many trainings and materials. */
  meta: React.ReactNode;
}) {
  return (
    <Tile
      code={area.code}
      name={area.name}
      description={area.description}
      href={href}
      icon={<AreaTileIcon code={area.code} name={area.name} size={44} />}
      meta={meta}
      actions={
        <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
          <FolderOpen className="h-3.5 w-3.5" aria-hidden />
          Open materials
        </Link>
      }
    />
  );
}
