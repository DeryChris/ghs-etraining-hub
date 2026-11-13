"use client";

import { useState } from "react";
import { signOut } from "@/lib/client/supabase-browser";
import { Bell, LogOut, Menu, Sun, Moon, User } from "lucide-react";

import type { SupabaseUser } from "@/lib/ghs-constants";

interface HeaderProps {
  user: SupabaseUser | null;
}

export default function Header({ user }: HeaderProps) {
  const [theme, setTheme] = useState("dark");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between px-4 bg-canvas border-b border-hairline">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-control bg-gradient-to-br from-ghs-green to-ghs-gold flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink tracking-tight">GHS-ELN</h1>
            <p className="text-[10px] text-ink-muted font-medium">Ghana Health Service eLearning Network</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-control bg-surface border border-hairline text-ink-muted hover:text-ink transition"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-control bg-surface border border-hairline text-ink-muted hover:text-ink transition"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:block text-xs font-semibold text-ink">{user?.user_metadata?.full_name || "Staff"}</span>
            <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-hairline rounded-card shadow-panel p-2 z-30">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-ink hover:bg-surface-2 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
