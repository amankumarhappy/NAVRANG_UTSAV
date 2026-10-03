import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SerializeOptions } from "cookie";
import { cookies } from "next/headers";
import { getSupabasePublicConfig, getSupabaseServiceConfig } from "@/lib/supabase/config";

type CookieOptions = Partial<SerializeOptions>;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicConfig();
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options }),
            );
          } catch {
            // Server Components cannot write refreshed cookies; middleware handles refresh.
          }
        },
      },
    },
  );
}

export function createServiceSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabaseServiceConfig();
  return createClient(
    url,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function createPublicSupabaseClient(): SupabaseClient {
  const { url, key } = getSupabasePublicConfig();
  return createClient(
    url,
    key,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { authorized: false as const, user: null, supabase };
  if (data.user.app_metadata?.role !== "admin") {
    return { authorized: false as const, user: data.user, supabase };
  }
  return { authorized: true as const, user: data.user, supabase };
}
