import Link from "next/link";
import { Mail, Instagram, Linkedin, MapPin, Map, Phone } from "lucide-react";
import { coordinators } from "@/config/coordinators";
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

  const campusAddress = "Mahdah, Itarhi Road, adjacent to the Police Line, Buxar, Bihar – 802103";
  const campusMapUrl = "https://www.google.com/maps/search/?api=1&query=Government+Engineering+College+GEC+Buxar";

  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">Get in touch</span><h1>We’re here to help.</h1><p>For questions about registration, payment verification or entry, please use the official event contact details once they are published.</p></div></section>
    <section className="section"><div className="container">
      <div className="space-bottom" style={{ marginBottom: 22 }}>
        <h2 className="display" style={{ fontSize: "clamp(30px,5vw,44px)", marginBottom: 12 }}>Coordinators</h2>
        <div className="coordinator-slots" style={{ marginTop: 12 }}>
          {coordinators.slots.map((slot) => (
            <section className="coordinator-slot" key={slot.name} aria-label={slot.name}>
              <h3>{slot.name}</h3>
              <ol className="coordinator-list">
                {slot.people.map((person) => (
                  <li key={`${slot.name}-${person.phone}`}><span>{person.name}</span><a href={`tel:+91${person.phone}`}>+91 {person.phone}</a></li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <section className="faculty-list" aria-label="Faculty coordinators" style={{ marginTop: 28 }}>
          <h3>Faculty coordinators</h3>
          <div>
            {coordinators.faculty.map((name) => <p key={name}><span>{name}</span><small>To be finalised</small></p>)}
          </div>
        </section>
      </div>

      <div className="campus-card" aria-label="Campus address and map information">
        <div className="campus-card-icon"><Map size={20} aria-hidden="true" /></div>
        <div>
          <p className="campus-card-label">Campus location</p>
          <h3>Government Engineering College (GEC), Buxar</h3>
          <p>{campusAddress}</p>
        </div>
        <a className="button button-small button-light" href={campusMapUrl} target="_blank" rel="noreferrer">
          <MapPin size={15} aria-hidden="true" />
          Google Maps
        </a>
      </div>

      {contacts.length ? <div className="rule-grid">{contacts.map(({ label, value, href, Icon }) => <article className="rule" key={label}>{Icon && <Icon size={19} aria-hidden="true" />}<h3>{label}</h3><Link className="text-link" href={href}>{value} <span>↗</span></Link></article>)}</div> : <div className="form-locked" style={{ maxWidth: 650 }}>Official contact information has not been confirmed yet. Please check back before publication; no unverified phone numbers or social links are listed here.</div>}
      <div className="space-top"><Link className="text-link" href="/faq">See frequently asked questions <span>→</span></Link></div>
    </div></section>
  </>;
}
