import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { RegistrationTable } from "@/components/admin/registration-table";
import { requireAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const auth = await requireAdmin();
  if (!auth.user) redirect("/admin/login?next=%2Fadmin%2Fregistrations");
  if (!auth.authorized) redirect("/403");
  return <div className="admin-shell"><AdminHeader /><div className="container"><RegistrationTable /></div></div>;
}
