# NAVRANG 26 — Dandiya Night 2026

A responsive event website and operations console for Government Engineering College, Buxar. The public event pages, registration flow, pass retrieval, admin review and gate check-in are implemented around the existing Supabase project.

## Before connecting production

This workspace did not include Supabase credentials or a schema dump, so the existing database could not be queried from here. **Do not apply the migration until the schema checks below have been completed against the target project.** No existing table is dropped, reset or recreated by this project.

Verify the live schema and existing `create_registration` function first:

1. Confirm `events.id` is a UUID and inspect its actual event-name, description, date, fee and open/closed field names. `get_active_event` dynamically reads common names (`name`/`event_name`/`title`, `event_date`/`date`/`starts_at`, and `registration_fee`/`fee`/`amount`; active accepts a boolean or an `ACTIVE`/`OPEN`/`PUBLISHED` status).
2. Confirm `registrations` has `id`, `registration_id`, `event_id`, `full_name`, `email`, `phone`, `college`, `branch`, `transaction_id`, `payment_screenshot_path`, `status`, `qr_token`, `pass_generated`, `created_at`, `updated_at`, `roll_number`, `batch` and `amount_paid`. Status values must be `PENDING`, `APPROVED` and `REJECTED`.
3. Confirm `checkins.registration_id` references `registrations.id`, is unique, and that `checked_in_at` and `checked_in_by` exist. If the existing relation uses a different key or type, adapt the check-in function in the migration before applying it.
4. Confirm `audit_logs` has a registration reference, an actor field (`admin_id`, `user_id` or `performed_by`), an action field (`action`, `event` or `event_type`) and a timestamp field (`created_at` or `timestamp`), plus any other non-null columns/constraints required by that table. The migration detects supported columns, but their types and constraints still need to be checked against the live table.
5. Inspect `create_registration`'s signature, security mode and return value. It must be `SECURITY DEFINER` (the migration revokes direct table privileges from `anon` and `authenticated`). The API adapter currently calls it with `p_event_id`, `p_full_name`, `p_roll_number`, `p_branch`, `p_batch`, `p_phone`, `p_email`, `p_college`, `p_transaction_id` and `p_payment_screenshot_path`; update the adapter if the existing parameter names differ. Its database implementation must use the database event fee, create a random ID and `PENDING` status, write an audit log, and never trust a client-supplied amount, status, ID or QR token.
6. Confirm the existing event record is active and the `payment-screenshots` bucket exists. The migration sets it private, caps files at 5 MB, and restricts uploads to PNG/JPG/JPEG/WEBP; inspect existing `storage.objects` policies to ensure no public screenshot read policy remains.

After those checks, apply `database/migrations/202610030001_navrang_secure_operations.sql` using the Supabase SQL editor or the Supabase CLI. It tightens direct privileges on the existing registrations/checkins/audit tables, configures the existing screenshot bucket, and adds event lookup and admin/Telegram/check-in RPC functions. It does not alter or recreate table data or replace the existing registration RPC. Test it against a staging project first. The existing check-in relation and audit-log shape are especially important to verify.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values from the project owner:

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key; prefer this name |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy anon-key fallback |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key for private uploads, admin reads and signed screenshot URLs; `SUPABASE_SERVICE_ROLE_KEY` remains supported as a legacy fallback |
| `NEXT_PUBLIC_EVENT_ID` | Event record UUID; defaults to the supplied NAVRANG 26 ID |
| `NEXT_PUBLIC_COLLEGE_LOGO_URL` | Official logo source; the downloaded local logo is used by the UI |
| `NEXT_PUBLIC_UPI_ID` | Official payment UPI ID used by the registration flow |
| `NEXT_PUBLIC_UPI_NAME` | Public merchant display name |
| `MAKE_WEBHOOK_URL` | Optional Make custom webhook URL; server/Edge Function only |
| `MAKE_WEBHOOK_SECRET` | Optional Make bearer secret; never expose to a browser |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for pass-recovery links |

`.env.local` is ignored by Git. The Supabase secret key and Make secrets are read only in server-side code and Supabase Edge Functions. Never prefix them with `NEXT_PUBLIC_`.

