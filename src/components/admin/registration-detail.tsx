"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { get, push, ref, update } from "firebase/database";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { isAdminEmail } from "@/config/firebase-admins";
import { site } from "@/config/site";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { getFirebaseDatabase } from "@/lib/firebase/database";
import { hashIdentity, newOpaqueId } from "@/lib/firebase/registrations";
import { PassCard } from "@/components/pass/pass-retrieval";

type Registration = {
  id: string; registration_id: string; full_name: string; roll_number: string; branch: string;
  batch: string; phone: string; email: string; college: string; transaction_id: string;
  amount_paid: number; payment_screenshot_url: string; status: string; pass_generated: boolean;
  qr_token?: string; created_at: string; updated_at: string;
};

async function fetchRegistration(registrationId: string): Promise<Registration> {
  const database = getFirebaseDatabase();
  const snapshot = await get(ref(database, `registrations/${registrationId}`));
  const record = snapshot.val();
  if (!record || record.registrationId !== registrationId) throw new Error("Registration details could not be loaded.");
  const screenshotPath = String(record.payment?.screenshotPath ?? "").replace(/^\/+/, "");
  const screenshot = screenshotPath ? await get(ref(database, screenshotPath)) : null;
  const createdAt = record.createdAt;
  const updatedAt = record.updatedAt;
  return {
    id: registrationId,
    registration_id: registrationId,
    full_name: record.fullName,
    roll_number: record.rollNumber,
    branch: record.branch,
    batch: record.batch,
    phone: record.phone,
    email: record.email,
    college: record.college,
    transaction_id: record.payment?.utr ?? "",
    amount_paid: record.payment?.amount ?? 0,
    payment_screenshot_url: screenshot?.val()?.dataUrl ?? "",
    status: record.status,
    pass_generated: record.passGenerated === true,
    qr_token: record.qrToken ?? undefined,
    created_at: new Date(typeof createdAt === "number" ? createdAt : Date.parse(createdAt)).toISOString(),
    updated_at: new Date(typeof updatedAt === "number" ? updatedAt : Date.parse(updatedAt)).toISOString(),
  };
}

