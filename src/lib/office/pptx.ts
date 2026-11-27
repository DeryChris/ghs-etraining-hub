/**
 * A .pptx, read into slides that can be drawn.
 *
 * A slide is a canvas of absolutely positioned shapes: a text box at (x, y) this
 * wide and this tall, a picture over there, a filled band behind the title. That
 * is exactly how PowerPoint stores it — EMU coordinates on every shape — so the
 * file can be drawn rather than quoted. Reading it this way keeps the layout the
 * facilitator designed: the title where they put it, the accent colour they
 * chose, the picture beside the bullet.
 *
 * What is not attempted: animations, SmartArt, gradients, charts and the more
 * exotic effects. Those are reported in `notes` so the viewer can say so, and the
 * original file stays one click away.
 */
import {
  all,
  attr,
  child,
  deep,
  num,
  openOoxml,
  parseXml,
  readRels,
  type OoxmlArchive,
} from "./ooxml";

/** EMU is 1/914400 of an inch; a slide is measured in it. */
export const EMU_PER_PIXEL = 9525;

export interface SlideTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Size in points, before scaling to the rendered slide. */
  size: number;
  color: string | null;
  /** Highlight colour behind the run, when the author used one. */
  highlight: string | null;
  font: string | null;
}

export interface SlideParagraph {
  runs: SlideTextRun[];
  align: "left" | "center" | "right" | "justify";
  level: number;
  bullet: boolean;
  numbered: boolean;
  /** Line spacing as a multiple of the run size. */
  lineSpacing: number | null;
  spaceBefore: number | null;
}

export type SlideShape =
  | {
      type: "text";
      /** Pixels on the 1280-wide reference slide. */
      x: number;
      y: number;
      width: number;
      height: number;
      paragraphs: SlideParagraph[];
      fill: string | null;
      line: string | null;
      /** Where the text sits vertically in its box. */
      anchor: "top" | "middle" | "bottom";
      inset: { top: number; right: number; bottom: number; left: number };
      radius: number;
    }
  | {
      type: "image";
      x: number;
      y: number;
      width: number;
      height: number;
      src: string;
      alt: string;
    }
  | {
      type: "shape";
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string | null;
      line: string | null;
      /** A preset geometry name: rect, ellipse, roundRect, triangle… */
      geometry: string;
      radius: number;
    }
  | {
      type: "table";
      x: number;
      y: number;
      width: number;
      height: number;
      columns: number[];
      rows: { height: number; cells: SlideParagraph[][] }[];
    };

export interface Slide {
  number: number;
  background: string;
  shapes: SlideShape[];
}

export interface Deck {
  width: number;
  height: number;
  slides: Slide[];
  notes: string[];
}

const THEME_COLOURS: Record<string, string> = {
  dk1: "#000000",
  lt1: "#ffffff",
  dk2: "#1f2937",
  lt2: "#e5e7eb",
  accent1: "#1f6f5c",
  accent2: "#c2410c",
  accent3: "#0f766e",
  accent4: "#7c3aed",
  accent5: "#b45309",
  accent6: "#0ea5e9",
  hlink: "#1d4ed8",
  folHlink: "#7c3aed",
};

/** `FF1F6F5C` or `1F6F5C` → `#1f6f5c`. */
function hexOf(value: string | null): string | null {
  if (!value) return null;
  if (/^[0-9a-fA-F]{6}$/.test(value)) return `#${value.toLowerCase()}`;
  if (/^[0-9a-fA-F]{8}$/.test(value)) return `#${value.slice(2).toLowerCase()}`;
  return null;
}

/** A colour element, which may name a theme slot instead of a literal value. */
function colourFrom(node: Element | null, theme: Record<string, string>): string | null {
  if (!node) return null;
  const literal =
    hexOf(attr(child(node, "srgbClr"), "val")) ??
    hexOf(attr(child(node, "sysClr"), "lastClr")) ??
    hexOf(attr(child(node, "scrgbClr"), "val"));
  if (literal) return literal;
  const scheme = attr(child(node, "schemeClr"), "val");
  if (scheme) return theme[scheme] ?? THEME_COLOURS[scheme] ?? null;
  const preset = attr(child(node, "prstClr"), "val");
  if (preset) return preset.startsWith("#") ? preset : null;
  return null;
}