## Local setup

Requirements: Node.js 18.17+ (Node 20 LTS recommended) and npm.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Set Supabase values in `.env.local` first. Registration intentionally stays unavailable if the event cannot be validated or the official UPI ID is blank. Public event pages render without Supabase, using the clearly editable event configuration as a display fallback; the fee is never invented.

Useful checks:

```powershell
npm run typecheck
npm run lint
npm run build
```

## Manual content updates

- Event identity, public contacts, social links, venue/time labels and UPI display details: `src/config/site.ts`.
- Event ID fallback, eligible batches, branches, validation limits, activities, highlights and cultural flow: `src/config/event.ts`.
- Coordinators and portrait placeholder: `src/config/coordinators.ts`.
- FAQ copy: `src/config/faq.ts`.
- Navigation: `src/config/navigation.ts`.
- Poster assignments: `src/config/posters.ts`.
- Validation: `src/lib/validation/registration.ts`.

The active event name, description, date, fee and open status come from `get_active_event` in Supabase. The public event fee and server registration gate use that database response. The application event ID is configurable and is not permanently embedded in the UI.

### Coordinators

Edit names, roles, phone numbers and portrait paths in `src/config/coordinators.ts`. Current entries are explicitly generic placeholders, not real people. Replace them only with confirmed information and approved images.

### Posters and brand assets

Replace `src/assets/posters/poster-01-placeholder.svg` through `poster-04-placeholder.svg` with approved artwork, preserving those filenames for zero-code replacement. `src/config/posters.ts` is the only poster import point. Keep the artwork proportions compatible with the existing poster frames. Coordinator placeholder portraits are served from `public/assets/coordinators/`.

The official GEC logo is stored at `public/assets/gec-buxar-logo.png` and referenced by `site.logoPath`; do not distort or recolour it.

### Payment

Set `NEXT_PUBLIC_UPI_ID` only after the official merchant ID has been confirmed. Update the display name in `.env.local` and `src/config/site.ts` only if the verified merchant name changes. A blank UPI ID blocks screenshot upload and registration submission.

## Admin authentication and permissions

There is no public sign-up or custom password table. Admins sign in at `/admin/login` using existing Supabase Auth email/password accounts. Add or remove the `role: "admin"` claim in the account's **app_metadata** using a trusted Supabase admin process; never let a browser update app metadata. Both page handlers and API handlers verify the current Supabase user and role. The approval and check-in SQL functions verify the signed-in user's `app_metadata.role` again.

Admin data is read through server routes using the server-only service-role key after role verification. Approval/rejection and check-in calls use the authenticated user's Supabase session and tightly scoped RPC functions. There is no registration delete operation.

## Registration, passes and private payment screenshots

The browser requests a one-use signed upload URL for a random path under `payment-screenshots/pending/`, uploads directly to the private bucket, and submits only the resulting path with validated fields. The server checks that the uploaded object exists, enforces the real file size and image magic bytes, confirms the event is active, then calls the existing secure `create_registration` RPC. Amount, registration status, public ID and QR token are never sent as trusted client values.

Pass retrieval requires the random public Registration ID **and** its matching registered email or phone. Pending and rejected states are disclosed only after that identity matches. The pass QR contains only the random token; the admin scanner validates and consumes it through a database transaction. Screenshots are shown to verified admins using short-lived signed URLs, never public URLs.

## Make.com and Telegram

Deploy the two Supabase Edge Functions and set their secrets in the Supabase project:

```text
supabase functions deploy registration-automation
supabase functions deploy telegram-approval
supabase secrets set NAVRANG_DATABASE_WEBHOOK_SECRET=<random-secret>
supabase secrets set MAKE_WEBHOOK_URL=<Make-custom-webhook-url>
supabase secrets set MAKE_WEBHOOK_SECRET=<random-secret>
supabase secrets set NEXT_PUBLIC_SITE_URL=<deployed-site-url>
supabase secrets set TELEGRAM_APPROVAL_SECRET=<random-secret>
supabase secrets set TELEGRAM_ADMIN_MAP={"<telegram-user-id>":"<supabase-admin-user-uuid>"}
```

