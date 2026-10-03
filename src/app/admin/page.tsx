import { AdminHeader } from "@/components/admin/admin-header";
import { Dashboard } from "@/components/admin/dashboard";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <div className="admin-shell"><AdminHeader /><div className="container"><Dashboard /></div></div>;
}
