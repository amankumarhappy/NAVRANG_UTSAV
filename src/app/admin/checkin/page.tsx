import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { CheckinConsole } from "@/components/checkin/checkin-console";
import { requireAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCheckinPage() {
  const auth = await requireAdmin();
  if (!auth.user) redirect("/admin/login?next=%2Fadmin%2Fcheckin");
  if (!auth.authorized) redirect("/403");
  return <div className="admin-shell"><AdminHeader /><div className="container admin-content"><CheckinConsole /></div></div>;
}
