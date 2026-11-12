"use client";

import { useParams } from "next/navigation";

export default function SpacePage() {
  const params = useParams();
  const categorySlug = (params as any)?.categorySlug;
  const spaceSlug = (params as any)?.spaceSlug;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {spaceSlug.replace(/-/g, " ")}
          </h1>
          <p className="text-xs text-slate-400">
            Category: {categorySlug.replace(/-/g, " ")} • Clinical space materials and reader
          </p>
        </div>
      </div>
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <p className="text-slate-400 text-sm">
          Space <strong className="text-white">{spaceSlug}</strong> materials and protocol reader will render here.
        </p>
      </div>
    </div>
  );
}
