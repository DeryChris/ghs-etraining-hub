"use client";

import { useEffect, useState } from "react";
import { Bell, X, ChevronRight } from "lucide-react";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(3);

  const notifications = [
    {
      type: "CRITICAL HEALTH DIRECTIVE",
      title: "EmONC Protocol 2026 Revision Release",
      body: "Mandatory Oxytocin & Misoprostol dosage matrix updated.",
      time: "12 mins ago",
      severity: "amber",
    },
    {
      type: "CPD CREDIT VERIFIED",
      title: "+5 NMC CPD Credits Awarded",
      body: "Verified by Nursing & Midwifery Council Ghana portal API.",
      time: "2 hours ago",
      severity: "emerald",
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white relative hidden md:block"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">
            {unread}
          </span>
        )}
      </button>

      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 ghs-panel border-l border-slate-800 transition-transform duration-300 p-6 flex flex-col justify-between shadow-2xl ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        id="notifications-drawer"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold dark:text-white text-slate-900">GHS Official Notifications</h3>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div id="notifications-feed" className="space-y-3 overflow-y-auto max-h-[75vh]">
            {notifications.map((n, i) => (
              <div key={i} className={`p-3.5 rounded-xl border space-y-1 ${n.severity === "amber" ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-900 border-slate-800"}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${n.severity === "amber" ? "text-amber-400" : "text-emerald-400"}`}>
                    {n.type}
                  </span>
                  <span className="text-slate-500">{n.time}</span>
                </div>
                <h4 className="text-xs font-bold text-white">{n.title}</h4>
                <p className={`text-[11px] ${n.severity === "amber" ? "text-slate-300" : "text-slate-400"}`}>
                  {n.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setOpen(false);
            setUnread(0);
          }}
          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-slate-400 font-semibold border border-slate-800"
        >
          Dismiss Notifications
        </button>
      </div>
    </>
  );
}
