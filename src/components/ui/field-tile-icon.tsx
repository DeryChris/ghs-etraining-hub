"use client";

import {
  Activity,
  Baby,
  Brain,
  Droplets,
  HeartPulse,
  Microscope,
  Pill,
  ShieldPlus,
  Stethoscope,
  Syringe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Programme-field identity.
 *
 * The glyph carries the colour; there is no tile behind it. A rounded square
 * under every icon turns a page of ten into a grid of coloured boxes, which is
 * louder than the words around them and reads as decoration. Drawn the way the
 * reference icon is — one vivid object with a lit edge and a soft shadow — the
 * icon belongs on a white card instead of sitting in a badge on top of it.
 *
 * The gradient stroke is what makes it look solid: light at the top-left, deep at
 * the bottom-right, with a coloured glow beneath that sells the depth.
 */

type Skin = { light: string; deep: string; glow: string; glyph: LucideIcon };

const SKINS: Skin[] = [
  { light: "#34c98a", deep: "#0b7a4f", glow: "rgba(11,122,79,0.28)", glyph: Stethoscope },
  { light: "#63b3ff", deep: "#1b5fc4", glow: "rgba(27,95,196,0.28)", glyph: Activity },
  { light: "#ffa94d", deep: "#cf5a12", glow: "rgba(207,90,18,0.28)", glyph: HeartPulse },
  { light: "#b39bfb", deep: "#6437c9", glow: "rgba(100,55,201,0.28)", glyph: Brain },
  { light: "#4fd9c0", deep: "#0b8d84", glow: "rgba(11,141,132,0.28)", glyph: Microscope },
  { light: "#f78fb9", deep: "#b41c58", glow: "rgba(180,28,88,0.26)", glyph: Baby },
  { light: "#5cc7ff", deep: "#03679c", glow: "rgba(3,103,156,0.28)", glyph: Droplets },
  { light: "#fbc94a", deep: "#a85f06", glow: "rgba(168,95,6,0.28)", glyph: ShieldPlus },
  { light: "#9aa6ff", deep: "#3b30bd", glow: "rgba(59,48,189,0.28)", glyph: Syringe },
  { light: "#48d3b6", deep: "#0c6d66", glow: "rgba(12,109,102,0.28)", glyph: Pill },
];

/** Stable per field: the same code gets the same colour on every screen. */
function skinFor(code: string): Skin {
  let hash = 0;
  for (let index = 0; index < code.length; index += 1) hash = (hash * 31 + code.charCodeAt(index)) % 9973;
  return SKINS[hash % SKINS.length];
}

/** The wash a card uses so the tile and the page agree on one hue. */
export function fieldTint(code: string): { light: string; deep: string; glow: string } {
  const skin = skinFor(code);
  return { light: skin.light, deep: skin.deep, glow: skin.glow };
}

export function FieldTileIcon({
  code,
  size = 52,
  className = "",
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const skin = skinFor(code);
  const Glyph = skin.glyph;
  const id = `field-${code.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* The gradient lives in the document, so the icon's own <svg> can stroke
          with it — one paint, no extra element behind the glyph. */}
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <linearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor={skin.light} />
            <stop offset="100%" stopColor={skin.deep} />
          </linearGradient>
        </defs>
      </svg>

      {/* A blurred, offset copy underneath: the shadow that makes it an object. */}
      <Glyph
        size={Math.round(size * 0.94)}
        strokeWidth={2.4}
        color={skin.deep}
        className="absolute translate-y-[6%] opacity-25 blur-[3px]"
        aria-hidden
      />
      <Glyph
        size={Math.round(size * 0.94)}
        strokeWidth={2.2}
        color={`url(#${id})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]"
        aria-hidden
      />
    </span>
  );
}
