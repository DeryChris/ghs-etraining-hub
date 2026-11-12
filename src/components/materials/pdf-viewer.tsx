"use client";

interface PdfViewerProps {
  fileUrl: string;
  title: string;
  size?: string;
  verifiedBy?: string;
}

export default function PdfViewer({ fileUrl, title, size, verifiedBy }: PdfViewerProps) {
  return (
    <div className="h-64 bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 space-y-3">
      <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <div className="text-xs font-bold text-white">{title}</div>
      <span className="text-[11px] text-slate-400 font-mono">
        Size: {size || "3.4 MB"} • Digital Signature Verified by Director ICD
      </span>
      <button className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download PDF Protocol
      </button>
    </div>
  );
}
