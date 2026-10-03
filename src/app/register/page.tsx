import Image from "next/image";
import QRCode from "qrcode";
import { PosterArt } from "@/components/ui/poster-art";
import { RegistrationForm } from "@/components/registration/registration-form";
import { eventConfig } from "@/config/event";
import { posters } from "@/config/posters";
import { site } from "@/config/site";
import { getActiveEventResult } from "@/lib/supabase/event";
import { formatRupees } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const { event, status } = await getActiveEventResult();
  const hasConfirmedFee = event?.registration_fee !== undefined && event.registration_fee !== null;
  const fee = event?.registration_fee ?? eventConfig.defaultFee;
  const hasOfficialUpi = !!site.upi.id.trim() && !!site.upi.name.trim();
  const active = status === "ready" && hasConfirmedFee && hasOfficialUpi;
  const unavailableMessage = status === "unconfigured"
    ? "Registration setup is being completed. Please check back shortly."
    : status === "unavailable"
      ? "We’re temporarily unable to load registration details. Please try again shortly."
      : status === "not-found"
        ? "Registration details are not available yet. Please check back shortly."
        : status === "closed"
          ? "Registration for this event is currently closed."
          : !hasConfirmedFee
            ? "Registration is temporarily unavailable because the event fee has not been confirmed."
            : !hasOfficialUpi
              ? "Registration will open once the official UPI ID and name are confirmed."
              : null;
  const paymentUri = site.upi.id.trim() && site.upi.name.trim()
    ? `upi://pay?${new URLSearchParams({ pa: site.upi.id, pn: site.upi.name, cu: "INR" })}`
    : "";
  const paymentQr = paymentUri
    ? await QRCode.toDataURL(paymentUri, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#32100e", light: "#fff8ec" },
      })
    : null;
  const dateLabel = event?.event_date
    ? new Date(`${event.event_date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : eventConfig.dateLabel;
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">Registration · NAVRANG 26</span><h1>Your evening starts here.</h1><p>Complete your details and payment information. The event team will manually verify your payment before approving your pass.</p></div></section>
    <section className="section"><div className="container form-layout">
      <aside className="form-side">
        <PosterArt poster={posters.registration} />
        <h2>One step closer to the circle.</h2>
        <p>{site.title} · {dateLabel} · {site.venue}</p>
        <div className="payment-card">
          <strong>Registration fee</strong>
          <div className="payment-fee">{formatRupees(fee)}</div>
          <p>{hasConfirmedFee ? "per student · confirmed by the event record" : "configured guide price · awaiting event confirmation"}</p>
          {!hasConfirmedFee && <p className="fee-note">The server uses the fee saved in Supabase. Confirm the active event before paying.</p>}
          <p style={{ marginTop: 16 }}><strong>Official UPI name</strong>{site.upi.name || "Not yet confirmed — do not pay until the official UPI name is published."}</p>
          <p><strong>UPI ID</strong>{site.upi.id || "Not yet configured — do not pay until the official UPI ID is published."}</p>
          <p className="payment-verification-warning" role="note">Verify the UPI name before making payment.</p>
          {paymentQr && <div className="payment-qr">
            <Image src={paymentQr} alt={`UPI payment QR for ${site.upi.id}`} width={224} height={224} unoptimized />
            <span>Scan with any UPI app</span>
            <a className="text-link" href={paymentUri}>Open UPI app <span aria-hidden="true">↗</span></a>
          </div>}
          <ol className="payment-steps"><li>Pay the fee using the official UPI details.</li><li>Keep the transaction/UTR number.</li><li>Take a clear payment screenshot.</li><li>Complete the form and upload the screenshot.</li><li>Wait for manual payment verification.</li></ol>
        </div>
        <p className="toast-note">Payment does not immediately confirm registration. Your status stays pending until reviewed.</p>
      </aside>
      <div>
        {unavailableMessage && <p className="form-locked" role="status">{unavailableMessage}</p>}
        <RegistrationForm fee={fee} eventActive={active} />
      </div>
    </div></section>
  </>;
}
