import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = await readFile(path.join(root, ".env.local"), "utf8").catch(() => "");
const isWindows = process.platform === "win32";
const firebaseCommand = isWindows ? path.join(process.env.APPDATA ?? "", "npm", "firebase.cmd") : "firebase";
function env(name) {
  if (process.env[name]) return process.env[name].trim();
  const line = envText.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2") : "";
}
function run(args) {
  const result = spawnSync(firebaseCommand, args, { cwd: root, encoding: "utf8", stdio: "inherit", shell: isWindows });
  if (result.error) throw new Error("Firebase CLI is unavailable. Install firebase-tools and run firebase login first.");
  if (result.status !== 0) throw new Error(`Firebase CLI failed: firebase ${args.join(" ")}`);
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8", stdio: "inherit" });
  if (result.error || result.status !== 0) throw new Error("Firebase rule generation failed.");
}

const projectId = env("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const databaseUrl = env("NEXT_PUBLIC_FIREBASE_DATABASE_URL");
if (!projectId || !databaseUrl) throw new Error("Set NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_DATABASE_URL in .env.local.");
if (!/^[a-z0-9-]+$/.test(projectId)) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID has an invalid format.");
const runCaptured = (args) => spawnSync(firebaseCommand, args, { cwd: root, encoding: "utf8", shell: isWindows });
const cliVersion = runCaptured(["--version"]);
if (cliVersion.error || cliVersion.status !== 0) throw new Error("Firebase CLI is unavailable. Install firebase-tools and run firebase login first.");

const projectList = runCaptured(["projects:list", "--json"]);
if (projectList.status !== 0 || !projectList.stdout.includes(projectId)) {
  throw new Error(`Firebase CLI is not authenticated to project ${projectId}. Run firebase login and verify firebase projects:list.`);
}

const eventUrl = `${databaseUrl.replace(/\/+$/, "")}/events/NAVRANG_2026.json`;
const existingResponse = await fetch(eventUrl);
if (!existingResponse.ok) throw new Error(`Could not verify the existing Realtime Database: HTTP ${existingResponse.status}`);
const existingEvent = await existingResponse.json();
if (existingEvent && (existingEvent.id !== "NAVRANG_2026" || existingEvent.registrationFee !== 200)) {
  throw new Error("An event already exists at /events/NAVRANG_2026 and does not match this release. No data was changed.");
}

runNode(["scripts/generate-firebase-rules.mjs"]);
run(["deploy", "--only", "database,auth", "--project", projectId]);
if (!existingEvent) {
  run(["database:set", "/events/NAVRANG_2026", "database/navrang-2026-event.json", "--project", projectId]);
}

console.log("Firebase rules/auth config deployed; event seed was added only if its path was empty.");
console.log("One-time check: verify Email/Password sign-in is enabled and the two named admin accounts exist. No accounts were created.");
console.log("No database data was removed or overwritten.");