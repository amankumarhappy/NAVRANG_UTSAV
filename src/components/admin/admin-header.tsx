"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getFirebaseAuth, signOut as firebaseSignOut } from "@/lib/firebase/auth";

export function AdminHeader() {
  const router = useRouter();
  async function signOut() {
    try {
      await firebaseSignOut(getFirebaseAuth());
      router.replace("/admin/login");
    } catch {
      toast.error("Could not sign out. Please try again.");
    }
  }
  return <div className="admin-header"><div className="container admin-header-inner">
    <div className="admin-heading">NAVRANG 26 ADMIN<small>EVENT OPERATIONS · GEC BUXAR</small></div>
    <nav className="admin-nav" aria-label="Admin navigation">
      <Link href="/admin/registrations" style={{ color: "white", fontSize: 12 }}>Registrations</Link>
      <Link href="/admin/checkin" style={{ color: "white", fontSize: 12 }}>Check-in</Link>
      <button className="button button-small button-light" onClick={signOut}>Sign out</button>
    </nav>
  </div></div>;
}
