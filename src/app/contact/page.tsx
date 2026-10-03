import Link from "next/link";
import { Mail, Instagram, Linkedin, Phone } from "lucide-react";
import { site } from "@/config/site";

export default function ContactPage() {
  const contacts = [
    { label: "Official event email", value: site.contacts.officialEmail, href: site.contacts.officialEmail ? `mailto:${site.contacts.officialEmail}` : "", Icon: Mail },
    { label: "Student coordinator", value: site.contacts.studentCoordinator, href: site.contacts.studentCoordinator ? `tel:${site.contacts.studentCoordinator}` : "", Icon: Phone },
    { label: "Faculty coordinator", value: site.contacts.facultyCoordinator, href: site.contacts.facultyCoordinator ? `tel:${site.contacts.facultyCoordinator}` : "", Icon: Phone },
    { label: "Instagram", value: site.contacts.instagram, href: site.contacts.instagram, Icon: Instagram },
    { label: "LinkedIn", value: site.contacts.linkedin, href: site.contacts.linkedin, Icon: Linkedin },
    { label: "Other social", value: site.contacts.otherSocial, href: site.contacts.otherSocial, Icon: null },
  ].filter((contact) => contact.value && contact.href);
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">Get in touch</span><h1>We’re here to help.</h1><p>For questions about registration, payment verification or entry, please use the official event contact details once they are published.</p></div></section>
    <section className="section"><div className="container">
      {contacts.length ? <div className="rule-grid">{contacts.map(({ label, value, href, Icon }) => <article className="rule" key={label}>{Icon && <Icon size={19} aria-hidden="true" />}<h3>{label}</h3><Link className="text-link" href={href}>{value} <span>↗</span></Link></article>)}</div> : <div className="form-locked" style={{ maxWidth: 650 }}>Official contact information has not been confirmed yet. Please check back before publication; no unverified phone numbers or social links are listed here.</div>}
      <div className="space-top"><Link className="text-link" href="/faq">See frequently asked questions <span>→</span></Link></div>
    </div></section>
  </>;
}
