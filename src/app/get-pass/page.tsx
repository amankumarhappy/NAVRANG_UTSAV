import { PassRetrieval } from "@/components/pass/pass-retrieval";

export default function GetPassPage() {
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">Approved registrations</span><h1>Your pass, when you need it.</h1><p>Enter your Registration ID and the email or phone number used for registration. Pending registrations do not have a pass yet.</p></div></section>
    <section className="section"><div className="container"><PassRetrieval /></div></section>
  </>;
}
