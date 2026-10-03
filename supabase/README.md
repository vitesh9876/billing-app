# Supabase production backend

SmartShop's current application backend runs entirely in Supabase: Auth, PostgreSQL, the `billing-api` Edge Function, Realtime invalidation, and the private `billing-documents` Storage bucket. The Vercel frontend calls the function directly. The Android SMS bridge uses the same function with a device-only pairing key. There is no Python/Render API fallback in the source.

## Important safety rules

- Keep the existing production project and database. Do not create or restore over production as part of ordinary code deployment.
- Before any database change, take a fresh PostgreSQL backup, verify it can be read, and copy it to a separate drive.
- Test migrations and data changes on the restored test project first. Apply only reviewed migrations, once, with `ON_ERROR_STOP` and a transaction where supported.
- Keep database passwords, service-role keys, Supabase access tokens, Edge Function secrets, and SMS pairing keys out of the repository, browser variables, screenshots, and chat.
- Use the publishable key only in the browser. The Edge Function uses server-side credentials and validates user sessions, operator membership, and device/Cron-specific credentials.
- Never retry a mutation automatically after a network timeout: the server might have committed it. Check the record before retrying.
- Preserve the `billing_audit` table and verified external backups. Audit history is not a replacement for backups.

## Deploy application code

1. Confirm the repository's function configuration targets the intended Supabase project.
2. Deploy the `billing-api` function from this repository with the Supabase CLI.
3. Confirm the function uses the production secrets configured in Supabase Dashboard; never put them in shell history or commit them.
4. Confirm Vercel has the production Supabase project URL and publishable key, then wait for the deployment to show Ready.
5. Sign in and smoke-test a dashboard read plus safe loan create/edit/delete, totals, and document access. Check Edge Function logs and the database afterward.

An ordinary frontend/Edge Function code deployment does not require restoring or migrating the database. If a future release includes `supabase/migrations/`, review its exact effects and rehearse it against the test project and a verified restore first.

## Data and write protections

- `billing-api` authenticates the owner and verifies operator access before financial APIs.
- Application tables have restricted direct browser grants and row-level protections. Mutations go through the function.
- Loan/customer writes are atomic. Captured snapshots and transaction locks protect edits from overwriting concurrent changes; imports are create-only.
- `billing_audit` records financial changes in the same transaction as supported mutations.
- `billing_changes` emits content-free invalidations for Realtime refresh. Confirmed saves update the current browser immediately.
- Documents use private object storage, random names, size/type limits, and short-lived signed URLs.
- SMS work is claimed atomically. A phone reports that Android accepted the message for submission; this does not confirm carrier delivery. Uncertain in-flight messages require checking before retry.

## Verify locally

From the repository root:

```powershell
npm ci --prefix testing
npm run test:supabase --prefix testing
node testing/test_frontend_save_safety.cjs
npm ci --prefix frontend
npm run build --prefix frontend
```

The automated tests use synthetic data. Also check production after deployment and retain tested backups. Free-tier cold starts, network conditions, and provider limits can affect response times.
