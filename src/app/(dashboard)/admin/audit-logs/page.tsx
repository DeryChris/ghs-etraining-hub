"use client";

import { useEffect, useState } from "react";

const INITIAL_LOGS = [
  { time: "12:01:44 PM", actor: "GHS-884920 (Kofi Mensah)", action: "USER_ROLE_MUTATED", resource: "GHS-102938 -> LEARNER", ip: "102.176.45.12 (Accra HQ)" },
  { time: "11:42:10 AM", actor: "GHS-449102 (Dr. Quaye)", action: "CPD_CREDIT_VERIFIED", resource: "Nurse Perpetual Addo (+5 PTS)", ip: "102.176.88.90 (Korle Bu)" },
  { time: "10:15:02 AM", actor: "GHS-102938 (Nurse Addo)", action: "PROTOCOL_DOWNLOADED", resource: "EmONC_PPH_Guidelines_2026.pdf", ip: "41.215.160.4 (Ridge Hosp)" },
  { time: "09:00:00 AM", actor: "GHS-884920 (Kofi Mensah)", action: "BROADCAST_DISPATCHED", resource: "EmONC Protocol 2026 Revision", ip: "102.176.45.12 (Accra HQ)" },
];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState(INITIAL_LOGS);

  useEffect(() => {
    // Simulate live stream refresh
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      setLogs((prev) => [
        { time: now, actor: "System", action: "HEARTBEAT_CHECK", resource: "Platform", ip: "102.176.45.12 (Accra HQ)" },
        ...prev.slice(0, 9),
      ]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-mono">Immutable Security Event Stream (RBAC Monitored)</span>
        <button className="text-emerald-400 hover:underline">Refresh Logs</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Performer Staff ID</th>
              <th className="p-3">Event Type</th>
              <th className="p-3">Target Resource</th>
              <th className="p-3">IP Address</th>
            </tr>
          </thead>
          <tbody id="audit-logs-body" className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
            {logs.map((l, i) => (
              <tr key={i} className="hover:bg-slate-800/40">
                <td className="p-3 text-slate-400">{l.time}</td>
                <td className="p-3 font-semibold text-cyan-300">{l.actor}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
                    {l.action}
                  </span>
                </td>
                <td className="p-3 text-slate-200">{l.resource}</td>
                <td className="p-3 text-slate-500">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
