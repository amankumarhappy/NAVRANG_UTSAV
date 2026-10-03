import { AdminHeader } from "@/components/admin/admin-header";
import { RegistrationDetail } from "@/components/admin/registration-detail";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationDetailsPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const { registrationId } = await params;
  return <div className="admin-shell"><AdminHeader /><div className="container"><RegistrationDetail registrationId={registrationId} /></div></div>;
}
