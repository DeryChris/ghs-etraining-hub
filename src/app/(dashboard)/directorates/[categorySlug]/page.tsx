"use client";

import { useParams } from "next/navigation";

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = (params as any)?.categorySlug;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{categorySlug.replace(/-/g, " ")}</h1>
          <p className="text-xs text-slate-400">Clinical category space with accredited sub-spaces and materials</p>
        </div>
      </div>
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <p className="text-slate-400 text-sm">
          Sub-spaces for <strong className="text-white">{categorySlug}</strong> are managed here. Each space contains
          accredited clinical materials (PDF, video, text protocols) with associated CPD credit values.
        </p>
      </div>
    </div>
  );
}
