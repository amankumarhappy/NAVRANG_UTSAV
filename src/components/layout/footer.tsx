"use client";

import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";

const links = [
  ["Registration", "/register"],
  ["Get Your Pass", "/get-pass"],
  ["Activities", "/activities"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"],
];

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand">
          <Image src={site.logoPath} alt="GEC Buxar logo" width={58} height={58} />
          <div><strong>{site.name}</strong><span>{site.title}</span><span>{site.venue}</span></div>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          <Link className="admin-link" href="/admin/login">Admin access</Link>
          <a className="github-link" href="https://github.com/amankumarhappy/NAVRANG_UTSAV" target="_blank" rel="noreferrer" aria-label="Meet the website developer on GitHub" title="Meet the website developer">
            <Github size={16} aria-hidden="true" />
          </a>
        </nav>
      </div>
      <div className="container footer-bottom"><span>© {site.year} NAVRANG · Government Engineering College, Buxar</span><span>Made for our campus, with care.</span></div>
    </footer>
  );
}
