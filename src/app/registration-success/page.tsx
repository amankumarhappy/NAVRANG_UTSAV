import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { site } from "@/config/site";

export default async function RegistrationSuccessPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <div className="container">
    <section className="success-box">
      <Image src={site.logoPath} alt="Government Engineering College, Buxar" width={64} height={64} style={{ objectFit: "contain", marginBottom: 18 }} />
      <div className="success-icon"><Check size={24} aria-hidden="true" /></div>
      <span className="eyebrow">Registration received</span>
      <h1>Registration Received</h1>
      <p>Your registration has been received. Your payment will be manually verified by the event team. Your entry pass will become available after approval.</p>
      <div className="registration-code">{id || "ID unavailable"}</div>
      <span className="status-pill">PENDING VERIFICATION</span>
      <p>Your entry pass will become available after approval. You can return later and retrieve it using this Registration ID plus your registered email or phone.</p>
      <strong>Please save your Registration ID.</strong>
      <div className="success-actions"><Link className="button" href="/get-pass">Get My Pass Later</Link><Link className="button button-outline" href="/">Return Home</Link></div>
    </section>
  </div>;
}
