"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { site } from "@/config/site";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSafeReturnPath } from "@/lib/utils";

export function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
      });
      if (error || !data.user) throw new Error("Sign-in failed. Check your credentials and try again.");
      if (data.user.app_metadata?.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/403");
        return;
      }
      toast.success("Signed in");
      const next = searchParams.get("next");
      router.replace(next && isSafeReturnPath(next) && next.startsWith("/admin") ? next : "/admin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="form-card admin-login">
    <Image src={site.logoPath} alt="Government Engineering College, Buxar" width={68} height={68} />
    <span className="eyebrow">Event operations</span><h1 className="display" style={{ fontSize: 42, margin: "13px 0 8px" }}>Admin sign in</h1>
    <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>Use an existing GEC Buxar event admin account. Admin access is managed in Supabase Auth.</p>
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
      <button className="button form-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  </div>;
}
