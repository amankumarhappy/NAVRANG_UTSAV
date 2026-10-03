import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readDotEnv(fileContents, name) {
  const line = fileContents.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  if (!line) return "";
  return line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
}

const localEnv = await readFile(path.join(root, ".env.local"), "utf8").catch(() => "");
const adminEmails = ["NEXT_PUBLIC_ADMIN_EMAIL_1", "NEXT_PUBLIC_ADMIN_EMAIL_2"]
  .map((name) => (process.env[name] ?? readDotEnv(localEnv, name)).trim().toLowerCase());
if (adminEmails.some((email) => !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
  throw new Error("Set both NEXT_PUBLIC_ADMIN_EMAIL_1 and NEXT_PUBLIC_ADMIN_EMAIL_2 before generating rules.");
}
if (new Set(adminEmails).size !== 2) throw new Error("The two Firebase admin email addresses must be different.");

const admin = `auth !== null && (${adminEmails.map((email) => `auth.token.email === ${JSON.stringify(email)}`).join(" || ")})`;
const anonymousRegistrant = "auth !== null && auth.token.firebase.sign_in_provider === 'anonymous'";
const publicEventIsActive = "root.child('events/NAVRANG_2026/isActive').val() === true && root.child('events/NAVRANG_2026/registrationFee').val() === 200";
const publicCreate = `${anonymousRegistrant} && !data.exists() && newData.exists()`;

const rules = {
  rules: {
    ".read": false,
    ".write": false,
    events: {
      NAVRANG_2026: {
        ".read": true,
        ".write": admin,
      },
    },
    registrations: {
      ".read": admin,
      ".indexOn": ["qrToken"],
      "$registrationId": {
        ".read": admin,
        ".write": `${admin} || (${publicCreate} && ${publicEventIsActive} && newData.child('createdBy').val() === auth.uid && newData.child('eventId').val() === 'NAVRANG_2026' && newData.child('status').val() === 'PENDING' && newData.child('passGenerated').val() === false && newData.child('qrToken').val() === null && newData.child('checkedIn').val() === false && newData.child('verifiedAt').val() === null && newData.child('verifiedBy').val() === null)`,
        ".validate": "newData.hasChildren(['registrationId','eventId','fullName','email','phone','rollNumber','branch','batch','college','createdBy','payment','status','passGenerated','createdAt','updatedAt','checkedIn']) && newData.child('registrationId').val() === $registrationId && $registrationId.matches(/^REG-[A-F0-9]{12}$/) && newData.child('eventId').val() === 'NAVRANG_2026' && newData.child('createdBy').isString() && newData.child('fullName').isString() && newData.child('fullName').val().length >= 2 && newData.child('fullName').val().length <= 120 && newData.child('email').isString() && newData.child('email').val().length <= 254 && newData.child('phone').isString() && newData.child('phone').val().length >= 10 && newData.child('phone').val().length <= 20 && newData.child('rollNumber').isString() && newData.child('rollNumber').val().length >= 2 && newData.child('rollNumber').val().length <= 40 && newData.child('branch').isString() && newData.child('batch').val().matches(/^(2023|2024|2025|2026)$/) && newData.child('college').isString() && newData.child('payment/amount').val() === 200 && newData.child('payment/utr').val().matches(/^[0-9]{12}$/) && newData.child('payment/upiName').isString() && newData.child('payment/screenshotAvailable').val() === true && newData.child('payment/screenshotPath').val() === '/paymentScreenshots/' + $registrationId && ((newData.child('status').val() === 'APPROVED' && newData.child('passGenerated').val() === true && newData.child('qrToken').val().matches(/^[A-F0-9]{64}$/)) || ((newData.child('status').val() === 'PENDING' || newData.child('status').val() === 'REJECTED') && newData.child('passGenerated').val() === false && newData.child('qrToken').val() === null)) && (newData.child('checkedIn').val() === false || (newData.child('status').val() === 'APPROVED' && newData.child('passGenerated').val() === true && newData.child('checkedIn').val() === true))",
      },
    },
    utrIndex: {
      ".read": admin,
      "$utr": {
        ".read": `${admin} || ${anonymousRegistrant}`,
        ".write": `${admin} || (${publicCreate} && ${publicEventIsActive} && $utr.matches(/^[0-9]{12}$/) && newData.val() === true)`,
        ".validate": "newData.val() === true",
      },
    },
    identityIndex: {
      ".read": admin,
      NAVRANG_2026: {
        "$kind": {
          "$hash": {
            ".read": `${admin} || ${anonymousRegistrant}`,
            ".write": `${admin} || (${publicCreate} && ${publicEventIsActive} && ($kind === 'email' || $kind === 'phone' || $kind === 'roll') && $hash.matches(/^[a-f0-9]{64}$/))`,
            ".validate": "newData.val() === true"
          },
        },
      },
    },
    paymentScreenshots: {
      ".read": admin,
      "$registrationId": {
        ".read": admin,
        ".write": `${admin} || (${anonymousRegistrant} && !data.exists() && newData.exists() && ${publicEventIsActive} && $registrationId.matches(/^REG-[A-F0-9]{12}$/) && newData.child('uploadedBy').val() === auth.uid && newData.child('dataUrl').isString() && newData.child('dataUrl').val().length <= 700000)`,
        ".validate": "newData.hasChildren(['dataUrl','mimeType','sizeBytes','uploadedAt','uploadedBy']) && (newData.child('mimeType').val() === 'image/webp' || newData.child('mimeType').val() === 'image/jpeg') && newData.child('dataUrl').val().matches(/^data:image\\/(webp|jpeg);base64,/) && newData.child('sizeBytes').isNumber() && newData.child('sizeBytes').val() <= 450000",
      },
    },
    passLookups: {
      "$registrationId": {
        ".read": admin,
        "$identityHash": {
          ".read": `${admin} || ${anonymousRegistrant}`,
          ".write": `${admin} || (${publicCreate} && newData.child('status').val() === 'PENDING' && !newData.child('pass').exists())`,
        },
      },
    },
    publicPasses: {
      ".read": admin,
      "$qrToken": {
        ".read": `${admin} || (auth === null && data.exists())`,
        ".write": admin,
        ".validate": "newData.child('status').val() === 'APPROVED' && newData.child('qrToken').val() === $qrToken",
      },
    },
    checkins: {
      ".read": admin,
      "$registrationId": {
        ".write": admin,
        ".validate": "newData.child('registrationId').val() === $registrationId && newData.child('checkedIn').val() === true && newData.child('checkedInAt').isNumber()",
      },
    },
    auditLogs: {
      ".read": admin,
      "$logId": { ".write": admin },
    },
  },
};

await writeFile(path.join(root, "database.rules.json"), `${JSON.stringify(rules, null, 2)}\n`);
console.log("Generated database.rules.json for exactly two configured admins.");