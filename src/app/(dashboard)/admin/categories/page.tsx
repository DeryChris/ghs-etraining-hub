"use client";

import { useState } from "react";

const CATEGORIES = [
  {
    code: "CAT-MNH-01",
    name: "Maternal & Neonatal Health",
    spaces: 3,
    description:
      "Clinical protocols and training modules for maternal and neonatal care across Ghana health facilities.",
  },
  {
    code: "CAT-INF-02",
    name: "Infectious Disease & Epidemiology",
    spaces: 2,
    description:
      "Protocols for infectious disease surveillance, outbreak management, and epidemiological response.",
  },
  {
    code: "CAT-EM-03",
    name: "Emergency Medicine & Triage",
    spaces: 1,
    description:
      "Emergency medicine protocols, triage systems, and acute care guidelines.",
  },
  {
    code: "CAT-CG-04",
    name: "Clinical Governance & Medical Ethics",
    spaces: 1,
    description:
      "Medical ethics, patients charter, clinical governance, and medico-legal practice guidelines.",
  },
  {
    code: "CAT-PH-05",
    name: "Public Health & Epidemiology",
    spaces: 0,
    description:
      "Public health programs, disease surveillance, and preventive care protocols.",
  },
];

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-white">Clinical Category & Sub-Space Hierarchy Tree</h3>
        <button className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold">
          + Add Primary Category
        </button>
      </div>
      <div className="space-y-3" id="admin-category-tree">
        {CATEGORIES.map((cat) => (
          <div key={cat.code} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center font-bold text-white">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {cat.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{cat.spaces} Spaces</span>
            </div>
            <div className="pl-6 space-y-1 text-slate-400 text-[11px]">
              <div className="flex justify-between py-1 border-t border-slate-800/60">
                <span>• Space 1</span>
                <span className="text-amber-400 font-bold font-mono">5 Points</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
