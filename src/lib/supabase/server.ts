import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SerializeOptions } from "cookie";
import { cookies } from "next/headers";

type CookieOptions = Partial<SerializeOptions>;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) throw new Error("Missing required environment variable: SUPABASE_SECRET_KEY");
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    secretKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function createPublicSupabaseClient(): SupabaseClient {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
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
