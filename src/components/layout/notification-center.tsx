"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(2);

  const notifications = [
    {
      type: "CRITICAL HEALTH DIRECTIVE",
      title: "EmONC Protocol 2026 Revision Release",
      body: "Mandatory Oxytocin & Misoprostol dosage matrix updated.",
      time: "12 mins ago",
      severity: "warn",
    },
    {
      type: "CPD Credit Verified",
      title: "+5 CPD Credits Awarded",
      body: "Verified by Nursing & Midwifery Council Ghana portal API.",
      time: "2 hours ago",
      severity: "success",
    },
  ];

  const severityStyles: Record<string, string> = {
    warn: "bg-amber-400/10 border-amber-400/30 text-amber-400",
    success: "bg-ghs-green/10 border-ghs-green/30 text-ghs-green",
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-control bg-surface border border-hairline text-ink-muted hover:text-ink transition relative hidden md:block"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-ghs-gold text-slate-950 font-bold text-[10px]">
            {unread}
          </span>
        )}
      </button>

      <div
        className={`fixed inset-y-0 right-0 z-30 w-full sm:w-96 bg-surface border-l border-hairline transition-transform duration-300 p-6 shadow-panel ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        id="notifications-drawer"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-4">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-bold text-ink">GHS Official Notifications</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-muted hover:text-ink"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div id="notifications-feed" className="space-y-3 overflow-y-auto max-h-[75vh]">
            {notifications.map((n, i) => (
              <div
                key={i}
                className={`p-4 rounded-card border border-hairline space-y-1 ${severityStyles[n.severity]}`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-bold ${severityStyles[n.severity]}`}>
                    {n.type}
                  </span>
                  <span className="text-ink-muted">{n.time}</span>
                </div>
                <h4 className="text-xs font-bold text-ink">{n.title}</h4>
                <p className="text-[11px] text-ink-muted">{n.body}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setOpen(false);
            setUnread(0);
          }}
          className="w-full py-2.5 rounded-control bg-surface-2 border border-hairline text-xs font-semibold text-ink-muted hover:bg-surface transition"
        >
          Dismiss Notifications
        </button>
      </div>
    </>
  );
}