function fillOf(properties: Element | null, theme: Record<string, string>): string | null {
  if (!properties) return null;
  const solid = child(properties, "solidFill");
  if (solid) return colourFrom(solid, theme);
  const gradient = child(properties, "gradFill");
  if (gradient) {
    // A gradient is flattened to its first stop: the band still reads as the
    // author's colour, and the exact ramp stays in the original file.
    const stops = all(gradient, "gs");
    return stops.length > 0 ? colourFrom(stops[0], theme) : null;
  }
  return null;
}

function lineOf(properties: Element | null, theme: Record<string, string>): string | null {
  const line = child(properties, "ln");
  if (!line || attr(line, "w") === "0") return null;
  return colourFrom(child(line, "solidFill"), theme);
}

function radiusFor(geometry: string): number {
  if (geometry === "ellipse") return 9999;
  if (geometry === "roundRect") return 24;
  return 0;
}

/* ── Text ──────────────────────────────────────────────────────────────────── */

function readParagraphs(
  body: Element | null,
  theme: Record<string, string>,
  fallbackSize: number,
): SlideParagraph[] {
  if (!body) return [];
  const paragraphs: SlideParagraph[] = [];

  for (const paragraph of all(body, "p")) {
    const properties = child(paragraph, "pPr");
    const alignRaw = attr(properties, "algn");
    const runs: SlideTextRun[] = [];

    for (const run of all(paragraph, "r")) {
      const runProperties = child(run, "rPr");
      const text = all(run, "t")
        .map((node) => node.textContent ?? "")
        .join("");
      if (!text) continue;
      const size = num(runProperties, "sz");
      runs.push({
        text,
        bold: attr(runProperties, "b") === "1",
        italic: attr(runProperties, "i") === "1",
        underline: attr(runProperties, "u") !== null && attr(runProperties, "u") !== "none",
        size: size === null ? fallbackSize : size / 100,
        color: colourFrom(child(runProperties, "solidFill"), theme),
        highlight: fillOf(runProperties, theme),
        font: attr(child(runProperties, "latin"), "typeface"),
      });
    }

    // A paragraph may also be a break or a field; the plain text is still worth
    // showing, so anything that only has a `t` node is read too.
    if (runs.length === 0) {
      const plain = all(paragraph, "fld > t, br")
        .map((node) => node.textContent ?? "")
        .join("");
      if (plain) {
        runs.push({
          text: plain,
          bold: false,
          italic: false,
          underline: false,
          size: fallbackSize,
          color: null,
          highlight: null,
          font: null,
        });
      }
    }

    if (runs.length === 0 && !child(paragraph, "endParaRPr")) continue;

    const lineSpacingRaw = num(child(properties ?? paragraph, "lnSpc") ?? null);
    const spacingPercent = properties ? deep(properties, "lnSpc", "spcPct") : null;
    paragraphs.push({
      runs,
      align:
        alignRaw === "ctr" ? "center" : alignRaw === "r" ? "right" : alignRaw === "just" ? "justify" : "left",
      level: num(properties, "lvl") ?? 0,
      bullet: Boolean(properties && (child(properties, "buChar") ?? child(properties, "buAutoNum"))),
      numbered: Boolean(properties && child(properties, "buAutoNum")),
      lineSpacing:
        spacingPercent !== null
          ? (num(spacingPercent) ?? 100000) / 100000
          : lineSpacingRaw !== null
            ? null
            : null,
      spaceBefore: num(properties, "spcBef") === null ? null : (num(properties, "spcBef") ?? 0) / 100,
    });
  }

  return paragraphs;
}

/* ── Shapes ────────────────────────────────────────────────────────────────── */

