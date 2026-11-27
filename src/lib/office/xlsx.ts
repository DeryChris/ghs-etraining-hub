/**
 * An .xlsx, read into something that can be drawn as a spreadsheet.
 *
 * Excel files are not tables of text: a header is bold on a fill, a column is
 * four times wider than the one beside it, two cells are merged across, a total
 * is a currency, a date is a number wearing a format. All of that is in the
 * package — `styles.xml` holds the fonts, fills and number formats, and each
 * cell only carries an index into them. This module reads those indexes and hands
 * the renderer a value and the look that belongs to it.
 */
import { all, attr, child, num, openOoxml, parseXml, readRels } from "./ooxml";

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Text colour, `#rrggbb`. */
  color?: string;
  /** Cell fill, `#rrggbb`. Null for the sheet's own background. */
  fill?: string;
  size?: number;
  align?: "left" | "center" | "right";
  wrap?: boolean;
}

export interface SheetCell {
  /** What the cell should read, already formatted. */
  text: string;
  style: CellStyle;
  /** Right-aligned numbers read like a spreadsheet, so the renderer knows. */
  numeric: boolean;
}

export interface SheetRow {
  /** 1-based, as Excel numbers them. */
  index: number;
  /** Height in CSS pixels, when the sheet sets one. */
  height: number | null;
  cells: Map<number, SheetCell>;
}

export interface SheetColumn {
  min: number;
  max: number;
  /** Width in CSS pixels. */
  width: number;
}

export interface Sheet {
  name: string;
  columns: SheetColumn[];
  rows: SheetRow[];
  merges: string[];
  maxRow: number;
  maxColumn: number;
  defaultColumnWidth: number;
  defaultRowHeight: number;
}

export interface Workbook {
  sheets: Sheet[];
}

const DEFAULT_COLUMN_PX = 88;
const DEFAULT_ROW_PX = 20;

/* ── Styles ────────────────────────────────────────────────────────────────── */

interface XfStyle {
  numFmtId: number;
  font: { bold: boolean; italic: boolean; underline: boolean; color: string | null; size: number | null };
  fill: string | null;
  align: "left" | "center" | "right" | null;
  wrap: boolean;
}

const BUILT_IN_FORMATS: Record<number, string> = {
  0: "General",
  1: "0",
  2: "0.00",
  3: "#,##0",
  4: "#,##0.00",
  9: "0%",
  10: "0.00%",
  11: "0.00E+00",
  14: "dd/mm/yyyy",
  15: "d-mmm-yy",
  16: "d-mmm",
  17: "mmm-yy",
  18: "h:mm AM/PM",
  19: "h:mm:ss AM/PM",
  20: "h:mm",
  21: "h:mm:ss",
  22: "dd/mm/yyyy h:mm",
  37: "#,##0 ;(#,##0)",
  38: "#,##0 ;[Red](#,##0)",
  39: "#,##0.00;(#,##0.00)",
  40: "#,##0.00;[Red](#,##0.00)",
  44: "currency",
  45: "mm:ss",
  46: "[h]:mm:ss",
  47: "mmss.0",
  49: "@",
};

function colourOf(node: Element | null): string | null {
  const rgb = attr(node, "rgb");
  if (rgb && /^[0-9a-fA-F]{8}$/.test(rgb)) return `#${rgb.slice(2).toLowerCase()}`;
  if (rgb && /^[0-9a-fA-F]{6}$/.test(rgb)) return `#${rgb.toLowerCase()}`;
  return null;
}

function readStyles(xml: string | null) {
  const numFmts = new Map<number, string>();
  const fonts: XfStyle["font"][] = [];
  const fills: (string | null)[] = [];
  const xfs: XfStyle[] = [];

  if (!xml) return { numFmts, xfs };

  const document = parseXml(xml);

  for (const format of all(document, "numFmt")) {
    const id = num(format, "numFmtId");
    const code = attr(format, "formatCode");
    if (id !== null && code) numFmts.set(id, code);
  }

  for (const font of all(document, "fonts > font")) {
    fonts.push({
      bold: child(font, "b") !== null,
      italic: child(font, "i") !== null,
      underline: child(font, "u") !== null,
      color: colourOf(child(font, "color")),
      size: num(child(font, "sz")),
    });
  }

  for (const fill of all(document, "fills > fill")) {
    const pattern = child(fill, "patternFill");
    // Index 0 and 1 are the reserved "none" and "gray125" fills.
    fills.push(pattern && attr(pattern, "patternType") !== "none" ? colourOf(child(pattern, "fgColor")) : null);
  }

  for (const xf of all(document, "cellXfs > xf")) {
    const fontIndex = num(xf, "fontId") ?? 0;
    const fillIndex = num(xf, "fillId") ?? 0;
    const alignment = child(xf, "alignment");
    const horizontal = alignment ? attr(alignment, "horizontal") : null;
    xfs.push({
      numFmtId: num(xf, "numFmtId") ?? 0,
      font: fonts[fontIndex] ?? { bold: false, italic: false, underline: false, color: null, size: null },
      fill: fills[fillIndex] ?? null,
      align:
        horizontal === "center" || horizontal === "centerContinuous"
          ? "center"
          : horizontal === "right"
            ? "right"
            : horizontal === "left"
              ? "left"
              : null,
      wrap: alignment ? attr(alignment, "wrapText") === "1" : false,
    });
  }

  return { numFmts, xfs };
}

