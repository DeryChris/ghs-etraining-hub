import * as React from "react";

export interface DataTableProps {
  columns: string[];
  rows: Record<string, string | React.ReactNode>[];
  rowKey?: string;
}

export function DataTable({ columns, rows, rowKey = "id" }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
          <tr>
            {columns.map((col) => (
              <th key={col} className="p-3 pl-4">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {rows.map((row) => (
            <tr key={row[rowKey] as string} className="hover:bg-slate-800/40 transition">
              {columns.map((col) => (
                <td key={col} className="p-3 pl-4">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
