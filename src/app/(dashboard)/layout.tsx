"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client/supabase-browser";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import NotificationCenter from "@/components/layout/notification-center";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("learner");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setRole(data.user?.user_metadata?.role || "learner");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setRole(session?.user?.user_metadata?.role || "learner");
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-mesh-ghs text-slate-100">
      <Header user={user} role={role} />
      <div className="max-w-7xl w-full mx-auto flex-grow flex flex-col md:flex-row gap-6 p-4 sm:p-6 lg:p-8">
        <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
          <Sidebar role={role} />
        </aside>
        <main className="flex-grow space-y-6 overflow-hidden">{children}</main>
      </div>
      <NotificationCenter />
    </div>
  );
}
