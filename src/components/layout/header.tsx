"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { navigation } from "@/config/navigation";
import { site } from "@/config/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand-lockup" href="/" aria-label="NAVRANG 26 home" onClick={() => setOpen(false)}>
          <Image src={site.logoPath} alt="Government Engineering College, Buxar" width={52} height={52} priority />
          <span><strong>{site.name}</strong><small>GEC BUXAR · 2026</small></span>
        </Link>
        <button className="menu-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
          {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
          <Link className="nav-pass" href="/get-pass" onClick={() => setOpen(false)}>Get Your Pass</Link>
          <Link className="button button-small" href="/register" onClick={() => setOpen(false)}>Register Now <span aria-hidden="true">↗</span></Link>
        </nav>
      </div>
    </header>
  );
}