Keep the secrets out of source control and use a different random secret for each integration. In Supabase Database Webhooks, configure an `INSERT` and `UPDATE` webhook on `public.registrations` to POST to the deployed `registration-automation` Edge Function. Set its `Authorization: Bearer <NAVRANG_DATABASE_WEBHOOK_SECRET>` header. The function reads the current event record and forwards a minimal event payload to Make using `MAKE_WEBHOOK_SECRET`; it never sends the payment screenshot path or QR token.

In Make, branch on `event`:

- `NEW_REGISTRATION`: notify the private Telegram admin channel with the registration ID, student name, roll, branch, batch, amount and transaction ID; do not include email, phone, screenshot path or secrets.
- `REGISTRATION_APPROVED`: send the confirmation email with event/date/venue and the `/get-pass` recovery link. Do not include a QR token in Telegram or email.
- `REGISTRATION_REJECTED`: send an appropriate notification according to the event team's process.

For Telegram inline approve/reject buttons, configure the Make Telegram update scenario to POST the event ID, callback action, registration ID, Telegram actor's numeric `from.id`, and optional reason to the `telegram-approval` Edge Function with `Authorization: Bearer <TELEGRAM_APPROVAL_SECRET>`. The function checks the actor against `TELEGRAM_ADMIN_MAP`; the database function checks the mapped Supabase Auth user still has `app_metadata.role = admin`, scopes the update to that event ID and writes the audit record. Configure Make to use the actual Telegram update actor ID, not a value taken from callback text.

The webhook can be retried by its provider; make downstream email/Telegram scenarios idempotent by checking the event and registration ID. Dashboard approvals remain usable if automation or email delivery fails.

## QR check-in

At `/admin/checkin`, authorised admins can scan the opaque QR token with the browser camera or search by name, registration ID or phone. The RPC validates `APPROVED` and `pass_generated`, and inserts into the existing unique check-in relation in the same database transaction. A competing scanner receives `ALREADY_CHECKED_IN` with the original timestamp. Manual check-in requires a reason and writes a distinct audit action.

Camera use requires HTTPS in production (localhost is allowed by modern browsers). Grant camera access to the event device and test the device/browser before event day.

## Deployment to Vercel

1. Push this project to the event team's private Git repository after checking `.gitignore` and verifying `.env.local` is not staged.
2. Import the repository into Vercel and set the environment variables above for Preview and Production. Set `NEXT_PUBLIC_SITE_URL` to the deployed custom domain.
3. Apply the verified additive SQL migration and deploy Edge Functions in Supabase. Keep the storage bucket private with the required 5 MB/type restrictions.
4. Add the confirmed UPI ID, official email/social contacts and approved coordinators/posters before opening registration.
5. Deploy, then complete the production smoke-test checklist below using staging/test accounts and the event team's authorised devices.

## Production smoke-test checklist

- [ ] Public event page loads the configured active event name/date/fee.
- [ ] Event closed or missing from Supabase prevents registration.
- [ ] Blank UPI ID prevents screenshot upload and registration submission.
- [ ] Valid registration is created through the existing RPC, with a random ID and `PENDING` status.
- [ ] Duplicate transaction, email, phone and roll values are rejected by the database.
- [ ] Public users cannot select registrations or read payment screenshots.
- [ ] Pending/rejected registrations cannot retrieve a pass; wrong identity receives the same generic not-found response.
- [ ] Approved pass QR contains only an opaque random token.
- [ ] Admin login works only for accounts with the Supabase `app_metadata.role = admin` claim.
- [ ] Approval, rejection, manual approval, pass reissue and manual/QR check-in create audit entries.
- [ ] A second concurrent scan returns `ALREADY_CHECKED_IN`, not a second check-in.
- [ ] Test 360 px mobile, tablet and desktop layouts; verify camera permissions on the actual gate device.
- [ ] Make notifications and Telegram callbacks reject missing/invalid secrets and non-allowlisted actors.

Do not create demo registrations in the production database.
