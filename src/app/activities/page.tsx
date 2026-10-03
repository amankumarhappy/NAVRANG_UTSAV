import { PosterArt } from "@/components/ui/poster-art";
import { posters } from "@/config/posters";
import { eventConfig } from "@/config/event";

export default function ActivitiesPage() {
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">The evening</span><h1>Culture in motion.</h1><p>A considered programme of ceremony, performance and Garba. Detailed programme timings will be announced soon.</p></div></section>
    <section className="section"><div className="container">
      <div className="activity-list">{eventConfig.activities.map(([title, detail], index) => <article className="activity-row" key={title}><span className="row-number">0{index + 1}</span><h2>{title}</h2><p>{detail}</p></article>)}</div>
      <p className="toast-note space-top">Detailed schedule will be updated soon. Time to be announced for each programme.</p>
    </div></section>
    <section className="section" style={{ background: "#eeede3" }}><div className="container editorial-split">
      <div><span className="eyebrow">A note on the visuals</span><h2 className="display" style={{ fontSize: "clamp(35px,5vw,58px)", margin: "15px 0" }}>Official artwork is on its way.</h2><p className="content-copy">These illustrated placeholders keep the event identity in place without using unofficial photography or posters. The artwork can be replaced as soon as the approved designs are ready.</p></div>
      <PosterArt poster={posters.activity} />
    </div></section>
  </>;
}