/** Whether any parent is one of these local names, whatever namespace it is in. */
function hasAncestor(element: Element, names: Set<string>): boolean {
  let parent = element.parentElement;
  while (parent) {
    if (names.has(parent.localName)) return true;
    parent = parent.parentElement;
  }
  return false;
}

interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
}

function transformOf(element: Element | null): Transform | null {
  const xfrm = element ? child(element, "xfrm") : null;
  if (!xfrm) return null;
  const offset = child(xfrm, "off");
  const extent = child(xfrm, "ext");
  if (!offset || !extent) return null;
  return {
    x: (num(offset, "x") ?? 0) / EMU_PER_PIXEL,
    y: (num(offset, "y") ?? 0) / EMU_PER_PIXEL,
    width: (num(extent, "cx") ?? 0) / EMU_PER_PIXEL,
    height: (num(extent, "cy") ?? 0) / EMU_PER_PIXEL,
  };
}

async function readPicture(
  element: Element,
  rels: Record<string, { target: string }>,
  archive: OoxmlArchive,
): Promise<SlideShape | null> {
  const transform = transformOf(deep(element, "spPr"));
  if (!transform) return null;
  const embedId = attr(deep(element, "blipFill", "blip"), "embed");
  const relationship = embedId ? rels[embedId] : undefined;
  if (!relationship) return null;
  const src = await archive.dataUrl(relationship.target);
  if (!src) return null;
  const name = attr(deep(element, "nvPicPr", "cNvPr"), "name");
  return {
    type: "image",
    ...transform,
    src,
    alt: name ?? "Picture on the slide",
  };
}

function readTable(element: Element, theme: Record<string, string>): SlideShape | null {
  const transform = transformOf(deep(element, "xfrm"));
  if (!transform) return null;
  const table = deep(element, "graphic", "graphicData", "tbl");
  if (!table) return null;

  const grid = all(table, "tblGrid > gridCol").map((column) => (num(column, "w") ?? 0) / EMU_PER_PIXEL);
  const rows = all(table, "tr").map((row) => ({
    height: (num(row, "h") ?? 0) / EMU_PER_PIXEL,
    cells: all(row, "tc").map((cell) => readParagraphs(child(cell, "txBody"), theme, 12)),
  }));

  return { type: "table", ...transform, columns: grid, rows };
}

function readShapeLoose(
  element: Element,
  theme: Record<string, string>,
  shapeType: "sp" | "cxnSp" = "sp",
): SlideShape | null {
  const properties = child(element, "spPr");
  const transform = transformOf(properties);
  if (!transform) return null;

  const body = child(element, "txBody");
  const fill = fillOf(properties, theme);
  const line = lineOf(properties, theme);
  const geometry = attr(deep(properties, "prstGeom"), "prst") ?? "rect";
  const bodyProperties = child(body, "bodyPr");

  if (typeof body?.textContent === "string" && /\S/.test(body.textContent)) {
    const inset = {
      top: (num(child(bodyProperties ?? element, "tIns") ?? null) ?? 45720) / EMU_PER_PIXEL,
      right: (num(child(bodyProperties ?? element, "rIns") ?? null) ?? 91440) / EMU_PER_PIXEL,
      bottom: (num(child(bodyProperties ?? element, "bIns") ?? null) ?? 45720) / EMU_PER_PIXEL,
      left: (num(child(bodyProperties ?? element, "lIns") ?? null) ?? 91440) / EMU_PER_PIXEL,
    };
    const anchorRaw = attr(bodyProperties, "anchor");
    return {
      type: "text",
      ...transform,
      paragraphs: readParagraphs(body, theme, 18),
      fill,
      line,
      anchor: anchorRaw === "ctr" ? "middle" : anchorRaw === "b" ? "bottom" : "top",
      inset,
      radius: radiusFor(geometry),
    };
  }

  if (shapeType === "cxnSp") return { type: "shape", ...transform, fill, line, geometry: "line", radius: 0 };

  // An empty shape is still a graphic — a colour band, an accent bar, a circle.
  if (!fill && !line) return null;
  return { type: "shape", ...transform, fill, line, geometry, radius: radiusFor(geometry) };
}

