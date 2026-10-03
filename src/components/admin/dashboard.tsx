"use client";

import Link from "next/link";
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { getFirebaseDatabase } from "@/lib/firebase/database";

type Stats = { total: number; pending: number; approved: number; rejected: number; checkedIn: number };

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      return onValue(ref(getFirebaseDatabase(), "registrations"), (snapshot) => {
        const records = Object.values(snapshot.val() ?? {}) as { status?: string; checkedIn?: boolean }[];
        setStats({
          total: records.length,
          pending: records.filter((record) => record.status === "PENDING").length,
          approved: records.filter((record) => record.status === "APPROVED").length,
          rejected: records.filter((record) => record.status === "REJECTED").length,
          checkedIn: records.filter((record) => record.checkedIn).length,
        });
        setError("");
      }, (reason: Error) => {
        console.error("Firebase admin stats listener failed", reason);
        setError("Dashboard statistics could not be loaded.");
      });
    } catch (reason) {
      console.error("Firebase admin stats listener could not start", reason);
      queueMicrotask(() => setError("Dashboard statistics could not be loaded."));
    }
  }, []);
  const cards: [string, keyof Stats][] = [["TOTAL REGISTRATIONS", "total"], ["PENDING", "pending"], ["APPROVED", "approved"], ["REJECTED", "rejected"], ["CHECKED IN", "checkedIn"]];
  return <div className="admin-content">
    <div className="admin-stats">{cards.map(([label, key]) => <div className="stat-card" key={key}><span>{label}</span><strong>{stats ? stats[key] : "—"}</strong></div>)}</div>
    {error && <p className="form-locked" role="alert">{error}</p>}
    {!stats && !error && <p className="muted" role="status">Loading event figures…</p>}
    <div className="rule-grid">
      <article className="rule"><h3>Payment review</h3><p>Open a registration to inspect the private payment screenshot and transaction information before changing its status.</p><Link className="text-link space-top" href="/admin/registrations">Review registrations →</Link></article>
      <article className="rule"><h3>Gate operations</h3><p>Use the mobile-friendly QR scanner or search a participant manually at the event entrance.</p><Link className="text-link space-top" href="/admin/checkin">Open check-in →</Link></article>
      <article className="rule"><h3>Actions are recorded</h3><p>Approval, rejection, manual approval and check-in changes are performed by secure database functions and written to the audit log.</p></article>
    </div>
  </div>;
}
