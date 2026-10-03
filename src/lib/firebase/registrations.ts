import { get, ref, serverTimestamp, update } from "firebase/database";
import { eventConfig } from "@/config/event";
import { isAdminEmail } from "@/config/firebase-admins";
import { site } from "@/config/site";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import { getFirebaseDatabase } from "@/lib/firebase/database";
import type { CompressedPaymentScreenshot } from "@/lib/image/compress-payment-screenshot";
import type { RegistrationInput } from "@/lib/validation/registration";

type EventRecord = { id: string; isActive: boolean; registrationFee: number };

export function newOpaqueId(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export async function hashIdentity(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizedPhone(value: string) {
  return value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

export async function createFirebaseRegistration(
  values: RegistrationInput,
  screenshot: CompressedPaymentScreenshot,
) {
  const user = getFirebaseAuth().currentUser;
  if (!user || (!user.isAnonymous && !isAdminEmail(user.email))) {
    throw new Error("Registration authentication could not be verified. Please try again.");
  }
  if (screenshot.dataUrl.length > 700_000 || screenshot.sizeBytes > 450_000) {
    throw new Error("Payment screenshot is too large. Please upload a clearer screenshot or crop unnecessary areas.");
  }
  if (!site.upi.id.trim() || !site.upi.name.trim()) {
    throw new Error("Registration is not available until the official UPI details are configured.");
  }

  const database = getFirebaseDatabase();
  const eventSnapshot = await get(ref(database, "events/NAVRANG_2026"));
  const event = eventSnapshot.val() as EventRecord | null;
  if (!event || event.id !== "NAVRANG_2026" || !event.isActive || event.registrationFee !== 200) {
    throw new Error("Registration is currently closed. Please try again shortly.");
  }

  const utr = values.transactionId.trim();
  const emailHash = await hashIdentity(values.email.trim().toLowerCase());
  const phoneHash = await hashIdentity(normalizedPhone(values.phone));
  const rollHash = await hashIdentity(values.rollNumber.trim().toUpperCase());
  const indexPaths = [
    `utrIndex/${utr}`,
    `identityIndex/NAVRANG_2026/email/${emailHash}`,
    `identityIndex/NAVRANG_2026/phone/${phoneHash}`,
    `identityIndex/NAVRANG_2026/roll/${rollHash}`,
  ];
  const indexSnapshots = await Promise.all(indexPaths.map((path) => get(ref(database, path))));
  if (indexSnapshots[0].exists()) throw new Error("This transaction ID has already been submitted.");
  if (indexSnapshots[1].exists()) throw new Error("This email is already registered for NAVRANG ’26.");
  if (indexSnapshots[2].exists()) throw new Error("This phone number is already registered for NAVRANG ’26.");
  if (indexSnapshots[3].exists()) throw new Error("This roll number is already registered for NAVRANG ’26.");

  const registrationId = `REG-${newOpaqueId(6)}`;
  const qrToken = newOpaqueId(32);
  const screenshotPath = `paymentScreenshots/${registrationId}`;
  const registration = {
    registrationId,
    eventId: "NAVRANG_2026",
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    rollNumber: values.rollNumber.trim(),
    branch: values.branch,
    batch: values.batch,
    college: values.college.trim(),
    createdBy: user.uid,
    payment: {
      amount: event.registrationFee,
      utr,
      upiName: site.upi.name,
      screenshotAvailable: true,
      screenshotPath: `/${screenshotPath}`,
    },
    status: "PENDING",
    qrToken: null,
    passGenerated: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    verifiedAt: null,
    verifiedBy: null,
    checkedIn: false,
    checkedInAt: null,
    checkedInBy: null,
  };
  const passLookup = {
    status: "PENDING",
    message: "Payment verification is pending. Your entry pass will be issued after approval.",
  };
  try {
    await update(ref(database), {
      [`registrations/${registrationId}`]: registration,
      [`utrIndex/${utr}`]: true,
      [`identityIndex/NAVRANG_2026/email/${emailHash}`]: true,
      [`identityIndex/NAVRANG_2026/phone/${phoneHash}`]: true,
      [`identityIndex/NAVRANG_2026/roll/${rollHash}`]: true,
      [screenshotPath]: {
        dataUrl: screenshot.dataUrl,
        mimeType: screenshot.mimeType,
        sizeBytes: screenshot.sizeBytes,
        uploadedBy: user.uid,
        uploadedAt: serverTimestamp(),
      },
      [`passLookups/${registrationId}/${emailHash}`]: passLookup,
      [`passLookups/${registrationId}/${phoneHash}`]: passLookup,
    });
  } catch (error) {
    const failedIndex = await Promise.all(indexPaths.map((path) => get(ref(database, path))));
    if (failedIndex[0].exists()) throw new Error("This transaction ID has already been submitted.");
    if (failedIndex[1].exists()) throw new Error("This email is already registered for NAVRANG ’26.");
    if (failedIndex[2].exists()) throw new Error("This phone number is already registered for NAVRANG ’26.");
    if (failedIndex[3].exists()) throw new Error("This roll number is already registered for NAVRANG ’26.");
    console.error("Firebase registration write failed", error);
    throw new Error("Unable to submit registration. Please check your connection and try again.");
  }

  return { registrationId, amount: event.registrationFee };
}

export const FIREBASE_EVENT_ID = "NAVRANG_2026" as const;
export const FIREBASE_REGISTRATION_FEE = eventConfig.defaultFee;