"use client";

import { useEffect } from "react";
import CompletionChart from "@/components/analytics/completion-chart";

export default function AdminDashboardPage() {
  useEffect(() => {
    // Initialize any admin-specific logic
  }, []);

  const regions = [
    { region: "Gr. Accra", value: 92 },
    { region: "Ashanti", value: 84 },
    { region: "Western", value: 78 },
    { region: "Northern", value: 69 },
    { region: "Volta", value: 81 },
    { region: "Central", value: 86 },
    { region: "Eastern", value: 75 },
    { region: "Upper East", value: 68 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">GHS HQ Executive Directorate Panel</h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">HQ SUPER ADMIN</span>
        </div>
        <p className="text-xs text-slate-400">Complete RBAC administration, regional compliance charts, audit trail logs & global announcements</p>
        <div className="flex items-center space-x-2">
          <button className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.948 13H11a9 9 0 00-.055-9.945z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Dispatch System Broadcast
          </button>
          <button className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow transition flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Create GHS User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 ghs-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold dark:text-white text-slate-900">Regional Health Personnel CPD Compliance (%)</h3>
              <p className="text-xs text-slate-400">Live credit accrual rates across 16 Ghana Health Service administrative regions</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">National Target: 85%</span>
          </div>
          <div className="h-64 relative">
            <CompletionChart data={regions} target={85} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="ghs-panel p-5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Registered GHS Staff Accounts</span>
            <div className="text-2xl font-bold dark:text-white text-slate-900 font-mono">48,920 Personnel</div>
            <span className="text-[11px] text-emerald-400">Active across 260 District Directorates</span>
          </div>
          <div className="ghs-panel p-5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Certified Facilitator Accounts</span>
            <div className="text-2xl font-bold dark:text-white text-slate-900 font-mono">412 Specialists</div>
            <span className="text-[11px] text-cyan-400">MDC & NMC Board Approved</span>
          </div>
          <div className="ghs-panel p-5 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400">Security Audit Events (24h)</span>
            <div className="text-2xl font-bold dark:text-white text-slate-900 font-mono">1,842 Events</div>
            <span className="text-[11px] text-slate-400">0 High-Severity Security Anomalies</span>
          </div>
        </div>
      </div>

      <div className="ghs-panel rounded-2xl overflow-hidden space-y-4">
        <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center space-x-2 text-xs">
          <button className="admin-tab-btn px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold">RBAC User Directory</button>
          <button className="admin-tab-btn px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold">Category & Space Tree Builder</button>
          <button className="admin-tab-btn px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold">Enterprise Security Audit Log</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <input type="text" placeholder="Search Staff ID, Name, Cadre, Facility..." className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 w-full sm:w-80 focus:outline-none" />
            <span className="text-xs text-slate-400">Filtered Total: <span className="font-bold text-white">4</span> Personnel</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3 pl-4">Staff ID & Name</th>
                  <th className="p-3">Cadre / Title</th>
                  <th className="p-3">Facility & Region</th>
                  <th className="p-3">Council License</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-right pr-4">RBAC Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="p-3 pl-4 font-semibold text-white">
                    <div className="font-mono text-cyan-400 text-[11px]">GHS-102938</div>
                    Nurse Perpetual Addo
                  </td>
                  <td className="p-3 text-slate-300">Senior Nursing Officer</td>
                  <td className="p-3 text-slate-400">Ridge Hospital, Greater Accra</td>
                  <td className="p-3 font-mono text-amber-400 text-[11px]">NMC/RNR-2024-8849</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded badge-ghs-green text-[10px] font-bold">LEARNER</span></td>
                  <td className="p-3 text-right pr-4 space-x-2">
                    <button className="text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg">Mutate Role</button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-800/40 transition">
                  <td className="p-3 pl-4 font-semibold text-white">
                    <div className="font-mono text-cyan-400 text-[11px]">GHS-449102</div>
                    Dr. Emmanuel K. Quaye
                  </td>
                  <td className="p-3 text-slate-300">Senior Specialist Obstetrician</td>
                  <td className="p-3 text-slate-400">Korle Bu Teaching Hospital</td>
                  <td className="p-3 font-mono text-amber-400 text-[11px]">MDC/PE-11029</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">FACILITATOR</span></td>
                  <td className="p-3 text-right pr-4 space-x-2">
                    <button className="text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg">Mutate Role</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
