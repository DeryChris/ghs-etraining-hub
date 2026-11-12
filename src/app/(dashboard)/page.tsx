"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/client/supabase-browser";
import CompletionChart from "@/components/analytics/completion-chart";

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>("learner");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const userRole = data.user?.user_metadata?.role;
      if (!userRole) {
        router.replace("/login");
        return;
      }
      setRole(userRole);
      if (userRole === "SYSTEM_ADMIN") {
        router.replace("/admin");
      } else if (userRole === "FACILITATOR") {
        router.replace("/facilitator/assigned-categories");
      }
      // Learners stay on this dashboard
    });
  }, [router]);

  if (role === "learner") {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl ghs-panel p-6 sm:p-8 border border-slate-800">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute right-40 -top-10 w-48 h-48 bg-amber-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full badge-ghs-green text-xs font-semibold">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>License Renewal Cycle 2026 Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight dark:text-white text-slate-900">Welcome, Nurse Perpetual Addo 👋</h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
                Senior Nursing Officer at <span className="text-emerald-400 font-semibold">Greater Accra Regional Hospital (Ridge)</span>. You have completed <span className="text-amber-400 font-bold">28 of 30</span> required CPD points for 2026.
              </p>
            </div>
            <div className="flex items-center space-x-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex-shrink-0">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-amber-400 font-mono">28 / 30</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Accumulated CPD Credits</div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                93%
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold dark:text-white text-slate-900">Clinical Training Categories & Spaces</h2>
            <p className="text-xs text-slate-400">Official accredited continuous learning modules by clinical domain</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow transition flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Resume Active Lesson</span>
            </button>
          </div>
        </div>

        <div className="space-y-6" id="learner-category-grid">
          <div className="ghs-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 3a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-5.414 5.414a1 1 0 01-1.414 0l-2.121-2.121a1 1 0 00-1.414 0l-3.535 3.535m1.414-9.564L14.586 11H3a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1v-3.586a1 1 0 00-.293-.707l-5.414-5.414a1 1 0 00-1.414 0l-4.042 4.042a1 1 0 01-1.414 0L2.707 5.707a1 1 0 010-1.414L4.121 3H3a1 1 0 01-1-1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold dark:text-white text-slate-900">Maternal & Neonatal Health</h3>
                <p className="text-xs text-slate-400">3 Accredited Clinical Spaces</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition space-y-3 group">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">EmONC Protocol 2026</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-ghs-gold">5 Points</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>4 Protocols</span>
                  <span className="text-emerald-400 group-hover:translate-x-1 transition flex items-center gap-1 font-semibold">
                    Open Space <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition space-y-3 group">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Eclampsia & MgSO4 Dosage</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-ghs-gold">3 Points</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>3 Protocols</span>
                  <span className="text-emerald-400 group-hover:translate-x-1 transition flex items-center gap-1 font-semibold">
                    Open Space <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition space-y-3 group">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Neonatal Resuscitation Workflow</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold badge-ghs-gold">4 Points</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>2 Protocols</span>
                  <span className="text-emerald-400 group-hover:translate-x-1 transition flex items-center gap-1 font-semibold">
                    Open Space <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
