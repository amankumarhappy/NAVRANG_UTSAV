"use client";

import Link from "next/link";
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { eventConfig } from "@/config/event";
import { getFirebaseDatabase } from "@/lib/firebase/database";

type RegistrationRow = {
  registration_id: string; full_name: string; roll_number: string; branch: string; batch: string;
  phone: string; email: string; transaction_id: string; amount_paid: number; status: string; created_at: string;
  checked_in_at: string | null;
};

type FirebaseRegistration = {
  registrationId: string; fullName: string; rollNumber: string; branch: string; batch: string;
  phone: string; email: string; payment?: { utr?: string; amount?: number };
  status: string; createdAt?: number | string; checkedIn?: boolean; checkedInAt?: number | string | null;
};

export function RegistrationTable() {
  const [sourceRows, setSourceRows] = useState<RegistrationRow[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState("name");
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("created_at");
  const [direction, setDirection] = useState("desc");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      return onValue(ref(getFirebaseDatabase(), "registrations"), (snapshot) => {
        const records = snapshot.val() as Record<string, FirebaseRegistration> | null;
        setSourceRows(Object.values(records ?? {}).map((record) => ({
          registration_id: record.registrationId,
          full_name: record.fullName,
          roll_number: record.rollNumber,
          branch: record.branch,
          batch: record.batch,
          phone: record.phone,
          email: record.email,
          transaction_id: record.payment?.utr ?? "",
          amount_paid: record.payment?.amount ?? 0,
          status: record.status,
          created_at: typeof record.createdAt === "number" ? new Date(record.createdAt).toISOString() : String(record.createdAt ?? ""),
          checked_in_at: record.checkedInAt ? new Date(record.checkedInAt).toISOString() : null,
        })));
        setBusy(false);
      }, (listenerError) => {
        console.error("Firebase registrations listener failed", listenerError);
        setError("Registrations could not be loaded. Please try again.");
        setBusy(false);
      });
    } catch (listenerError) {
      console.error("Firebase registrations listener could not start", listenerError);
      queueMicrotask(() => {
        setError("Registrations could not be loaded. Please try again.");
        setBusy(false);
      });
    }
  }, []);

  const filteredRows = sourceRows.filter((row) => {
    const searchValues: Record<string, string> = {
      name: row.full_name,
      registration: row.registration_id,
      transaction: row.transaction_id,
      roll: row.roll_number,
      email: row.email,
      phone: row.phone,
    };
    const value = searchValues[searchBy] ?? row.full_name;
    const date = row.created_at.slice(0, 10);
    return (!search || value.toLowerCase().includes(search.trim().toLowerCase()))
      && (!status || row.status === status)
      && (!branch || row.branch === branch)
      && (!batch || row.batch === batch)
      && (!from || date >= from)
      && (!to || date <= to);
  }).sort((left, right) => {
    const comparison = String(left[sort as keyof RegistrationRow] ?? "").localeCompare(String(right[sort as keyof RegistrationRow] ?? ""), undefined, { numeric: true });
    return direction === "asc" ? comparison : -comparison;
  });
  const count = filteredRows.length;
  const rows = filteredRows.slice((page - 1) * 25, page * 25);

  const toggleSort = (key: string) => {
    setSort(key);
    setDirection(sort === key && direction === "desc" ? "asc" : "desc");
    setPage(1);
  };

  return <>
    <div className="admin-content">
      <h1 className="display" style={{ fontSize: 43, marginBottom: 23 }}>Registrations</h1>
      <div className="admin-toolbar">
        <input className="filter-control" aria-label="Search registrations" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="filter-control" aria-label="Search by" value={searchBy} onChange={(e) => setSearchBy(e.target.value)}><option value="name">Name</option><option value="registration">Registration ID</option><option value="transaction">Transaction ID</option><option value="roll">Roll number</option><option value="email">Email</option><option value="phone">Phone</option></select>
        <select className="filter-control" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select>
        <select className="filter-control" aria-label="Filter by branch" value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }}><option value="">All branches</option>{eventConfig.branches.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="filter-control" aria-label="Filter by batch" value={batch} onChange={(e) => { setBatch(e.target.value); setPage(1); }}><option value="">All batches</option>{eventConfig.eligibleBatches.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="toast-note">From <input className="filter-control" type="date" aria-label="From date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="toast-note">To <input className="filter-control" type="date" aria-label="To date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>
            <th><button className="small-action" onClick={() => toggleSort("registration_id")}>Registration ID</button></th>
            <th><button className="small-action" onClick={() => toggleSort("full_name")}>Name</button></th><th>Roll</th><th>Branch</th><th>Batch</th><th>Phone</th><th>Email</th><th>Transaction ID</th><th>Amount</th><th>Status</th><th><button className="small-action" onClick={() => toggleSort("created_at")}>Created at</button></th><th>Actions</th>
          </tr></thead>
          <tbody>{busy ? <tr><td className="table-empty" colSpan={12}>Loading registrations…</td></tr> : error ? <tr><td className="table-empty" colSpan={12}>{error}</td></tr> : rows.length === 0 ? <tr><td className="table-empty" colSpan={12}>No registrations match these filters.</td></tr> : rows.map((row) => <tr key={row.registration_id}>
            <td>{row.registration_id}</td><td>{row.full_name}</td><td>{row.roll_number}</td><td>{row.branch}</td><td>{row.batch}</td><td>{row.phone}</td><td>{row.email}</td><td>{row.transaction_id}</td><td>₹{row.amount_paid}</td><td><span className={`status-text status-${row.status.toLowerCase()}`}>{row.status}</span></td><td>{new Date(row.created_at).toLocaleDateString()}</td><td><Link className="small-action" href={`/admin/registrations/${encodeURIComponent(row.registration_id)}`}>Review</Link></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="pager"><span>{count} total · page {page} of {Math.max(1, Math.ceil(count / 25))}</span><div style={{ display: "flex", gap: 8 }}><button disabled={page <= 1 || busy} onClick={() => setPage(page - 1)}>Previous</button><button disabled={page >= Math.ceil(count / 25) || busy} onClick={() => setPage(page + 1)}>Next</button></div></div>
    </div>
  </>;
}
