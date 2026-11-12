"use client";

import { useState } from "react";
import { Sun, Moon, Bell, MessageSquare, ShieldAlert, User, UserCheck } from "lucide-react";

interface HeaderProps {
  user: any;
  role: string;
}

export default function Header({ user, role }: HeaderProps) {
  const [theme, setTheme] = useState("dark");
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);

  const profiles: Record<string, any> = {
    learner: {
      name: "Nurse Perpetual Addo",
      detail: "GHS-102938 • NMC/RNR-2024-8849",
      tag: "Learner",
      desc: "Full clinical protocol access, CPD points accrual, interactive case discussion.",
      license: "NMC ACCREDITED",
    },
    facilitator: {
      name: "Dr. Emmanuel K. Quaye",
      detail: "GHS-449102 • MDC/PE-11029",
      tag: "Facilitator",
      desc: "Curate assigned spaces, grade clinical case assessments, and verify CPD credit hours.",
      license: "MDC SPECIALIST BOARD",
    },
    admin: {
      name: "Kofi Mensah",
      detail: "GHS-884920 • HQ IT/HR Directorate",
      tag: "Super Admin",
      desc: "Complete RBAC administration, regional compliance charts, audit trail logs & global announcements.",
      license: "HQ SYSTEM DIRECTORY",
    },
  };

  const activeRole = profiles[role] || profiles.learner;

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    html.classList.remove("dark", "light");
    html.classList.add(next);
  };

  const setRole = (r: string) => {
    window.location.replace(`/dashboard?role=${r}`);
  };

  return (
    <header className="sticky top-0 z-40 ghs-panel border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-amber-400/40">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M2 12h20M12 6l4 4-4 4-4-4 4-4z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold tracking-tight dark:text-white text-slate-900">GHS-CPD</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded badge-ghs-gold uppercase">Official Portal</span>
              </div>
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
                GHANA HEALTH SERVICE • HUMAN RESOURCES DIRECTORATE
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:hidden">
            <button onClick={toggleTheme} className="p-2 rounded-lg bg-slate-800/60 text-slate-300">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-lg bg-slate-800/60 text-slate-300 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full md:w-auto justify-center">
          <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider hidden lg:inline">Active Context:</span>
          <button onClick={() => setRole("learner")} className={`role-btn text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${role === "learner" ? "bg-emerald-700 text-white shadow" : "text-slate-400"}`}>
            <User className="w-3.5 h-3.5" /> Nurse Addo
          </button>
          <button onClick={() => setRole("facilitator")} className={`role-btn text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${role === "facilitator" ? "bg-emerald-700 text-white shadow" : "text-slate-400"}`}>
            <UserCheck className="w-3.5 h-3.5" /> Dr. Quaye
          </button>
          <button onClick={() => setRole("admin")} className={`role-btn text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${role === "admin" ? "bg-emerald-700 text-white shadow" : "text-slate-400"}`}>
            <ShieldAlert className="w-3.5 h-3.5" /> HQ Admin
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-3">
          <button onClick={toggleTheme} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white transition" title="Toggle Light/Dark Theme">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setMsgOpen(!msgOpen)} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white transition relative" title="Direct Messaging">
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
          </button>
          <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:text-white transition relative" title="System Alerts">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full">3</span>
          </button>
          <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-700 dark:border-slate-800">
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120" className="w-8 h-8 rounded-full object-cover border border-emerald-500/50" alt="avatar" />
            <div className="text-left leading-tight hidden lg:block">
              <div className="text-xs font-bold dark:text-white text-slate-900">{activeRole.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">{activeRole.detail}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
