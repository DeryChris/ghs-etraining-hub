"use client";

import { useMemo, useState } from "react";
import { mergeMap, type Sheet, type Workbook } from "@/lib/office/xlsx";

/**
 * A sheet, drawn as a sheet.
 *
 * The column that is wide is wide, the header is bold on its fill, a merged cell
 * spans what it spans, a currency is written as money and a number sits on the
 * right where a number belongs. This is the grid the author arranged, not a list
 * of its values.
 */

/** Beyond this the browser starts to feel it; the download has the whole book. */
const MAX_ROWS = 400;
const MAX_COLUMNS = 40;

function columnLetter(index: number): string {
  let label = "";
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

function widthOf(sheet: Sheet, column: number): number {
  const match = sheet.columns.find((entry) => column >= entry.min && column <= entry.max);
  return match?.width ?? sheet.defaultColumnWidth;
}

export function XlsxView({ workbook }: { workbook: Workbook }) {
  const [active, setActive] = useState(0);
  const sheet = workbook.sheets[Math.min(active, workbook.sheets.length - 1)];

  const { anchors, covered } = useMemo(() => mergeMap(sheet.merges), [sheet]);
  const columnCount = Math.min(Math.max(sheet.maxColumn, 1), MAX_COLUMNS);
  const rows = sheet.rows.slice(0, MAX_ROWS);
  const truncated = sheet.rows.length > MAX_ROWS;

  const columns = Array.from({ length: columnCount }, (_, index) => index + 1);
  const totalWidth = columns.reduce((sum, column) => sum + widthOf(sheet, column), 0) + 44;

  return (
    <div className="space-y-2">
      <div className="max-h-[62vh] overflow-auto rounded-control border border-hairline bg-surface">
        <table
          className="border-separate border-spacing-0 text-[12px] text-ink"
          style={{ width: Math.max(totalWidth, 320), tableLayout: "fixed" }}
        >
          <colgroup>
            <col style={{ width: 44 }} />
            {columns.map((column) => (
              <col key={column} style={{ width: widthOf(sheet, column) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 h-6 border-b border-r border-hairline bg-surface-2 text-[10px] font-semibold text-ink-muted" />
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="sticky top-0 z-10 h-6 border-b border-r border-hairline bg-surface-2 text-[10px] font-semibold text-ink-muted"
                >
                  {columnLetter(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.index} style={{ height: row.height ?? sheet.defaultRowHeight }}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r border-hairline bg-surface-2 text-center text-[10px] font-semibold text-ink-muted"
                >
                  {row.index}
                </th>
                {columns.map((column) => {
                  const key = `${row.index}:${column}`;
                  if (covered.has(key)) return null;
                  const cell = row.cells.get(column);
                  const span = anchors.get(key);

                  return (
                    <td
                      key={column}
                      rowSpan={span && span.rows > 1 ? span.rows : undefined}
                      colSpan={span && span.columns > 1 ? span.columns : undefined}
                      style={{
                        background: cell?.style.fill,
                        color: cell?.style.color,
                        fontWeight: cell?.style.bold ? 600 : undefined,
                        fontStyle: cell?.style.italic ? "italic" : undefined,
                        textDecoration: cell?.style.underline ? "underline" : undefined,
                        fontSize: cell?.style.size ? `${Math.min(16, Math.max(9, cell.style.size))}px` : undefined,
                        textAlign: cell?.style.align ?? (cell?.numeric ? "right" : "left"),
                        whiteSpace: cell?.style.wrap ? "pre-wrap" : "nowrap",
                      }}
                      className="max-w-0 overflow-hidden text-ellipsis border-b border-r border-hairline px-1.5 py-0.5 align-bottom"
                    >
                      {cell?.text ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {workbook.sheets.length > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sheets">
            {workbook.sheets.map((entry, position) => (
              <button
                key={entry.name}
                type="button"
                role="tab"
                aria-selected={position === active}
                onClick={() => setActive(position)}
                className={`inline-flex h-8 items-center rounded-control border px-2.5 text-xs font-semibold transition-colors ${
                  position === active
                    ? "border-primary bg-primary text-primary-ink"
                    : "border-hairline bg-surface text-ink-muted hover:border-primary/40 hover:text-ink"
                }`}
              >
                {entry.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs font-semibold text-ink-muted">{sheet.name}</p>
        )}

        {truncated && (
          <p className="text-[11px] text-ink-muted">
            Showing the first {MAX_ROWS} rows here. Download for the rest.
          </p>
        )}
      </div>
    </div>
  );
}
