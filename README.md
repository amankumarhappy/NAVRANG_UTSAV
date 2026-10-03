# NAVRANG ’26 — Dandiya Night 2026

Responsive event and operations website for Government Engineering College, Buxar. Backend services are Firebase Authentication and Firebase Realtime Database. The project does not use Firestore, Firebase Storage, Cloud Functions, or Supabase.

## Local development

1. Copy `.env.example` to `.env.local` and fill the Firebase Web app values, official UPI ID, and the two configured admin emails.
2. Install dependencies with `npm install`.
3. Start the website with `npm run dev`.
4. Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to log in to Firebase, deploy RTDB rules, seed the event only if it is absent, and verify setup.

## Checks

```powershell
npm run typecheck
npm run lint
npm run test:firebase-rules
npm run build
npm audit --omit=dev
```

## Editable content

Event details and highlights are in `src/config/event.ts`; public site/payment text is in `src/config/site.ts`; coordinator contacts are in `src/config/coordinators.ts`; FAQ and poster assignments remain in their existing config files.
