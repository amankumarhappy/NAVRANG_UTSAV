"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PassCard } from "@/components/pass/pass-retrieval";

type Registration = {
  id: string; registration_id: string; full_name: string; roll_number: string; branch: string;
  batch: string; phone: string; email: string; college: string; transaction_id: string;
  amount_paid: number; payment_screenshot_url: string; status: string; pass_generated: boolean;
  qr_token?: string; created_at: string; updated_at: string;
};

export function RegistrationDetail({ registrationId }: { registrationId: string }) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/registrations/${encodeURIComponent(registrationId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Registration details could not be loaded.");
      setRegistration(data.registration);
      setError("");
    } catch (reasonError) {
      setError(reasonError instanceof Error ? reasonError.message : "Registration details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [registrationId]);
  useEffect(() => { void load(); }, [load]);

  const perform = async () => {
    if (!action || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/registrations/${encodeURIComponent(registrationId)}/action`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The registration could not be updated.");
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
      <a href={registration.payment_screenshot_url} target="_blank" rel="noreferrer" aria-label="Open private payment screenshot in a new tab">
        {/* A signed private-storage URL is dynamic per admin and intentionally bypasses the Next image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={registration.payment_screenshot_url} alt="Private payment screenshot for manual admin review" loading="lazy" decoding="async" style={{ display: "block", maxWidth: "100%", maxHeight: 620, width: "auto", height: "auto", objectFit: "contain", border: "1px solid var(--line)", background: "white" }} />
      </a>
      <p className="toast-note">This private signed link expires in five minutes.</p>
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
