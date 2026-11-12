"use client";

export default function FacilitatorAssignedCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Facilitator Clinical Control Board</h1>
          <p className="text-xs text-slate-400">
            Curate assigned spaces, grade clinical case assessments, and verify CPD credit hours
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Sub-space
          </button>
          <button className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow transition flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Upload Clinical Protocol
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400">Assigned Clinical Spaces</span>
          <div className="text-2xl font-bold text-white">4 Managed Spaces</div>
          <p className="text-[11px] text-emerald-400">1,840 Enrolled GHS Personnel</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400">Pending Assessment Queue</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">6 Submissions</div>
          <p className="text-[11px] text-slate-400">Requires qualitative review for CPD points</p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <span className="text-xs text-slate-400">Total Credits Awarded</span>
          <div className="text-2xl font-bold text-white font-mono">4,920 CPD Pts</div>
          <p className="text-[11px] text-emerald-400">Verified with MDC / NMC Registries</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-4">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Learner Assessment Review Queue</h3>
            <p className="text-xs text-slate-400">Verify case study submissions and issue accredited CPD credits</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4 pl-6">Staff ID & Name</th>
                <th className="p-4">Cadre & Facility</th>
                <th className="p-4">Target Space</th>
                <th className="p-4">Submission Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right pr-6">Grading Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-4 pl-6 font-semibold text-white">
                  <div className="font-mono text-cyan-400 text-[11px]">GHS-102938</div>
                  Nurse Perpetual Addo
                </td>
                <td className="p-4 text-slate-400">Senior Nursing Officer • Ridge Hospital</td>
                <td className="p-4 text-slate-300">EmONC Protocol 2026</td>
                <td className="p-4 font-mono text-slate-400">Yesterday, 14:20</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                    PENDING REVIEW
                  </span>
                </td>
                <td className="p-4 text-right pr-6">
                  <button className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow">
                    Review & Grade
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition">
                <td className="p-4 pl-6 font-semibold text-white">
                  <div className="font-mono text-cyan-400 text-[11px]">GHS-554109</div>
                  Staff Nurse Kwabena Mensah
                </td>
                <td className="p-4 text-slate-400">Staff Nurse II • Komfo Anokye Hospital</td>
                <td className="p-4 text-slate-300">Eclampsia Management</td>
                <td className="p-4 font-mono text-slate-400">10 Nov 2026</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    VERIFIED (+5 PTS)
                  </span>
                </td>
                <td className="p-4 text-right pr-6">
                  <span className="text-xs text-slate-500 font-mono">Graded by Dr. Quaye</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
