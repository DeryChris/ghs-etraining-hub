import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
}

const url: string = supabaseUrl;
const key: string = supabaseAnonKey;

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthAdapter {
  signIn(params: { email: string; password: string }): Promise<{ user: AuthUser | null; error: string | null }>;
  signUp(params: { email: string; password: string; metadata?: Record<string, unknown> }): Promise<{ user: AuthUser | null; error: string | null }>;
  signOut(): Promise<{ error: string | null }>;
  getUser(): Promise<{ user: AuthUser | null; error: string | null }>;
}

export class SupabaseAuth implements AuthAdapter {
  private supabase = createClient(url, key);

  async signIn({ email, password }: { email: string; password: string }) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    const user = data.user;
    if (!user) return { user: null, error: "No user returned" };
    return {
      user: { id: user.id, email: user.email ?? "", role: user.user_metadata?.role },
      error: null,
    };
  }

  async signUp({ email, password, metadata }: { email: string; password: string; metadata?: Record<string, unknown> }) {
    const { data, error } = await this.supabase.auth.signUp({ email, password, options: { data: metadata } });
    if (error) return { user: null, error: error.message };
    const user = data.user;
    if (!user) return { user: null, error: "No user returned" };
    return { user: { id: user.id, email: user.email ?? "" }, error: null };
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error: error?.message ?? null };
  }

  async getUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) return { user: null, error: error.message };
    const user = data.user;
    if (!user) return { user: null, error: null };
    return {
      user: { id: user.id, email: user.email ?? "", role: user.user_metadata?.role },
      error: null,
    };
  }
}

export const auth: AuthAdapter = new SupabaseAuth();