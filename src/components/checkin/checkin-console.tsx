"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Check, CircleAlert, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type CheckinResult = {
  status: "ALLOWED" | "ALREADY_CHECKED_IN" | "INVALID" | "NOT_APPROVED";
  full_name?: string;
  registration_id?: string;
  branch?: string;
  batch?: string;
  checked_in_at?: string;
  message?: string;
};
type Candidate = {
  id: string; registration_id: string; full_name: string; roll_number: string;
  branch: string; batch: string; status: string; checked_in_at: string | null;
};

export function CheckinConsole() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanBusy = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("name");
  const [matches, setMatches] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);

  const checkToken = useCallback(async (token: string) => {
    if (scanBusy.current) return;
    scanBusy.current = true;
    setResult(null);
    try {
      const response = await fetch("/api/admin/checkin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data: CheckinResult & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? "QR validation could not be completed.");
      setResult(data);
      if (data.status === "ALLOWED") toast.success("Check-in successful");
      else if (data.status === "ALREADY_CHECKED_IN") toast.warning("Already checked in");
      else toast.error(data.status === "INVALID" ? "Invalid QR" : "Pass is not approved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "QR validation could not be completed.");
      setResult({ status: "INVALID", message: "Please try again or search the registration manually." });
    }
  }, []);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  const startScanner = async () => {
    setCameraError("");
    setResult(null);
    if (!videoRef.current) {
      setCameraError("Camera preview is unavailable. Please reload and try again.");
      return;
    }
    scanBusy.current = false;
    setScanning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (decoded) => {
        if (decoded) {
          void checkToken(decoded.getText());
          stopScanner();
        }
      });
      controlsRef.current = controls;
    } catch {
      setScanning(false);
      setCameraError("Camera could not be started. Allow camera access in your browser settings or search manually.");
    }
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  const loadMatches = useCallback(async () => {
    setSearching(true);
    setSelected(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ q: query, by: searchBy });
      const response = await fetch(`/api/admin/checkin/search?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Search could not be completed.");
      setMatches(data.rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search could not be completed.");
    } finally {
      setSearching(false);
    }
  }, [query, searchBy]);

  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadMatches();
  };

  const manualCheckin = async () => {
    if (!selected || !reason.trim()) return;
    setManualBusy(true);
    try {
      const response = await fetch("/api/admin/checkin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual: true, registrationId: selected.registration_id, reason }),
      });
      const data: CheckinResult & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Manual check-in could not be completed.");
      setResult(data);
      if (data.status === "ALLOWED") toast.success("Manual check-in successful");
      else if (data.status === "ALREADY_CHECKED_IN") toast.warning("Already checked in");
      await loadMatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Manual check-in could not be completed.");
    } finally {
      setManualBusy(false);
    }
  };

  const statusHeading = result?.status === "ALLOWED" ? "ENTRY ALLOWED"
    : result?.status === "ALREADY_CHECKED_IN" ? "ALREADY CHECKED IN"
      : result?.status === "NOT_APPROVED" ? "PASS NOT APPROVED"
        : "INVALID ENTRY PASS";

  return <div className="scanner-layout">
    <div className="section-heading"><span className="eyebrow">Gate operations</span><h2>NAVRANG 26<br />Entry check-in</h2><p>Scan the secure entry QR. The server checks approval status and records each check-in atomically.</p></div>
    <div className="scanner-window">
      <video ref={videoRef} aria-label="Camera view for scanning an entry pass QR code" muted playsInline />
      {!scanning && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 28, color: "white" }}>Position the pass QR inside the camera view.<br />Camera access is required.</div>}
    </div>
    {cameraError && <p className="form-locked" role="alert">{cameraError}</p>}
    {result && <div className={`scanner-feedback ${result.status === "INVALID" || result.status === "NOT_APPROVED" ? "error" : ""}`} role="status">
      <strong>{result.status === "ALLOWED" ? <Check size={17} aria-hidden="true" /> : result.status === "INVALID" || result.status === "NOT_APPROVED" ? <CircleAlert size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />} {statusHeading}</strong>
      {result.full_name && <p style={{ margin: "10px 0 0" }}>{result.full_name} · {result.registration_id}<br />{result.branch} · Batch {result.batch}</p>}
      {result.checked_in_at && <p className="toast-note">First check-in: {new Date(result.checked_in_at).toLocaleString()}</p>}
      {result.message && <p>{result.message}</p>}
    </div>}
    <div className="scanner-actions">
      {!scanning ? <button className="button" onClick={startScanner}>Start camera</button> : <button className="button button-outline" onClick={stopScanner}>Stop camera</button>}
    </div>
    <section className="section" style={{ paddingBlock: 48 }}>
      <h2 className="display" style={{ fontSize: 37 }}>Search manually</h2>
      <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>Find the participant by name, Registration ID or phone. Confirm their status before a manual check-in.</p>
      <form className="search-form" onSubmit={search}>
        <div className="field" style={{ flex: "2 1 240px" }}><label htmlFor="manual-search">Search</label><input id="manual-search" value={query} onChange={(e) => setQuery(e.target.value)} minLength={2} required placeholder="Name, REG ID or phone" /></div>
        <div className="field"><label htmlFor="search-by">Search by</label><select id="search-by" value={searchBy} onChange={(e) => setSearchBy(e.target.value)}><option value="name">Name</option><option value="registration">Registration ID</option><option value="phone">Phone</option></select></div>
        <button className="button button-small" disabled={searching}><Search size={15} />{searching ? "Searching…" : "Search"}</button>
      </form>
      {!!matches.length && <div className="table-wrap space-top"><table className="data-table"><thead><tr><th>Registration ID</th><th>Name</th><th>Branch / batch</th><th>Status</th><th>Check-in</th><th>Action</th></tr></thead><tbody>
        {matches.map((row) => <tr key={row.id}><td>{row.registration_id}</td><td>{row.full_name}<br /><span className="toast-note">{row.roll_number}</span></td><td>{row.branch} · {row.batch}</td><td><span className={`status-text status-${row.status.toLowerCase()}`}>{row.status}</span></td><td>{row.checked_in_at ? `Checked in · ${new Date(row.checked_in_at).toLocaleTimeString()}` : "Not checked in"}</td><td><button className="small-action" onClick={() => { setSelected(row); setReason(""); setResult(null); }}>Select</button></td></tr>)}
      </tbody></table></div>}
      {!searching && query.length >= 2 && matches.length === 0 && <p className="toast-note space-top">No matching registrations.</p>}
      {selected && <div className="lookup-result">
        <span className="eyebrow">Selected participant</span>
        <h3 className="display" style={{ fontSize: 29, margin: "12px 0" }}>{selected.full_name}</h3>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>{selected.registration_id} · {selected.roll_number}<br />{selected.branch} · Batch {selected.batch}<br />Status: <strong>{selected.status}</strong><br />{selected.checked_in_at ? `Already checked in: ${new Date(selected.checked_in_at).toLocaleString()}` : "Not checked in"}</p>
        {selected.status === "APPROVED" && !selected.checked_in_at && <>
          <div className="field"><label htmlFor="manual-reason">Manual check-in reason</label><input id="manual-reason" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Explain why QR scanning was not used" /></div>
          <button className="button" disabled={manualBusy || !reason.trim()} onClick={manualCheckin}>{manualBusy ? "Recording check-in…" : "Mark checked in"}</button>
        </>}
      </div>}
    </section>
  </div>;
}
