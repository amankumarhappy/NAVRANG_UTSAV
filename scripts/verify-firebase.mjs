import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localEnv = await readFile(path.join(root, ".env.local"), "utf8").catch(() => "");
function env(name) {
  if (process.env[name]) return process.env[name].trim();
  const line = localEnv.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2") : "";
}

const required = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_ADMIN_EMAIL_1",
  "NEXT_PUBLIC_ADMIN_EMAIL_2",
];
const missing = required.filter((name) => !env(name));
if (missing.length) {
  console.error(`Missing Firebase configuration: ${missing.join(", ")}`);
  process.exit(1);
}

const databaseUrl = env("NEXT_PUBLIC_FIREBASE_DATABASE_URL").replace(/\/+$/, "");
const response = await fetch(`${databaseUrl}/events/NAVRANG_2026.json`);
if (!response.ok) {
  console.error(`Realtime Database is unreachable: HTTP ${response.status}`);
  process.exit(1);
}
const event = await response.json();
if (!event) {
  console.error("Realtime Database is reachable, but /events/NAVRANG_2026 is missing. Run npm run firebase:setup.");
  process.exit(1);
}
if (event.id !== "NAVRANG_2026" || event.registrationFee !== 200 || typeof event.isActive !== "boolean") {
  console.error("/events/NAVRANG_2026 exists but does not match the expected event shape.");
  process.exit(1);
}
console.log(JSON.stringify({ projectId: env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"), databaseReachable: true, eventId: event.id, isActive: event.isActive, registrationFee: event.registrationFee }));