async function readSlideShapes(
  root: ParentNode,
  rels: Record<string, { target: string }>,
  archive: OoxmlArchive,
  theme: Record<string, string>,
): Promise<SlideShape[]> {
  const shapes: SlideShape[] = [];

  for (const element of all(root, "sp, cxnSp, pic, graphicFrame")) {
    // A shape inside a table's cell would otherwise be drawn twice: once by the
    // table and once as its own shape.
    if (hasAncestor(element, new Set(["tc", "tbl"]))) continue;

    if (element.localName === "pic") {
      const picture = await readPicture(element, rels, archive);
      if (picture) shapes.push(picture);
      continue;
    }

    if (element.localName === "graphicFrame") {
      const table = readTable(element, theme);
      if (table) shapes.push(table);
      continue;
    }

    const shape = readShapeLoose(element, theme, element.localName === "cxnSp" ? "cxnSp" : "sp");
    if (shape) shapes.push(shape);
  }

  return shapes;
}

/* ── Theme ─────────────────────────────────────────────────────────────────── */

async function readTheme(archive: OoxmlArchive): Promise<Record<string, string>> {
  const path = archive.paths().find((entry) => /^ppt\/theme\/theme\d+\.xml$/.test(entry)) ?? "ppt/theme/theme1.xml";
  const xml = await archive.text(path);
  if (!xml) return { ...THEME_COLOURS };

  const document = parseXml(xml);
  const scheme = document.querySelector("clrScheme");
  const theme: Record<string, string> = { ...THEME_COLOURS };
  if (!scheme) return theme;

  for (const slot of Array.from(scheme.children)) {
    const colour =
      hexOf(attr(child(slot, "srgbClr"), "val")) ?? hexOf(attr(child(slot, "sysClr"), "lastClr"));
    if (colour) theme[slot.localName] = colour;
  }
  return theme;
}

/* ── The deck ──────────────────────────────────────────────────────────────── */

export async function readDeck(data: ArrayBuffer | Uint8Array): Promise<Deck> {
  const archive = await openOoxml(data);
  const presentationXml = await archive.text("ppt/presentation.xml");
  if (!presentationXml) throw new Error("This does not look like a PowerPoint file (no presentation.xml).");

  const presentation = parseXml(presentationXml);
  const size = presentation.querySelector("sldSz");
  const width = (num(size, "cx") ?? 12192000) / EMU_PER_PIXEL;
  const height = (num(size, "cy") ?? 6858000) / EMU_PER_PIXEL;

  const rels = await readRels(archive, "ppt/presentation.xml");
  const theme = await readTheme(archive);
  const notes: string[] = [];

  const slides: Slide[] = [];
  const ids = all(presentation, "sldId");

  for (const [position, entry] of ids.entries()) {
    const relationshipId = attr(entry, "id");
    const relationship = relationshipId ? rels[relationshipId] : undefined;
    const path = relationship?.target ?? `ppt/slides/slide${position + 1}.xml`;
    const xml = await archive.text(path);
    if (!xml) continue;

    const document = parseXml(xml);
    const background =
      colourFrom(deep(document.documentElement, "cSld", "bg", "bgPr", "solidFill"), theme) ??
      colourFrom(deep(document.documentElement, "cSld", "bg", "bgRef"), theme) ??
      "#ffffff";

    const slideRels = await readRels(archive, path);
    const shapes = await readSlideShapes(document, slideRels, archive, theme);

    if (all(document, "graphicFrame").some((frame) => deep(frame, "graphic", "graphicData", "chart"))) {
      notes.push("Charts are not drawn; the original file has them.");
    }

    slides.push({ number: position + 1, background, shapes });
  }

  if (slides.length === 0) throw new Error("This deck has no slides that can be shown.");
  return { width, height, slides, notes: Array.from(new Set(notes)) };
}
