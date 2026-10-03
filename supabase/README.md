# Supabase backend replacement

This is an opt-in replacement for the existing FastAPI backend. The existing Vercel
frontend stays on its current API unless `NEXT_PUBLIC_BILLING_BACKEND=supabase` is set.
No live configuration, records, authentication accounts or storage buckets were changed
by building these files.

## Components

- Supabase Auth login with backend `getUser` verification, a server UUID allowlist and
  database operator membership. Removing an operator revokes backend and Storage access.
- `billing-api` Edge Function. The browser requests Mumbai using `x-region: ap-south-1`.
- Existing six-table PostgreSQL schema. Customer and loan writes commit together.
- Original edit snapshots and transaction locks reject stale edits, duplicate IDs,
  duplicate displayed bill numbers, orphaned customers and deleted-record resurrection.
- RLS and revoked public grants protect the six existing tables. Private server
  connections run authorized operations; browser keys cannot query those tables directly.
- `billing_audit` retains before/after versions for customers, transactions, catalog
  items and SMS templates, in the same transaction as the mutation. Audit rows are
  unavailable through browser credentials. This supports recovery but does not replace backups.
- Supabase Realtime broadcasts only an invalidation topic. No amounts/contact details
  are copied into the notification table. Confirmed saves update local state immediately.
- A private `billing-documents` Storage bucket and `/documents` page. PDF/images only,
  maximum 10 MB, random new names, no browser overwrite/delete, 60-second signed links.
- `/bridge` pairs the updated Android SMS app with a scoped random key. The server stores
  its SHA-256 hash; the phone encrypts the key with Android Keystore. Paired keys cannot
  access financial APIs. Claiming a job is atomic and a Sending job is never auto-reissued.
  The phone polls every 15 seconds while idle, so SMS dispatch can wait for the next poll;
  this polling interval does not delay saving a loan.
- The phone reports `Submitted`, meaning accepted by SmsManager, rather than claiming
  carrier delivery. Uncertain Sending jobs require investigation; do not blindly resend.
- Manual reminders and an optional dedicated Cron endpoint. Cron keys cannot access
  other APIs. The startup scanner is replaced by a Supabase Cron schedule after testing.

## Setup order

1. Make a protected, complete PostgreSQL backup of the existing Supabase project and
   verify a restore into a separate TEST project in Mumbai. Include all application
   tables, schema, sequences, custom SMS templates and any existing Auth/Storage assets.
   API/CSV exports alone are not a complete database backup. Keep two independent copies.
2. Check the restored schema against `backend/app/models/models.py`; quoted camelCase
   columns are required. The function never creates or seeds application tables.
3. Create a test owner through Supabase Authentication > Users. Use a real private
   password and disable public signup for this single-shop application.
4. Apply `migrations/202610030001_billing_access.sql` to the restored test project ONCE.
   It adds tables, triggers, RLS, grants and a private bucket; it does not rewrite loan data.
   Existing data and original schema grants must be inventoried before live application.
5. Add the owner UUID using the test project's SQL Editor:

   ```sql
   INSERT INTO public.billing_operators(user_id)
   VALUES ('REPLACE_WITH_TEST_OWNER_AUTH_UUID');
   ```

6. Add the settings in `.env.example` privately under Edge Functions > Secrets. Obtain
   the TEST project's transaction-pooler connection string from Connect. Keep TLS
   certificate verification enabled. Use the same UUID in `BILLING_ALLOWED_USER_IDS`.
7. Deploy from the versioned repository, not by copying a partial file into the dashboard:

   ```powershell
   npx supabase login
   npx supabase functions deploy billing-api --project-ref YOUR_TEST_PROJECT_REF
   ```

   Run from the repository root. The CLI reads `supabase/config.toml`; gateway JWT
   verification is disabled because the handler verifies Auth itself and separately
   verifies scoped bridge/Cron keys. Do not remove the handler authentication checks.
8. Create a Vercel preview deployment using `frontend/.env.supabase.example`. Add its
   exact origin to the function allowlist. Keep the production environment unchanged.
9. Sign in, compare records and totals with the original, and check responses report
   Mumbai. Read-only preview rejects writes. Enable writes ONLY on the restored test
   project to test create/edit/clear/delete, conflicts, document policies and SMS pairing.
10. Build the Android bridge with Android Studio or `./gradlew :app:assembleDebug`.
    Use the function URL `https://YOUR_TEST_PROJECT_REF.supabase.co/functions/v1/billing-api`.
    Copy the phone UUID into `/bridge`; paste the displayed private pairing key into the
    phone, register and connect. Test on an explicitly selected test phone/number only.
    Never connect both old and new senders to the same live queue during cutover.

## Tests

```powershell
npm ci --prefix testing
npm run test:supabase --prefix testing
node testing/test_frontend_save_safety.cjs
deno check --config supabase/functions/billing-api/deno.json supabase/functions/billing-api/index.ts
npm ci --prefix frontend
npm run build --prefix frontend
```

PostgreSQL tests use an isolated in-memory PGlite database with synthetic rows.
They validate real SQL, rollbacks, RLS, Storage policies, audit and job state transitions.
PGlite is single-session and lacks PostgreSQL advisory locks; tests verify lock issuance,
but simultaneous requests from multiple deployed workers must also be tested on staging.
No local test uses production credentials or contacts.

The frontend, backend type checks, existing safety checks and isolated PostgreSQL tests
passed locally. The installed Android SDK was inaccessible in this execution environment,
so APK compilation and a physical-phone send test remain required before live cutover.

## Optional scheduled reminders

Generate a cryptographically random dedicated bearer token. Keep the raw token in
Supabase Vault and its SHA-256 hex digest in `BILLING_CRON_TOKEN_SHA256`. Schedule a daily
Supabase Cron HTTP POST to `/functions/v1/billing-api/loans/scheduled-reminders` with that
Bearer token and `x-region: ap-south-1`. Never schedule using an owner session token.
Enable this schedule only after the phone test and cutover. Existing templates are reused,
missing templates are skipped, and stable per-loan/date reminder IDs prevent re-enqueue.

Prune `billing_changes` notification metadata older than seven days with a daily SQL Cron
job. Do not prune `billing_audit` or original financial records. Monitor database, Storage,
Realtime and Edge Function usage against current free-plan quotas.

## Live cutover gate

Do not change live settings until restore/schema/record comparisons, authorization checks,
concurrent worker tests, staged latency measurements and Android build/phone tests pass.

The live database stays in the EXISTING Mumbai Supabase project. During a maintenance
window stop old writes, old reminders and the old phone connection. Take a final verified
backup, apply the tested security migration and operator configuration to that existing
project, deploy its read-only function, and compare every application record again.
Set the new frontend environment, enable the new writer, pair only the new phone, then
enable the tested daily Cron job and resume shop work. Disable the old unauthenticated
Render API; otherwise it remains an alternative path around the new access controls.

The old backend does not use the new advisory lock, so both backends must never write
concurrently. RLS changes preserve data but can affect other integrations; inventory
them before applying the migration. Do not promise zero loss until comparisons and a
restore rehearsal have passed. An audit trail is supplemental to protected off-site backups.

Keeping the same database avoids importing a stale copy during production cutover.
Rollback still needs review: the old backend cannot safely run beside new writes, and
reopening it without authentication would restore the old access vulnerability.
Free functions can have cold starts and quotas; measure actual end-to-end save latency
before claiming a speed improvement. The Hello World timing is not a loan-save benchmark.
