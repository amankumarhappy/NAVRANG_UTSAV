import Link from "next/link";

export default function ForbiddenPage() {
  return <section className="container access-denied"><span className="eyebrow">Restricted area</span><h1>403</h1><p className="muted">This account is not authorised to access event operations.</p><Link className="button space-top" href="/">Return home</Link></section>;
}
