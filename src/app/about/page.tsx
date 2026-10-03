import { coordinators } from "@/config/coordinators";
import { site } from "@/config/site";

export default function AboutPage() {
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">About NAVRANG</span><h1>A campus celebration, thoughtfully brought together.</h1><p>Student participation, cultural expression and the shared life of GEC Buxar—at the heart of one festive evening.</p></div></section>
    <section className="section"><div className="container"><div className="content-copy">
      <p><strong>NAVRANG 26</strong> is a student-oriented cultural celebration organised by the 2024 batch at {site.college}. Dandiya Night brings students together through traditional music and dance, cultural performances and a shared sense of campus community.</p>
      <p>The evening is intended to offer an organised, welcoming experience rooted in cultural expression and responsible celebration. Participants are asked to respect entry checks, campus decorum and the event team&apos;s guidance.</p>
    </div></div></section>
    <section className="section" style={{ background: "#eeede3" }}><div className="container">
      <span className="eyebrow">Event team</span><h2 className="display" style={{ fontSize: "clamp(37px,6vw,62px)", margin: "15px 0" }}>Coordinators</h2>
      <p className="coordinator-note">{coordinators.notice}</p>
      <div className="coordinator-slots">{coordinators.slots.map((slot) => <section className="coordinator-slot" key={slot.name} aria-labelledby={`heading-${slot.name.toLowerCase().replace(" ", "-")}`}>
        <h3 id={`heading-${slot.name.toLowerCase().replace(" ", "-")}`}>{slot.name}</h3>
        <ol className="coordinator-list">{slot.people.map((person) => <li key={person.phone}><span>{person.name}</span><a href={`tel:+91${person.phone}`}>+91 {person.phone}</a></li>)}</ol>
      </section>)}</div>
      <section className="faculty-list" aria-labelledby="faculty-heading">
        <h3 id="faculty-heading">Faculty coordinators</h3>
        <div>{coordinators.faculty.map((name) => <p key={name}><span>{name}</span><small>To be finalised</small></p>)}</div>
      </section>
    </div></section>
  </>;
}
