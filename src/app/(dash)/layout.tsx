"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client/supabase-browser";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import type { SupabaseUser } from "@/lib/ghs-constants";

export default function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? mapSupabaseUser(data.user) : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  function mapSupabaseUser(u: { id: string; email?: string; user_metadata?: { full_name?: string; role?: string } }): SupabaseUser {
    return {
      id: u.id,
      email: u.email ?? "",
      user_metadata: u.user_metadata,
    };
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-surface border-r border-hairline z-30 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0",
        )}
      >
        <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col relative">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden absolute left-4 top-4 z-40 p-2 rounded-control bg-surface border border-hairline text-ink hover:bg-surface-2"
          aria-label="Open navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Header user={user} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
