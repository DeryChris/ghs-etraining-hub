"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client/supabase-browser";

const USERS = [
  {
    staffId: "GHS-102938",
    name: "Nurse Perpetual Addo",
    cadre: "Senior Nursing Officer",
    facility: "Ridge Hospital, Greater Accra",
    license: "NMC/RNR-2024-8849",
    role: "Learner",
    roleColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    staffId: "GHS-449102",
    name: "Dr. Emmanuel K. Quaye",
    cadre: "Senior Specialist Obstetrician",
    facility: "Korle Bu Teaching Hospital",
    license: "MDC/PE-11029",
    role: "Facilitator",
    roleColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  {
    staffId: "GHS-884920",
    name: "Kofi Mensah",
    cadre: "Principal IT Systems Officer",
    facility: "GHS HQ, HR Directorate, Accra",
    license: "GHS/IT-0082",
    role: "Super Admin",
    roleColor: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  {
    staffId: "GHS-304911",
    name: "Senior Pharmacist Yaw Darko",
    cadre: "Senior Pharmacist",
    facility: "Komfo Anokye Teaching Hospital",
    license: "Pharmacy Council 8829",
    role: "Learner",
    roleColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
];

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState(USERS);

  useEffect(() => {
    const q = query.toLowerCase();
    setFiltered(
      USERS.filter(
        (u) =>
          u.staffId.toLowerCase().includes(q) ||
          u.name.toLowerCase().includes(q) ||
          u.cadre.toLowerCase().includes(q) ||
          u.facility.toLowerCase().includes(q)
      )
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Staff ID, Name, Cadre, Facility..."
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 w-full sm:w-80 focus:outline-none"
        />
        <span className="text-xs text-slate-400">
          Filtered Total: <span className="font-bold text-white">{filtered.length}</span> Personnel
        </span>
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
            {filtered.map((u) => (
              <tr key={u.staffId} className="hover:bg-slate-800/40 transition">
                <td className="p-3 pl-4 font-semibold text-white">
                  <div className="font-mono text-cyan-400 text-[11px]">{u.staffId}</div>
                  {u.name}
                </td>
                <td className="p-3 text-slate-300">{u.cadre}</td>
                <td className="p-3 text-slate-400">{u.facility}</td>
                <td className="p-3 font-mono text-amber-400 text-[11px]">{u.license}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.roleColor}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-right pr-4 space-x-2">
                  <button className="text-xs text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg">
                    Mutate Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
