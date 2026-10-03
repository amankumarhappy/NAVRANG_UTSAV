import { faqs } from "@/config/faq";
import { getActiveEvent } from "@/lib/supabase/event";

export const revalidate = 60;

export default async function FAQPage() {
  const event = await getActiveEvent();
  const eventDateAnswer = event?.event_date
    ? `The event is on ${new Date(`${event.event_date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}, from 3:00 PM to 8:00 PM.`
    : faqs.find(([question]) => question === "When is the event?")?.[1] ?? "";
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">Good to know</span><h1>Frequently asked.</h1><p>Clear details for your NAVRANG ’26 evening.</p></div></section>
    <section className="section"><div className="container"><div className="faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{question === "When is the event?" ? eventDateAnswer : answer}</p></details>)}</div></div></section>
  </>;
}
