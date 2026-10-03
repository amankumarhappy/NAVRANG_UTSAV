import { equalTo, get, onValue, orderByChild, push, query, ref, runTransaction, update } from "firebase/database";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { isAdminEmail } from "@/config/firebase-admins";
import { getFirebaseDatabase } from "@/lib/firebase/database";

export type FirebaseCheckinResult = {
  status: "ALLOWED" | "ALREADY_CHECKED_IN" | "INVALID" | "NOT_APPROVED";
  full_name?: string;
  registration_id?: string;
  branch?: string;
  batch?: string;
  checked_in_at?: string;
  message?: string;
};

type RegistrationRecord = {
  registrationId: string;
  fullName: string;
  rollNumber: string;
  branch: string;
  batch: string;
  status: string;
  passGenerated: boolean;
  checkedIn?: boolean;
  checkedInAt?: number | null;
};

export type FirebaseCheckinCandidate = {
  id: string;
  registration_id: string;
  full_name: string;
  roll_number: string;
  branch: string;
  batch: string;
  status: string;
  checked_in_at: string | null;
};

function requireAdmin() {
  const user = getFirebaseAuth().currentUser;
  if (!user || !isAdminEmail(user.email)) throw new Error("Access denied.");
  return user;
}

async function commitCheckin(registrationId: string, manual: boolean, reason: string): Promise<FirebaseCheckinResult> {
  const user = requireAdmin();
  if (manual && !reason.trim()) throw new Error("A reason is required for manual check-in.");
  const database = getFirebaseDatabase();
  const registrationRef = ref(database, `registrations/${registrationId}`);
  let timestamp = 0;
  const result = await runTransaction(registrationRef, (record: RegistrationRecord | null) => {
    if (!record || record.status !== "APPROVED" || !record.passGenerated || record.checkedIn) return;
    timestamp = Date.now();
    return { ...record, checkedIn: true, checkedInAt: timestamp, checkedInBy: user.email };
  }, { applyLocally: false });

  const record = result.snapshot.val() as RegistrationRecord | null;
  if (!record) return { status: "INVALID", message: "This entry pass could not be verified." };
  if (record.status !== "APPROVED" || !record.passGenerated) {
    return { status: "NOT_APPROVED", message: "This registration does not have an approved entry pass." };
  }
  if (!result.committed) {
    return {
      status: "ALREADY_CHECKED_IN",
      full_name: record.fullName,
      registration_id: registrationId,
      branch: record.branch,
      batch: record.batch,
      checked_in_at: record.checkedInAt ? new Date(record.checkedInAt).toISOString() : undefined,
    };
  }

  const auditRef = push(ref(database, "auditLogs"));
  if (!auditRef.key) throw new Error("Check-in audit record could not be created.");
  try {
    await update(ref(database), {
      [`checkins/${registrationId}`]: {
        registrationId,
        checkedIn: true,
        checkedInAt: timestamp,
        checkedInBy: user.email,
        ...(manual ? { reason: reason.trim() } : {}),
      },
      [`auditLogs/${auditRef.key}`]: {
        registrationId,
        action: manual ? "MANUAL_CHECKED_IN" : "CHECKED_IN",
        adminEmail: user.email,
        reason: manual ? reason.trim() : null,
        timestamp,
      },
    });
  } catch (error) {
    console.error("Firebase check-in audit update failed", error);
    throw new Error("Check-in was recorded, but the audit log could not be updated. Contact the event team.");
  }

  return {
    status: "ALLOWED",
    full_name: record.fullName,
    registration_id: registrationId,
    branch: record.branch,
    batch: record.batch,
    checked_in_at: new Date(timestamp).toISOString(),
  };
}

export async function checkinByQrToken(token: string) {
  const database = getFirebaseDatabase();
  const records = await get(query(ref(database, "registrations"), orderByChild("qrToken"), equalTo(token)));
  const result = records.val() as Record<string, RegistrationRecord> | null;
  const entry = result && Object.entries(result)[0];
  return entry ? commitCheckin(entry[0], false, "") : { status: "INVALID" as const, message: "This entry pass could not be verified." };
}

export async function checkinByRegistrationId(registrationId: string, reason: string) {
  return commitCheckin(registrationId, true, reason);
}

export async function searchFirebaseRegistrations(search: string, searchBy: string): Promise<FirebaseCheckinCandidate[]> {
  requireAdmin();
  const snapshot = await get(ref(getFirebaseDatabase(), "registrations"));
  const registrations = snapshot.val() as Record<string, RegistrationRecord & { rollNumber: string; phone?: string }> | null;
  const term = search.trim().toLowerCase();
  const field = searchBy === "registration" ? "registrationId" : searchBy === "phone" ? "phone" : "fullName";
  return Object.entries(registrations ?? {}).map(([id, record]) => ({
    id,
    registration_id: record.registrationId,
    full_name: record.fullName,
    roll_number: record.rollNumber,
    branch: record.branch,
    batch: record.batch,
    status: record.status,
    checked_in_at: record.checkedInAt ? new Date(record.checkedInAt).toISOString() : null,
    [field]: record[field as keyof typeof record],
  })).filter((record) => String(record[field as keyof typeof record] ?? "").toLowerCase().includes(term));
}