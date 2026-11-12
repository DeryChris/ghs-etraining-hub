"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, BookOpen, FolderKanban, UploadCloud, MessagesSquare, ShieldCheck, Users, FileKey2, Radio } from "lucide-react";

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const [navItems, setNavItems] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    let items: React.ReactNode[] = [];

    if (role === "learner") {
      items = [
        <button key="learner-dashboard" onClick={() => window.location.replace("/dashboard")} className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 text-white shadow">
          <LayoutGrid className="w-4 h-4" />
          <span>CPD Dashboard & Catalog</span>
        </button>,
        <button key="learner-reader" onClick={() => window.location.replace("/reader")} className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60">
          <BookOpen className="w-4 h-4" />
          <span>Active Lesson Reader</span>
        </button>,
      ];
    } else if (role === "facilitator") {
      items = [
        <button key="facilitator-workspace" onClick={() => window.location.replace("/facilitator/assigned-categories")} className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 text-white shadow">
          <FolderKanban className="w-4 h-4" />
          <span>Assessment Scoring Queue</span>
        </button>,
        <button key="upload-material" className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60">
          <UploadCloud className="w-4 h-4" />
          <span>Upload Protocol Document</span>
        </button>,
        <button key="moderate-forum" onClick={() => window.location.replace("/reader")} className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60">
          <MessagesSquare className="w-4 h-4" />
          <span>Moderate Peer Forum</span>
        </button>,
      ];
    } else if (role === "admin") {
      items = [
        <button key="admin-dashboard" onClick={() => window.location.replace("/admin")} className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-700 text-white shadow">
          <ShieldCheck className="w-4 h-4" />
          <span>HQ Regional Analytics</span>
        </button>,
        <button key="rbac-users" onClick={() => window.location.replace("/admin/users")} className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60">
          <Users className="w-4 h-4" />
          <span>RBAC User Directory</span>
        </button>,
        <button key="audit-trail" onClick={() => window.location.replace("/admin/audit-logs")} className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-900/60">
          <FileKey2 className="w-4 h-4" />
          <span>Security Audit Trail</span>
        </button>,
        <button key="broadcast" className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-amber-400 hover:bg-amber-500/10">
          <Radio className="w-4 h-4" />
          <span>System Broadcast</span>
        </button>,
      ];
    }

    setNavItems(items);
  }, [role]);

  return (
    <div className="ghs-panel p-2 rounded-2xl space-y-1" id="sidebar-nav">
      {navItems}
    </div>
  );
}
