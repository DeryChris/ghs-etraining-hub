"use client";

import { createBrowserClient, type CookieOptionsWithName } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
}

const url: string = supabaseUrl;
const key: string = supabaseAnonKey;

/**
 * `cookieOptions` is only passed for "remember me": with no `maxAge` the auth
 * cookies are session cookies, which is the behaviour we want when the person
 * signing in is on a shared facility computer.
 */
export function createClient(options?: { cookieOptions?: CookieOptionsWithName }) {
  return createBrowserClient(url, key, options);
}

export async function signIn(params: { email: string; password: string }) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(params);
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  return { error: null };
}