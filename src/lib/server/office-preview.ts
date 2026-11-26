import "server-only";

import { inflateRawSync } from "node:zlib";

/**
 * Reading a Word, PowerPoint or Excel file inside the library.
 *
 * A facilitator uploads the deck they presented; a learner opens the material on
 * a phone and should not have to download a 20 MB .pptx, find an app, and come
 * back. Browsers cannot render OOXML, and no converter exists on the host — so
 * this module reads the document directly: an .docx/.pptx/.xlsx is a ZIP of XML,
 * Node can inflate a ZIP, and the text and tables a learner needs are in the XML.
 *
 * What it produces is a *reading view*, not a facsimile: headings, paragraphs,
 * bullets, slide text and spreadsheet cells, in order. Layout, images and fonts
 * belong to the original file, which stays one click away as a download. That is
 * a deliberate trade — the alternative was a viewer that only works for PDF.
 *
 * No dependency: the ZIP reader below is 80 lines over `node:zlib`, because
 * adding a general archive library to a server bundle for three file extensions
 * is more surface than it is worth. It handles only what OOXML actually uses:
 * stored and deflated entries.
 */

export interface PreviewBlock {
  kind: "heading" | "paragraph" | "bullet";
  text: string;
}

export interface SlidePreview {
  number: number;
  lines: string[];
}

export interface SheetPreview {
  name: string;
  rows: string[][];
  truncated: boolean;
}

export interface OfficePreview {
  kind: "docx" | "pptx" | "xlsx";
  blocks?: PreviewBlock[];
  slides?: SlidePreview[];
  sheets?: SheetPreview[];
  /** Anything the reader could not show, said plainly instead of hidden. */
  notes: string[];
}

export class OfficePreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfficePreviewError";
  }
}

/* ── A minimal ZIP reader ──────────────────────────────────────────────────── */

interface ZipEntry {
  name: string;
  /** Uncompressed bytes, read lazily so a 20 MB deck does not inflate whole. */
  bytes: () => Buffer;
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

function readZip(buffer: Buffer): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>();

  // The end-of-central-directory record sits at the end, before an optional
  // comment of up to 64 KB. Scan back for its signature.
  let eocd = -1;
  const lowest = Math.max(0, buffer.length - 66_000);
  for (let offset = buffer.length - 22; offset >= lowest; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new OfficePreviewError("The file is not a readable archive.");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  if (cursor === 0xffffffff) throw new OfficePreviewError("The file uses ZIP64, which this reader does not open.");

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) break;
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);

    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === LOCAL_SIGNATURE) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      entries.set(name, {
        name,
        bytes: () => {
          const slice = buffer.subarray(dataStart, Math.min(dataEnd, buffer.length));
          if (method === 0) return slice;
          if (method === 8) return inflateRawSync(slice);
          throw new OfficePreviewError(`The file uses an unsupported compression method (${method}).`);
        },
      });
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function required(entries: Map<string, ZipEntry>, name: string): Buffer {
  const entry = entries.get(name);
  if (!entry) throw new OfficePreviewError(`The file is missing ${name}.`);
  return entry.bytes();
}

function xml(entries: Map<string, ZipEntry>, name: string): string {
  return required(entries, name).toString("utf8");
}

/* ── Text helpers ──────────────────────────────────────────────────────────── */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    if (code.startsWith("#")) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code] ?? match;
  });
}

function textOf(xmlFragment: string, tag: string): string {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  let out = "";
  for (const match of xmlFragment.matchAll(pattern)) out += decodeEntities(match[1] ?? "");
  return out.replace(/\s+/g, " ").trim();
}

/* ── Word ──────────────────────────────────────────────────────────────────── */

