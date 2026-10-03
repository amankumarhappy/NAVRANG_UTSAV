import { Suspense } from "react";
import { AdminLogin } from "./admin-login";

export default function AdminLoginPage() {
  return <section className="container"><Suspense fallback={<div className="admin-login form-card">Loading sign in…</div>}><AdminLogin /></Suspense></section>;
}
