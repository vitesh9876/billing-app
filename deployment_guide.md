# Production deployment and data safety

## Services

- Web app: Vercel, connected to the GitHub production branch.
- Login, database, billing API, live refresh, documents: Supabase (Mumbai project).
- Android SMS bridge: the same Supabase `billing-api` Edge Function.

The repository has no Render/Python API deployment path. Deploy the Edge Function from this repository using the Supabase CLI and the intended project reference. Keep all passwords, scoped access tokens, service-role credentials, and function secrets out of command transcripts and Git.

## Before changing production

1. Confirm the application opens and an authorized owner can sign in.
2. Create a fresh database backup, verify its archive, and retain a second copy on a separate drive.
3. Review the exact code and migration changes. Migrations are not routine app deploys; apply only a reviewed migration that has been tested against a restored test database.
4. Deploy the Edge Function and confirm its logs show no errors.
5. Confirm Vercel's production deployment is Ready and its Supabase URL and publishable key point to the production project.
6. Smoke-test dashboard totals, loan create/edit/delete, customer changes, and document access with a known safe record. Remove test records only after confirming the cleanup.
7. Test the Android bridge with a controlled number before enabling it for shop reminders. A phone update can retain its local device UUID and encrypted pairing key, but confirm pairing and queue status after installation.

## Recovery

If a deploy has an application error, roll back the Vercel deployment or Edge Function code to the last known-good version. Do not restore the database for an application-only issue. Restore database data only from a verified backup after determining which records need recovery; restoring a full backup can overwrite newer customer and loan changes. Audit records supplement backups but are not a complete backup.

No deployment process can promise zero risk or perfect behavior. Keep verified backups, use the test project for schema changes, and perform the production smoke test after every release.
