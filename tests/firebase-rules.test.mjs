import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { get, ref, set, update } from "firebase/database";

const projectId = "demo-navrang-rules";
const firstId = "REG-ABCDEF123456";
const secondId = "REG-ABCDEF123457";
const firstUtr = "123456789012";
const emailHash = "a".repeat(64);
const phoneHash = "b".repeat(64);
const rollHash = "c".repeat(64);
let environment;

function registrationUpdate(registrationId, utr, hashes, uid = "public-test-user", screenshotSize = 128) {
  const screenshotPath = `paymentScreenshots/${registrationId}`;
  return {
    [`registrations/${registrationId}`]: {
      registrationId,
      eventId: "NAVRANG_2026",
      fullName: "Test Participant",
      email: `${registrationId.toLowerCase()}@example.com`,
      phone: "9000000000",
      rollNumber: `ROLL-${registrationId.slice(-6)}`,
      branch: "CSE",
      batch: "2024",
      college: "Government Engineering College, Buxar",
      createdBy: uid,
      payment: {
        amount: 200,
        utr,
        upiName: "GEC BUXAR DANDIYA 2026 / GEC BUXAR CULTURAL CLUB",
        screenshotAvailable: true,
        screenshotPath: `/${screenshotPath}`,
      },
      status: "PENDING",
      qrToken: null,
      passGenerated: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      verifiedAt: null,
      verifiedBy: null,
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null,
    },
    [`utrIndex/${utr}`]: true,
    [`identityIndex/NAVRANG_2026/email/${hashes.email}`]: true,
    [`identityIndex/NAVRANG_2026/phone/${hashes.phone}`]: true,
    [`identityIndex/NAVRANG_2026/roll/${hashes.roll}`]: true,
    [screenshotPath]: {
      dataUrl: "data:image/webp;base64,AAAA",
      mimeType: "image/webp",
      sizeBytes: screenshotSize,
      uploadedAt: Date.now(),
      uploadedBy: uid,
    },
    [`passLookups/${registrationId}/${hashes.email}`]: { status: "PENDING", message: "Payment verification is pending." },
    [`passLookups/${registrationId}/${hashes.phone}`]: { status: "PENDING", message: "Payment verification is pending." },
  };
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    database: { rules: await readFile(new URL("../database.rules.json", import.meta.url), "utf8") },
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), "events/NAVRANG_2026"), {
      id: "NAVRANG_2026",
      isActive: true,
      registrationFee: 200,
    });
  });
});

after(async () => {
  await environment?.cleanup();
});

test("public creates valid registration and screenshot in one update", async () => {
  const publicDb = environment.authenticatedContext("public-test-user", {
    firebase: { sign_in_provider: "anonymous" },
  }).database();
  await assertSucceeds(update(ref(publicDb), registrationUpdate(firstId, firstUtr, {
    email: emailHash,
    phone: phoneHash,
    roll: rollHash,
  })));
  await assertSucceeds(get(ref(publicDb, "utrIndex/999999999999")));
  await assertFails(get(ref(publicDb, "registrations")));
  await assertFails(get(ref(publicDb, "utrIndex")));
  await assertFails(get(ref(publicDb, `paymentScreenshots/${firstId}`)));
  await assertFails(get(ref(publicDb, "auditLogs")));
});

test("duplicate UTR, invalid status, and oversized screenshot are rejected", async () => {
  const publicDb = environment.authenticatedContext("public-test-user-2", {
    firebase: { sign_in_provider: "anonymous" },
  }).database();
  await assertFails(update(ref(publicDb), registrationUpdate(secondId, firstUtr, {
    email: "e".repeat(64),
    phone: "f".repeat(64),
    roll: "9".repeat(64),
  })));
  const invalidStatus = registrationUpdate("REG-ABCDEF123458", "123456789013", {
    email: "1".repeat(64),
    phone: "2".repeat(64),
    roll: "3".repeat(64),
  });
  invalidStatus[`registrations/${"REG-ABCDEF123458"}`].status = "APPROVED";
  await assertFails(update(ref(publicDb), invalidStatus));
  const large = registrationUpdate("REG-ABCDEF123459", "123456789014", {
    email: "4".repeat(64),
    phone: "5".repeat(64),
    roll: "6".repeat(64),
  }, "public-test-user-2", 450001);
  await assertFails(update(ref(publicDb), large));
});

test("only the configured admins can read registrations and screenshots", async () => {
  const adminDb = environment.authenticatedContext("admin-test-user", {
    email: "aryasinhaer2428@gmail.com",
    firebase: { sign_in_provider: "password" },
  }).database();
  const otherDb = environment.authenticatedContext("other-user", {
    email: "other@example.com",
    firebase: { sign_in_provider: "password" },
  }).database();
  await assertSucceeds(get(ref(adminDb, "registrations")));
  await assertSucceeds(get(ref(adminDb, `paymentScreenshots/${firstId}`)));
  await assertFails(get(ref(otherDb, "registrations")));
  await assertFails(get(ref(otherDb, `paymentScreenshots/${firstId}`)));
  await assertFails(set(ref(otherDb, "auditLogs/fake"), { action: "APPROVED" }));
  await assertSucceeds(update(ref(adminDb, `registrations/${firstId}`), {
    status: "APPROVED",
    qrToken: "E".repeat(64),
    passGenerated: true,
    verifiedAt: Date.now(),
    verifiedBy: "aryasinhaer2428@gmail.com",
    updatedAt: Date.now(),
  }));
});