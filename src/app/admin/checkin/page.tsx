import { AdminHeader } from "@/components/admin/admin-header";
import { CheckinConsole } from "@/components/checkin/checkin-console";

export const dynamic = "force-dynamic";

export default function AdminCheckinPage() {
  return <div className="admin-shell"><AdminHeader /><div className="container admin-content"><CheckinConsole /></div></div>;
}