export function RegistrationDetail({ registrationId }: { registrationId: string }) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loadedRegistrationId, setLoadedRegistrationId] = useState<string | null>(null);
  const loading = loadedRegistrationId !== registrationId;
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRegistration(await fetchRegistration(registrationId));
      setError("");
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "Registration details could not be loaded.");
    }
  }, [registrationId]);
  useEffect(() => {
    let active = true;
    fetchRegistration(registrationId)
      .then((data) => {
        if (!active) return;
        setRegistration(data);
        setError("");
        setLoadedRegistrationId(registrationId);
      })
      .catch((reasonError: unknown) => {
        if (!active) return;
        setError(reasonError instanceof Error ? reasonError.message : "Registration details could not be loaded.");
        setLoadedRegistrationId(registrationId);
      });
    return () => { active = false; };
  }, [registrationId]);

  const perform = async () => {
    if (!action || busy) return;
    setBusy(true);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user || !isAdminEmail(user.email)) throw new Error("Access denied.");
      if (action === "MANUAL_APPROVE" && !reason.trim()) throw new Error("A manual approval reason is required.");
      const database = getFirebaseDatabase();
      const path = `registrations/${registrationId}`;
      const snapshot = await get(ref(database, path));
      const record = snapshot.val();
      if (!record) throw new Error("Registration not found.");
      if (["APPROVE", "MANUAL_APPROVE", "REJECT"].includes(action) && record.status !== "PENDING") {
        throw new Error("Only pending registrations can be updated.");
      }
      if (action === "REISSUE" && record.status !== "APPROVED") throw new Error("Only approved registrations can have a pass reissued.");

      const approved = action === "APPROVE" || action === "MANUAL_APPROVE" || action === "REISSUE";
      const nextStatus = action === "REJECT" ? "REJECTED" : approved ? "APPROVED" : record.status;
      const nextQrToken = approved ? newOpaqueId(32) : null;
      const timestamp = Date.now();
      const eventFields = { eventName: site.name, eventTitle: site.title, eventDate: site.eventDateLabel, eventTime: site.time, venue: site.venue };
      const pass = approved ? {
        registrationId,
        fullName: record.fullName,
        rollNumber: record.rollNumber,
        branch: record.branch,
        batch: record.batch,
        qrToken: nextQrToken,
        ...eventFields,
      } : null;
      const emailHash = await hashIdentity(String(record.email).trim().toLowerCase());
      const phoneHash = await hashIdentity(String(record.phone).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""));
      const actionName = action === "MANUAL_APPROVE" ? "MANUAL_APPROVED" : action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "PASS_REISSUED";
      const auditRef = push(ref(database, "auditLogs"));
      if (!auditRef.key) throw new Error("Audit record could not be created.");
      const updates: Record<string, unknown> = {
        [`${path}/status`]: nextStatus,
        [`${path}/qrToken`]: nextQrToken,
        [`${path}/passGenerated`]: approved,
        [`${path}/updatedAt`]: timestamp,
        [`${path}/verifiedAt`]: approved || action === "REJECT" ? timestamp : null,
        [`${path}/verifiedBy`]: approved || action === "REJECT" ? user.email : null,
        [`passLookups/${registrationId}/${emailHash}`]: approved
          ? { status: "APPROVED", pass }
          : { status: nextStatus, message: action === "REJECT" ? "Your registration was not approved. Contact the event team." : "Payment verification is pending. Your entry pass will be issued after approval." },
        [`passLookups/${registrationId}/${phoneHash}`]: approved
          ? { status: "APPROVED", pass }
          : { status: nextStatus, message: action === "REJECT" ? "Your registration was not approved. Contact the event team." : "Payment verification is pending. Your entry pass will be issued after approval." },
        [`auditLogs/${auditRef.key}`]: { registrationId, action: actionName, adminEmail: user.email, reason: reason.trim() || null, timestamp },
      };
      if (record.qrToken) updates[`publicPasses/${record.qrToken}`] = null;
      if (pass && nextQrToken) updates[`publicPasses/${nextQrToken}`] = { ...pass, status: "APPROVED" };
      await update(ref(database), updates);
      toast.success(action === "REJECT" ? "Registration rejected" : action === "REISSUE" ? "Pass reissued" : "Payment approved");
      setDialogOpen(false);
      setReason("");
      setAction("");
      setShowPass(false);
      await load();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "The registration could not be updated.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="admin-content" role="status">Loading private registration details…</div>;
  if (error || !registration) return <div className="admin-content"><p className="form-locked" role="alert">{error || "Registration not found."}</p><Link className="text-link space-top" href="/admin/registrations">← Back to registrations</Link></div>;

  const details: [string, string][] = [
    ["Registration ID", registration.registration_id], ["Full name", registration.full_name],
    ["Roll number", registration.roll_number], ["Branch", registration.branch], ["Batch", registration.batch],
    ["Phone", registration.phone], ["Email", registration.email], ["College", registration.college],
    ["Transaction ID", registration.transaction_id], ["Amount paid", `₹${registration.amount_paid}`],
    ["Current status", registration.status], ["Created at", new Date(registration.created_at).toLocaleString()],
    ["Updated at", new Date(registration.updated_at).toLocaleString()],
  ];

  return <div className="admin-content">
    <Link className="text-link" href="/admin/registrations">← All registrations</Link>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", margin: "20px 0" }}>
      <div><span className="eyebrow">Payment review</span><h1 className="display" style={{ fontSize: "clamp(34px,6vw,54px)", margin: "10px 0" }}>{registration.full_name}</h1><span className={`status-text status-${registration.status.toLowerCase()}`}>{registration.status}</span></div>
      <div className="row-actions">
        {registration.status === "PENDING" && <>
          <button className="button button-small" onClick={() => { setAction("APPROVE"); setDialogOpen(true); }}>Approve</button>
          <button className="button button-small" style={{ background: "var(--maroon)", borderColor: "var(--maroon)" }} onClick={() => { setAction("REJECT"); setDialogOpen(true); }}>Reject</button>
          <button className="button button-small button-outline" onClick={() => { setAction("MANUAL_APPROVE"); setDialogOpen(true); }}>Manual approve</button>
        </>}
        {registration.status === "APPROVED" && <button className="button button-small button-outline" onClick={() => setShowPass(!showPass)}>{showPass ? "Hide pass" : "View pass"}</button>}
        {registration.status === "APPROVED" && <button className="button button-small button-outline" onClick={() => { setAction("REISSUE"); setDialogOpen(true); }}>Reissue pass</button>}
        <button className="button button-small button-outline" onClick={() => { navigator.clipboard.writeText(registration.registration_id).then(() => toast.success("Registration ID copied")).catch(() => toast.error("Could not copy the Registration ID.")); }}>Copy ID</button>
      </div>
    </div>
    <div className="event-facts admin-detail-facts">{details.map(([label, value]) => <div className="fact" key={label}><div className="fact-label">{label}</div><div className="fact-sub" style={{ color: "var(--ink)", fontSize: 13, marginTop: 9, overflowWrap: "anywhere" }}>{value}</div></div>)}</div>
    <section className="section" style={{ paddingBlock: 36 }}>
      <h2 className="display" style={{ fontSize: 34 }}>Payment screenshot</h2>
      {registration.payment_screenshot_url ? <a href={registration.payment_screenshot_url} target="_blank" rel="noreferrer" aria-label="Open private payment screenshot in a new tab">
        {/* A signed private-storage URL is dynamic per admin and intentionally bypasses the Next image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={registration.payment_screenshot_url} alt="Private payment screenshot for manual admin review" loading="lazy" decoding="async" style={{ display: "block", maxWidth: "100%", maxHeight: 620, width: "auto", height: "auto", objectFit: "contain", border: "1px solid var(--line)", background: "white" }} />
      </a> : <p className="form-locked" role="status">No payment screenshot is attached to this registration.</p>}
      <p className="toast-note">Screenshots are loaded only for the registration under review.</p>
    </section>
    {showPass && registration.qr_token && <PassCard pass={{ registrationId: registration.registration_id, fullName: registration.full_name, rollNumber: registration.roll_number, branch: registration.branch, batch: registration.batch, qrToken: registration.qr_token }} />}
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(20,25,22,.62)", zIndex: 30 }} />
        <Dialog.Content aria-describedby="action-description" style={{ position: "fixed", zIndex: 31, inset: "50% auto auto 50%", transform: "translate(-50%,-50%)", width: "min(92vw,480px)", padding: 28, background: "var(--paper)", border: "1px solid var(--line)" }}>
          <Dialog.Title className="display" style={{ fontSize: 30 }}>{action === "MANUAL_APPROVE" ? "Manual approval" : action === "REJECT" ? "Reject registration" : action === "REISSUE" ? "Reissue pass" : "Approve payment"}</Dialog.Title>
          <Dialog.Description id="action-description" className="muted" style={{ fontSize: 12, lineHeight: 1.7, marginTop: 12 }}>
            {action === "MANUAL_APPROVE" ? "Manual approval should only be used after payment has been verified through the authorized process." : action === "REJECT" ? "Reject this registration after reviewing the payment. A reason is optional." : action === "REISSUE" ? "Create a replacement secure pass token for this approved registration. The previous QR will no longer work." : "Confirm that the payment details and screenshot have been verified."}
          </Dialog.Description>
          {(action === "REJECT" || action === "MANUAL_APPROVE") && <div className="field" style={{ marginTop: 20 }}><label htmlFor="action-reason">{action === "MANUAL_APPROVE" ? "Reason (required)" : "Reason (optional)"}</label><textarea id="action-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} /></div>}
          <div className="success-actions" style={{ justifyContent: "flex-end" }}>
            <Dialog.Close asChild><button className="button button-outline button-small">Cancel</button></Dialog.Close>
            <button className="button button-small" disabled={busy || (action === "MANUAL_APPROVE" && !reason.trim())} onClick={perform}>{busy ? "Working…" : "Confirm"}</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
