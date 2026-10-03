import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { Dashboard } from "@/components/admin/dashboard";
import { requireAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireAdmin();
  if (!auth.user) redirect("/admin/login?next=%2Fadmin");
  if (!auth.authorized) redirect("/403");
  return <div className="admin-shell"><AdminHeader /><div className="container"><Dashboard /></div></div>;
}
