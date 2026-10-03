import Link from "next/link";

export default function NotFound() {
  return <section className="container access-denied"><span className="eyebrow">This page is missing</span><h1>404</h1><p className="muted">The page may have moved or the address may be incorrect.</p><Link className="button space-top" href="/">Return home</Link></section>;
}
