"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdminEmail } from "@/config/firebase-admins";
import { getFirebaseAuth } from "@/lib/firebase/auth";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAuthorized(false);
        setChecked(true);
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!isAdminEmail(user.email)) {
        void signOut(auth).finally(() => router.replace("/403"));
        setAuthorized(false);
        setChecked(true);
        return;
      }
      setAuthorized(true);
      setChecked(true);
    });
  }, [isLoginPage, pathname, router]);

  if (isLoginPage || (checked && authorized)) return children;
  return <div className="container admin-content" role="status">Checking administrator access…</div>;
}