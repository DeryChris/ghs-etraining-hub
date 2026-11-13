"use client";

import { useState } from "react";
import { LayoutGrid, BookOpen, FolderKanban, Users, ShieldCheck, Radio, MessageSquare, Bell, FileKey2, User } from "lucide-react";

import type { SupabaseUser } from "@/lib/ghs-constants";

interface SidebarProps {
  user: SupabaseUser | null;
  onClose: () => void;
}

const navItems = [
  { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
  { href: "/directorates", icon: FolderKanban, label: "Directorates" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/analytics", icon: ShieldCheck, label: "Analytics" },
];

export default function Sidebar({ user, onClose }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-4 border-b border-hairline">
        <h2 className="text-sm font-bold text-ink">GHS-ELN</h2>
        <button
          onClick={onClose}
          className="md:hidden p-1 text-ink-muted hover:text-ink"
          aria-label="Close navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Primary">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-card text-sm text-ink-muted hover:bg-surface-2 hover:text-ink transition"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="p-4 border-t border-hairline">
        <div className="flex items-center gap-3 px-3 py-2 rounded-card bg-surface-2 border border-hairline text-xs">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <User className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-ink">{user?.user_metadata?.full_name || "GHS Staff"}</div>
            <div className="text-ink-muted">{user?.user_metadata?.role || "Learner"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
