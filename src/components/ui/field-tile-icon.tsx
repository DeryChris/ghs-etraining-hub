"use client";

import { Activity, Baby, Brain, Droplets, HeartPulse, Microscope, Pill, ShieldPlus, Stethoscope, Syringe } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * A "3D" tile for one programme field.
 *
 * Drawn with layered gradients rather than shipped as 10 raster images: an
 * illustration set would be 10 files, ~2 MB, and wrong the moment somebody adds
 * an eleventh field. This costs no request, keeps its quality at any size, and
 * still reads as a physical object — a lit top edge, a soft inner shadow, and a
 * coloured shadow beneath it so it sits on the card instead of floating over it.
 *
 * The glyph and the colour are chosen from the field's code, so a field keeps
 * the same identity on every screen without anybody maintaining a mapping.
 */

type Skin = { from: string; to: string; shadow: string; glyph: LucideIcon };

const SKINS: Skin[] = [
  { from: "#2bb673", to: "#0f7a4f", shadow: "rgba(15,122,79,0.35)", glyph: Stethoscope },
  { from: "#4aa8ff", to: "#1c62c9", shadow: "rgba(28,98,201,0.35)", glyph: Activity },
  { from: "#ff9d42", to: "#d1601a", shadow: "rgba(209,96,26,0.35)", glyph: HeartPulse },
  { from: "#a78bfa", to: "#6d43d1", shadow: "rgba(109,67,209,0.35)", glyph: Brain },
  { from: "#34d399", to: "#0d9488", shadow: "rgba(13,148,136,0.35)", glyph: Microscope },
  { from: "#f472b6", to: "#be185d", shadow: "rgba(190,24,93,0.35)", glyph: Baby },
  { from: "#38bdf8", to: "#0369a1", shadow: "rgba(3,105,161,0.35)", glyph: Droplets },
  { from: "#fbbf24", to: "#b45309", shadow: "rgba(180,83,9,0.35)", glyph: ShieldPlus },
  { from: "#818cf8", to: "#4338ca", shadow: "rgba(67,56,202,0.35)", glyph: Syringe },
  { from: "#2dd4bf", to: "#0f766e", shadow: "rgba(15,118,110,0.35)", glyph: Pill },
];

/** Stable per field: same code, same skin, on every render and every screen. */
function skinFor(code: string): Skin {
  let hash = 0;
  for (let index = 0; index < code.length; index += 1) hash = (hash * 31 + code.charCodeAt(index)) % 9973;
  return SKINS[hash % SKINS.length];
}

export function FieldTileIcon({
  code,
  size = 56,
  className = "",
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const skin = skinFor(code);
  const Glyph = skin.glyph;
  const id = `tile-${code.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center rounded-[22%] ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(150deg, ${skin.from} 0%, ${skin.to} 100%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -8px 14px rgba(0,0,0,0.18), 0 10px 18px -8px ${skin.shadow}, 0 2px 0 rgba(255,255,255,0.25)`,
      }}
    >
      {/* Gloss across the top half: the single detail that reads as "solid". */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-[7%] h-[42%] rounded-[18%]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0))" }}
      />
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id={`${id}-glyph`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.82" />
          </linearGradient>
        </defs>
      </svg>
      <Glyph
        size={Math.round(size * 0.46)}
        strokeWidth={2.1}
        color="#ffffff"
        className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]"
      />
    </span>
  );
}