const HEADING_STYLE = /<w:pStyle\s+w:val="[^"]*(?:Heading|heading|Title)[^"]*"/;
/**
 * A bullet can be marked two ways: list numbering (`numPr`) from a Word list, or
 * a paragraph style whose name says so ("List Bullet") — which is what the
 * Office generators themselves write.
 */
const BULLET = /<w:numPr[\s>]|<w:pStyle\s+w:val="[^"]*(?:Bullet|List)[^"]*"/;

function previewDocx(entries: Map<string, ZipEntry>): OfficePreview {
  const body = xml(entries, "word/document.xml");
  const paragraphs = body.split(/<w:p[\s>]/).slice(1);
  const blocks: PreviewBlock[] = [];

  for (const paragraph of paragraphs) {
    const text = textOf(paragraph, "w:t");
    if (!text) continue;
    if (HEADING_STYLE.test(paragraph)) blocks.push({ kind: "heading", text });
    else if (BULLET.test(paragraph)) blocks.push({ kind: "bullet", text });
    else blocks.push({ kind: "paragraph", text });
  }

  return {
    kind: "docx",
    blocks,
    notes: blocks.length === 0 ? ["This document has no readable text — it may be made of images. Download it to read."] : [],
  };
}

/* ── PowerPoint ────────────────────────────────────────────────────────────── */

function previewPptx(entries: Map<string, ZipEntry>): OfficePreview {
  const slideNames = [...entries.keys()]
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)?.[1] ?? 0) - Number(b.match(/(\d+)\.xml$/)?.[1] ?? 0));

  if (slideNames.length === 0) throw new OfficePreviewError("The presentation has no slides.");

  const slides: SlidePreview[] = slideNames.map((name, index) => {
    const content = xml(entries, name);
    const lines: string[] = [];
    // One <a:p> is one line of the slide; runs inside it are one sentence.
    for (const paragraph of content.split(/<a:p[\s>]/).slice(1)) {
      const line = textOf(paragraph, "a:t");
      if (line) lines.push(line);
    }
    return { number: index + 1, lines };
  });

  return {
    kind: "pptx",
    slides,
    notes: ["Slide text only. The deck's layout, images and animations are in the downloaded file."],
  };
}

/* ── Excel ─────────────────────────────────────────────────────────────────── */

function columnIndex(reference: string): number {
  const letters = reference.replace(/[^A-Z]/g, "");
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return Math.max(0, index - 1);
}

function previewXlsx(entries: Map<string, ZipEntry>): OfficePreview {
  const shared: string[] = [];
  if (entries.has("xl/sharedStrings.xml")) {
    const strings = xml(entries, "xl/sharedStrings.xml");
    for (const match of strings.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(textOf(match[1] ?? "", "t"));
    }
  }

  const workbook = xml(entries, "xl/workbook.xml");
  const sheetNames = [...workbook.matchAll(/<sheet\s[^>]*name="([^"]*)"/g)].map((match) =>
    decodeEntities(match[1] ?? "Sheet"),
  );

  const sheetFiles = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/(\d+)\.xml$/)?.[1] ?? 0) - Number(b.match(/(\d+)\.xml$/)?.[1] ?? 0));

  const ROW_CAP = 300;
  const COL_CAP = 24;
  const sheets: SheetPreview[] = sheetFiles.slice(0, 8).map((file, sheetIndex) => {
    const content = xml(entries, file);
    const rows: string[][] = [];
    let truncated = false;

    for (const rowMatch of content.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      if (rows.length >= ROW_CAP) {
        truncated = true;
        break;
      }
      const cells: string[] = [];
      for (const cell of (rowMatch[1] ?? "").matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attributes = cell[1] ?? "";
        const body = cell[2] ?? "";
        const reference = attributes.match(/r="([A-Z]+\d+)"/)?.[1] ?? "";
        const type = attributes.match(/t="([^"]+)"/)?.[1] ?? "n";
        let value = "";
        if (type === "s") {
          const index = Number(body.match(/<v>(\d+)<\/v>/)?.[1] ?? "-1");
          value = shared[index] ?? "";
        } else if (type === "inlineStr") {
          value = textOf(body, "t");
        } else if (type === "str") {
          value = textOf(body, "v");
        } else {
          value = decodeEntities(body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
        }
        const column = reference ? columnIndex(reference) : cells.length;
        if (column >= COL_CAP) {
          truncated = true;
          continue;
        }
        while (cells.length < column) cells.push("");
        cells[column] = value.replace(/\s+/g, " ").trim();
      }
      if (cells.some((value) => value !== "")) rows.push(cells);
    }

    return { name: sheetNames[sheetIndex] ?? `Sheet ${sheetIndex + 1}`, rows, truncated };
  });

  return {
    kind: "xlsx",
    sheets,
    notes:
      sheets.some((sheet) => sheet.truncated)
        ? [`Showing the first ${ROW_CAP} rows and ${COL_CAP} columns of each sheet. Download the workbook for all of it.`]
        : ["Cell values only. Formulas, charts and formatting are in the downloaded file."],
  };
}

/* ── Entry point ───────────────────────────────────────────────────────────── */

/** Which of the three readers to use, from the stored MIME type. */
export function officeKindFor(mimeType: string | null | undefined): OfficePreview["kind"] | null {
  const normalised = mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalised === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (normalised === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "pptx";
  if (normalised === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  return null;
}

export function readOfficePreview(buffer: Buffer, mimeType: string): OfficePreview {
  const kind = officeKindFor(mimeType);
  if (!kind) throw new OfficePreviewError("That file type cannot be read in the library.");

  const entries = readZip(buffer);
  if (kind === "docx") return previewDocx(entries);
  if (kind === "pptx") return previewPptx(entries);
  return previewXlsx(entries);
}
