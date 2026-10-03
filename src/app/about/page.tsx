import Image from "next/image";
import { coordinators } from "@/config/coordinators";
import { site } from "@/config/site";

export default function AboutPage() {
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">About NAVRANG</span><h1>A campus celebration, thoughtfully brought together.</h1><p>Student participation, cultural expression and the shared life of GEC Buxar—at the heart of one festive evening.</p></div></section>
    <section className="section"><div className="container"><div className="content-copy">
      <p><strong>NAVRANG 26</strong> is a student-oriented cultural celebration at {site.college}. Dandiya Night brings students together through traditional music and dance, cultural performances and a shared sense of campus community.</p>
      <p>The evening is intended to offer an organised, welcoming experience rooted in cultural expression and responsible celebration. Participants are asked to respect entry checks, campus decorum and the event team&apos;s guidance.</p>
      <p>Programme timings and coordinator details will be updated when confirmed. We will not publish unverified names, contact numbers or schedule information.</p>
    </div></div></section>
    <section className="section" style={{ background: "#eeede3" }}><div className="container">
      <span className="eyebrow">Event team</span><h2 className="display" style={{ fontSize: "clamp(37px,6vw,62px)", margin: "15px 0" }}>Coordinators</h2>
      <p className="coordinator-note">{coordinators.notice}</p>
      <div className="coordinator-grid">{coordinators.people.map((person, index) => <article className="coordinator-card" key={`${person.role}-${index}`}><Image src={person.image} alt="Portrait placeholder; photo to be added after confirmation" width={360} height={440} /><h3>{person.name}</h3><p>{person.role}{person.phone ? ` · ${person.phone}` : " · Details to be confirmed"}</p></article>)}</div>
    </div></section>
  </>;
}
