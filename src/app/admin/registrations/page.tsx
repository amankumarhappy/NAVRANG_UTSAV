import { AdminHeader } from "@/components/admin/admin-header";
import { RegistrationTable } from "@/components/admin/registration-table";

export const dynamic = "force-dynamic";

export default function AdminRegistrationsPage() {
  return <div className="admin-shell"><AdminHeader /><div className="container"><RegistrationTable /></div></div>;
}
