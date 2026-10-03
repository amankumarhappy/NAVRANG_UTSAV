# Firebase Setup

This repository uses Firebase Authentication and Firebase Realtime Database only. It does not use Cloud Firestore, Firebase Cloud Storage, Cloud Functions, or paid Firebase services. No database tables or collections need to be created manually.

## Configuration

Copy `.env.example` to `.env.local`. Add the Firebase Web app values from Firebase Project Settings and retain the configured UPI values. Do not commit `.env.local`.

`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is included because it is part of the Web app config; the application does not import or call Firebase Storage.

Set `NEXT_PUBLIC_ADMIN_EMAIL_1` and `NEXT_PUBLIC_ADMIN_EMAIL_2` to the two existing admin accounts. The current configured accounts are Aryasinha and Aman. Their emails are used by `src/config/firebase-admins.ts` and copied into generated RTDB rules. Never add passwords to environment files or source control.

## One-time CLI setup

Install and authenticate Firebase CLI:

```powershell
npm install -g firebase-tools
firebase login
firebase projects:list
```

This repository is linked to `navrangutsav-14511` in `.firebaserc`. Confirm the Firebase CLI account can see this project. If you are intentionally using a different project, update `.firebaserc` and the Firebase environment variables together.

Run the repository setup:

```powershell
npm run firebase:setup
npm run firebase:verify
```

The setup script:

- verifies Firebase CLI authentication and the selected project;
- verifies the existing Realtime Database endpoint;
- regenerates `database.rules.json` for exactly the two configured admin emails;
- deploys only RTDB rules and Email/Password plus anonymous Auth provider settings;
- seeds `/events/NAVRANG_2026` only if that path is empty;
- stops without overwriting an existing event with unexpected data.

It never deletes or imports database data, creates admin users, or deploys Firestore, Storage, Hosting, or Functions. If either admin user is missing, create only Aryasinha and Aman in Firebase Authentication; this repository does not create users or public admin signup.

For rules-only redeployment after changing admin emails or rules:

```powershell
npm run firebase:rules
```

That command replaces the project's current RTDB rules with the checked-in generated rules. Review `database.rules.json` before deploying.

## Local development and verification

```powershell
npm install
npm run dev
npm run firebase:verify
npm run test:firebase-rules
npm run typecheck
npm run lint
npm run build
npm audit --omit=dev
```

The rules test command starts only the local RTDB emulator on port 45000 and uses a demo project ID; it does not write to the production project.

## Data model and access

- `/events/NAVRANG_2026`: public event fields; only admins can change it.
- `/registrations/{registrationId}`: private registration metadata, readable by admins only.
- `/paymentScreenshots/{registrationId}`: compressed WebP/JPEG data URL, readable by admins only; never included in registration-list reads.
- `/utrIndex/{utr}` and `/identityIndex/NAVRANG_2026/...`: duplicate-prevention indexes; admins can list them, anonymous registrants can check only an exact submitted key.
- `/passLookups/{registrationId}/{identityHash}`: minimal pending/rejected state or approved pass, readable only at the exact registration and submitted identity hash.
- `/publicPasses/{qrToken}`: approved pass data keyed by the opaque QR token.
- `/checkins/{registrationId}` and `/auditLogs/{logId}`: admin-only.

Public registration uses an invisible Firebase anonymous-auth session. Security Rules require a newly created PENDING registration, the active `NAVRANG_2026` event, ₹200, a 12-digit UTR, a compressed screenshot within the configured size limit, and creation of the UTR/identity indexes. Admin-only operations are also enforced by RTDB rules using the two configured email addresses; the client-side gate is only a UX layer.

Screenshots are compressed in the browser (WebP preferred, JPEG fallback; max 1400 px long edge; target 450 KB; hard data URL cap 700,000 characters) and written in the same multi-location RTDB update as registration metadata and indexes. No original 5 MB screenshot is sent to Firebase.

## Remaining manual actions

- Authenticate Firebase CLI once with `firebase login`.
- Ensure Email/Password and Anonymous authentication providers are enabled; `firebase:setup` deploys these provider settings where the project API permits.
- Confirm the two existing admin accounts use the emails in `.env.local`/Vercel.
- Add Firebase environment variables to Vercel and redeploy the Next.js app.

After setup, a healthy active event and official UPI settings make `/register` available automatically. A missing event, denied rules, or invalid configuration keeps registration closed and displays a human-readable message.
