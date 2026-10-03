import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { EventCountdown } from "@/components/home/event-countdown";
import { PosterArt } from "@/components/ui/poster-art";
import { eventConfig } from "@/config/event";
import { posters } from "@/config/posters";
import { site } from "@/config/site";
import { getActiveEvent } from "@/lib/supabase/event";
import { formatRupees } from "@/lib/utils";

export const revalidate = 60;

export default async function HomePage() {
  const activeEvent = await getActiveEvent();
  const dateLabel = activeEvent?.event_date
    ? new Date(`${activeEvent.event_date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : eventConfig.dateLabel;
  const registrationFee = activeEvent?.registration_fee ?? eventConfig.defaultFee;

  return (
    <>
      <section className="hero">
        <div className="hero-ornament" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker"><span /> GOVERNMENT ENGINEERING COLLEGE, BUXAR</div>
            <h1 className="hero-title">{site.name}<span>{site.title.toUpperCase()}</span></h1>
            <p className="hero-note">{site.tagline}</p>
            <div className="hero-meta">
              <span>{dateLabel}</span><span className="meta-divider" /><span>{site.time}</span>
              <span className="meta-divider" /><span>{site.venue}</span>
            </div>
            <EventCountdown />
            <div className="hero-actions">
              <Link className="button" href="/register">Register Now <ArrowUpRight size={16} /></Link>
              <Link className="button button-outline" href="/get-pass">Get Your Pass</Link>
            </div>
          </div>
          <PosterArt poster={posters.hero} />
        </div>
      </section>
      <div className="intro-strip"><div className="container intro-strip-inner">
        <p>An evening of rhythm, colour and campus spirit.</p><span>Organised by the 2024 Batch</span>
      </div></div>

      <section className="section" id="event">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">The gathering</span>
            <h2>A little tradition.<br />A lot of togetherness.</h2>
            <p>NAVRANG 26 brings the campus together for an evening of Garba, cultural performances and a shared celebration.</p>
          </div>
          <div className="event-facts">
            <div className="fact"><div className="fact-label">Event</div><div className="fact-value">{activeEvent?.name ?? site.name}</div><div className="fact-sub">{site.title}</div></div>
            <div className="fact"><div className="fact-label">Date</div><div className="fact-value">{dateLabel}</div></div>
            <div className="fact"><div className="fact-label">Time</div><div className="fact-value">{site.time}</div></div>
            <div className="fact"><div className="fact-label">Venue</div><div className="fact-value">{site.venue}</div></div>
            <div className="fact"><div className="fact-label">Eligibility</div><div className="fact-value">B.Tech · 2023—2026</div><div className="fact-sub">Eligible batches</div></div>
            <div className="fact"><div className="fact-label">Registration</div><div className="fact-value">{formatRupees(registrationFee)} / head</div><div className="fact-sub">Per attendee</div></div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "#eeede3" }}>
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">What to look forward to</span>
            <h2>NAVRANG ’26 — Event Highlights</h2>
          </div>
          <div className="highlight-grid">
            {eventConfig.highlights.map(([title, description], index) => (
              <article className="highlight" key={title}><span className="highlight-number">0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
          <p className="toast-note space-top">Detailed programme schedule and performance timings will be announced soon.</p>
          <div className="space-top"><Link className="text-link" href="/activities">Explore the evening <span>→</span></Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container schedule-panel">
          <div className="schedule-aside"><span className="eyebrow" style={{ color: "#f2eccd" }}>An evening in motion</span><h2>One circle,<br />many moments.</h2><p>There is no published running order yet. We’ll share the detailed schedule closer to the evening.</p></div>
          <ol className="flow-list">
            {eventConfig.flow.map((item, index) => <li key={item}><span className="flow-no">0{index + 1}</span><span className="flow-title">{item}</span><span className="flow-time">Time to be announced</span></li>)}
          </ol>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-heading"><span className="eyebrow">ENTRY &amp; DISCIPLINE</span><h2>A celebration made successful by everyone.</h2><p>Help us make NAVRANG ’26 a safe, respectful and memorable celebration for everyone. All attendees are requested to follow the event guidelines, maintain campus discipline and cooperate with the organising team and college authorities.</p></div>
          <div className="rule-grid">
            {eventConfig.entryRules.map(([title, description]) => <article className="rule" key={title}><h3>{title}</h3><p>{description}</p></article>)}
          </div>
          <p className="toast-note space-top"><strong>Essential Facilities:</strong> Clean drinking water will be available at designated points across the venue. For accessibility, first-aid or other assistance, please approach the event help desk or organising team.</p>
        </div>
      </section>
      <section className="cta-band"><div className="container cta-band-inner"><div><h2>Meet us on the dance floor.</h2><p>Save your registration ID after submitting. Passes become available once payment is verified.</p></div><Link className="button button-light" href="/register">Start registration <ArrowUpRight size={16} /></Link></div></section>
    </>
  );
}
