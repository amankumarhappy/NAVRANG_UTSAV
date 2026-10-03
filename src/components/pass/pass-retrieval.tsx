"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { site } from "@/config/site";

type PassDetails = {
  registrationId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  qrToken: string;
  eventName?: string | null;
  eventTitle?: string;
  eventDate?: string | null;
  eventTime?: string | null;
  venue?: string | null;
};

type QRState = { token: string; value: string } | { token: string; error: true };

export function PassCard({ pass }: { pass: PassDetails }) {
  const [qrState, setQrState] = useState<QRState | null>(null);
  const qr = qrState?.token === pass.qrToken && "value" in qrState ? qrState.value : null;
  const qrError = qrState?.token === pass.qrToken && "error" in qrState;
  const eventDateLabel = pass.eventDate
    ? new Date(`${pass.eventDate.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : site.eventDateLabel;
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(pass.qrToken, { width: 320, margin: 1, color: { dark: "#202522", light: "#ffffff" } })
      .then((value) => { if (active) setQrState({ token: pass.qrToken, value }); })
      .catch(() => { if (active) setQrState({ token: pass.qrToken, error: true }); });
    return () => { active = false; };
  }, [pass.qrToken]);
  return <section className="lookup-result">
    <div className="pass-card">
      <div className="pass-top">
        <div className="pass-brand"><Image src={site.logoPath} alt="GEC Buxar" width={46} height={46} /><div><strong>{pass.eventName || site.name}</strong><span>GOVERNMENT ENGINEERING COLLEGE, BUXAR</span></div></div>
        <span className="pass-stamp">APPROVED ENTRY</span>
      </div>
      <h1 className="pass-heading">{pass.eventTitle || site.title}</h1>
      <div className="pass-subtitle">Digital entry pass · {eventDateLabel}</div>
      <div className="pass-content">
        <div className="pass-details">
          <div className="pass-detail"><small>Student</small><strong>{pass.fullName}</strong></div>
          <div className="pass-detail"><small>Registration ID</small><strong>{pass.registrationId}</strong></div>
          <div className="pass-detail"><small>Roll number</small><strong>{pass.rollNumber}</strong></div>
          <div className="pass-detail"><small>Branch</small><strong>{pass.branch}</strong></div>
          <div className="pass-detail"><small>Batch</small><strong>{pass.batch}</strong></div>
          <div className="pass-detail"><small>Venue</small><strong>{pass.venue || site.venue}</strong></div>
        </div>
        {qr ? <Image className="qr-image" src={qr} alt="Secure entry QR code" width={146} height={146} unoptimized /> : <div className="qr-image center" role="status">{qrError ? "QR unavailable" : "Preparing QR…"}</div>}
      </div>
      <div className="pass-footer"><span>Carry your valid College ID Card or Library Card.<br />Present this pass at the entry gate.</span><span>{eventDateLabel}<br />{pass.eventTime || site.time}</span></div>
    </div>
    <div className="print-button no-print">
      {qr && <a className="button button-outline" href={qr} download={`${pass.registrationId}-NAVRANG26-QR.png`}>Download QR</a>}
      <button className="button" onClick={() => window.print()}>Print pass</button>
    </div>
  </section>;
}

export function PassRetrieval() {
  const [registrationId, setRegistrationId] = useState("");
  const [identity, setIdentity] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string; message?: string; pass?: PassDetails } | null>(null);

  const retrieve = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/pass/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, identity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We could not retrieve your pass. Please try again.");
      setResult(data);
      if (data.status === "APPROVED") toast.success("Pass retrieved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not retrieve your pass. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <form className="lookup-form form-card" onSubmit={retrieve}>
      <div className="field"><label htmlFor="registration-id">Registration ID <span aria-hidden="true">*</span></label><input id="registration-id" required value={registrationId} onChange={(e) => setRegistrationId(e.target.value.toUpperCase())} autoComplete="off" placeholder="REG-XXXXXXXXXXXX" /></div>
      <div className="field"><label htmlFor="identity">Registered email or phone <span aria-hidden="true">*</span></label><input id="identity" required value={identity} onChange={(e) => setIdentity(e.target.value)} autoComplete="email" placeholder="Email address or phone number" /></div>
      <button className="button form-submit" disabled={busy}>{busy ? "Checking your details…" : "Get my pass"}</button>
      <p className="toast-note center space-top">Your registration ID alone is not enough to retrieve a pass.</p>
    </form>
    {result?.message && <div className={`lookup-result scanner-feedback ${result.status === "REJECTED" ? "error" : ""}`} role="status"><strong>{result.status === "PENDING" ? "PENDING VERIFICATION" : "REGISTRATION NOT APPROVED"}</strong><br />{result.message}</div>}
    {result?.pass && <PassCard pass={result.pass} />}
  </>;
}