/* ── Values ────────────────────────────────────────────────────────────────── */

const DATE_TOKENS = /(^|[^\\])[ymdhs]/i;

function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;
  // Excel's epoch: 30 December 1899, with the 1900 leap-year bug folded in.
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNumber(value: number, numFmtId: number, numFmts: Map<number, string>): string {
  const code = numFmts.get(numFmtId) ?? BUILT_IN_FORMATS[numFmtId] ?? "General";
  if (code === "General" || code === "@") {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 1e10) / 1e10);
  }

  const decimalMatch = code.match(/0\.(0+)/);
  const decimals = decimalMatch ? decimalMatch[1].length : 0;
  const isDate = DATE_TOKENS.test(code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "")) && !/%/.test(code);

  if (isDate) {
    const date = excelSerialToDate(value);
    if (!date) return String(value);
    const hasTime = /[hs]/i.test(code) && !/^\[?h\]?:?mm:?ss/i.test(code);
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    const monthName = date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    if (/d-?mmm/i.test(code)) return `${Number(day)}-${monthName}-${String(year).slice(2)}`;
    if (/mmm/i.test(code) && !/d/i.test(code)) return `${monthName} ${String(year).slice(2)}`;
    if (hasTime) {
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    return `${day}/${month}/${year}`;
  }

  if (/%/.test(code)) {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  const grouped = /#,##/.test(code);
  const fixed = value.toFixed(decimals);
  const [whole, fraction] = fixed.split(".");
  const withGroups = grouped ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
  const body = fraction ? `${withGroups}.${fraction}` : withGroups;

  /*
   * A currency is whatever the format says it is: `"GH₵"#,##0.00`, `$#,##0`,
   * `#,##0.00" kg"`. The literal is quoted in the code, so it is read as written
   * rather than guessed from a symbol that may not be there.
   */
  const firstPlaceholder = code.search(/[0#?]/);
  const quoted = Array.from(code.matchAll(/"([^"]*)"/g));
  const prefix =
    quoted.find((match) => (match.index ?? 0) < firstPlaceholder)?.[1] ??
    (code.slice(0, Math.max(0, firstPlaceholder)).match(/[^\s[\]\-()0#?]+/)?.[0] ?? "");
  const suffix = quoted.find((match) => (match.index ?? 0) > firstPlaceholder)?.[1] ?? "";

  return `${prefix}${body}${suffix}`;
}

/* ── The sheet ─────────────────────────────────────────────────────────────── */

interface CellLookup {
  shared: string[];
  styles: XfStyle[];
  numFmts: Map<number, string>;
}

function cellFrom(
  cell: Element,
  lookup: CellLookup,
  shared: string[],
): SheetCell | null {
  const type = attr(cell, "t");
  const styleIndex = num(cell, "s");
  const xf = styleIndex !== null ? lookup.styles[styleIndex] : undefined;

  const raw = child(cell, "v")?.textContent ?? null;
  const inline = child(cell, "is");
  const inlineText = inline
    ? all(inline, "t")
        .map((node) => node.textContent ?? "")
        .join("")
    : null;

  let text = "";
  let numeric = false;

  if (type === "s") {
    const index = raw === null ? NaN : Number(raw);
    text = Number.isInteger(index) ? (shared[index] ?? "") : "";
  } else if (type === "inlineStr" || type === "str") {
    text = inlineText ?? raw ?? "";
  } else if (type === "b") {
    text = raw === "1" ? "TRUE" : "FALSE";
    numeric = true;
  } else if (type === "e") {
    text = raw ?? "#ERR";
  } else if (raw !== null && raw !== "") {
    const value = Number(raw);
    if (Number.isFinite(value)) {
      text = formatNumber(value, xf?.numFmtId ?? 0, lookup.numFmts);
      numeric = true;
    } else {
      text = raw;
    }
  }

  if (text === "" && !xf) return null;

  return {
    text,
    numeric,
    style: {
      bold: xf?.font.bold || undefined,
      italic: xf?.font.italic || undefined,
      underline: xf?.font.underline || undefined,
      color: xf?.font.color ?? undefined,
      fill: xf?.fill ?? undefined,
      size: xf?.font.size ?? undefined,
      align: xf?.align ?? undefined,
      wrap: xf?.wrap || undefined,
    },
  };
}

function columnWidthToPx(width: number): number {
  // Excel's width unit is roughly the width of one "0" in the default font, plus
  // cell padding. The cap keeps a deliberately wide column from eating the screen.
  return Math.min(420, Math.max(28, Math.round(width * 7 + 5)));
}

function readSheet(name: string, xml: string, lookup: CellLookup, shared: string[]): Sheet {
  const document = parseXml(xml);

  const columns: SheetColumn[] = all(document, "cols > col").map((col) => ({
    min: num(col, "min") ?? 1,
    max: num(col, "max") ?? 1,
    width: columnWidthToPx(num(col, "width") ?? 0),
  }));

  const format = all(document, "sheetFormatPr")[0] ?? null;
  const defaultRowHeight = format
    ? Math.round((num(format, "defaultRowHeight") ?? 15) * (96 / 72))
    : DEFAULT_ROW_PX;
  const defaultColumnWidth = format && num(format, "defaultColWidth")
    ? columnWidthToPx(num(format, "defaultColWidth") ?? 0)
    : DEFAULT_COLUMN_PX;

  const rows: SheetRow[] = [];
  let maxColumn = 0;

  for (const row of all(document, "sheetData > row")) {
    const index = num(row, "r") ?? rows.length + 1;
    const height = num(row, "ht");
    const cells = new Map<number, SheetCell>();

    for (const cell of all(row, "c")) {
      const reference = attr(cell, "r") ?? "";
      const column = columnOf(reference);
      if (column === 0) continue;
      const parsed = cellFrom(cell, lookup, shared);
      if (!parsed) continue;
      cells.set(column, parsed);
      maxColumn = Math.max(maxColumn, column);
    }

    if (cells.size > 0 || height !== null) {
      rows.push({ index, height: height === null ? null : Math.round(height * (96 / 72)), cells });
    }
  }

  const merges = all(document, "mergeCell")
    .map((merge) => attr(merge, "ref"))
    .filter((ref): ref is string => Boolean(ref));

  const maxRow = rows.reduce((largest, row) => Math.max(largest, row.index), 0);

  return {
    name,
    columns,
    rows,
    merges,
    maxRow,
    maxColumn,
    defaultColumnWidth,
    defaultRowHeight,
  };
}

/** "AB12" → 28. Column letters are 1-based, and so is this. */
export function columnOf(reference: string): number {
  const letters = reference.replace(/\d+/g, "").toUpperCase();
  let column = 0;
  for (const character of letters) {
    const code = character.charCodeAt(0);
    if (code < 65 || code > 90) return 0;
    column = column * 26 + (code - 64);
  }
  return column;
}

export function rowOf(reference: string): number {
  const digits = reference.replace(/\D+/g, "");
  const row = Number(digits);
  return Number.isFinite(row) ? row : 0;
}

export async function readWorkbook(data: ArrayBuffer | Uint8Array): Promise<Workbook> {
  const archive = await openOoxml(data);

  const workbookXml = await archive.text("xl/workbook.xml");
  if (!workbookXml) throw new Error("This does not look like an Excel file (no workbook.xml).");

  const rels = await readRels(archive, "xl/workbook.xml");
  const stylesXml = await archive.text("xl/styles.xml");
  const { numFmts, xfs } = readStyles(stylesXml);

  const sharedXml = await archive.text("xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedXml) {
    for (const item of all(parseXml(sharedXml), "si")) {
      shared.push(
        all(item, "t")
          .map((node) => node.textContent ?? "")
          .join(""),
      );
    }
  }

  const lookup: CellLookup = { shared, styles: xfs, numFmts };
  const sheets: Sheet[] = [];

  for (const entry of all(parseXml(workbookXml), "sheet")) {
    const name = attr(entry, "name") ?? `Sheet ${sheets.length + 1}`;
    const relationshipId = attr(entry, "id");
    const relationship = relationshipId ? rels[relationshipId] : undefined;
    const path = relationship?.target ?? `xl/worksheets/sheet${sheets.length + 1}.xml`;
    const xml = await archive.text(path);
    if (!xml) continue;
    sheets.push(readSheet(name, xml, lookup, shared));
  }

  if (sheets.length === 0) throw new Error("This workbook has no readable sheets.");
  return { sheets };
}

/* ── Merges ────────────────────────────────────────────────────────────────── */

export interface MergeSpan {
  rows: number;
  columns: number;
}

/**
 * Every cell covered by a merge, keyed "row:column".
 *
 * The renderer needs three things from a merge: the anchor that draws the cell,
 * how far it spans, and which coordinates to leave out because the anchor is
 * already covering them.
 */
export function mergeMap(merges: string[]): {
  anchors: Map<string, MergeSpan>;
  covered: Set<string>;
} {
  const anchors = new Map<string, MergeSpan>();
  const covered = new Set<string>();

  for (const reference of merges) {
    const [start, end] = reference.split(":");
    if (!start || !end) continue;
    const startColumn = columnOf(start);
    const startRow = rowOf(start);
    const endColumn = columnOf(end);
    const endRow = rowOf(end);
    if (!startColumn || !startRow || !endColumn || !endRow) continue;
    const span = { rows: endRow - startRow + 1, columns: endColumn - startColumn + 1 };
    if (span.rows < 1 || span.columns < 1) continue;
    anchors.set(`${startRow}:${startColumn}`, span);
    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        if (row === startRow && column === startColumn) continue;
        covered.add(`${row}:${column}`);
      }
    }
  }

  return { anchors, covered };
}
