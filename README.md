# SmartShop Billing

SmartShop is a single-shop billing and loan application. The production web app is hosted on Vercel and uses Supabase for authentication, PostgreSQL data, Edge Functions, Realtime updates, and private document storage. The Android SMS bridge connects to the same Supabase Edge Function using a device-scoped pairing key.

## Project layout

- `frontend/` — Next.js billing dashboard and browser client.
- `supabase/functions/billing-api/` — authenticated billing API and SMS bridge endpoints.
- `supabase/migrations/` — versioned database security and application migrations.
- `sms-bridge/` — Android companion app for queued SMS.
- `testing/` — synthetic-data backend, frontend-save, and request-routing checks.
- `supabase/migrations/` — access controls and private login/change audit history.

There is no separate Python API or Render proxy in the current application. Browser mutations go directly to the Supabase Edge Function; database access is protected by server-side authorization and database policies.

People can create an account using the private shop invite code. The code is checked by the Edge Function and is never included in frontend configuration. Accounts are added to the protected shop operator list. A signed-in user can change their password and review sign-in and record-change activity in the app.

## Run the web app locally

1. Install dependencies with `npm ci --prefix frontend`.
2. Create `frontend/.env.local` with the Supabase project URL and publishable key. Use the exact variable names in `frontend/.env.supabase.example`. These are public client configuration values; never put a database password, service-role key, or function secret in a `NEXT_PUBLIC_` variable.
3. Start the app with `npm run dev --prefix frontend` and open `http://localhost:3000`.

Production and preview deployments need the same two frontend variables in Vercel. A GitHub push to the connected production branch normally starts a Vercel deployment; verify that deployment is Ready and perform a sign-in/read/write smoke test after each release.

## Supabase operations

See [`supabase/README.md`](supabase/README.md) for backend configuration, migrations, secure deployment, backups, and recovery notes. Never run a schema migration against production without a fresh verified backup and a tested migration plan. Preserve the existing production project and records when deploying code updates.

The project reference is intentionally supplied through deployment configuration rather than embedded in deployment scripts. Secrets belong in Supabase Edge Function Secrets and Vercel's encrypted environment settings, not in Git.

## Android SMS bridge

The phone uses the production Supabase function URL by default. Build the app from `sms-bridge/`, pair its displayed device UUID at `/bridge`, and paste the one-time private pairing key into the app. Install and test the updated app before retiring any previously deployed SMS service. Never run two senders against the same live queue.

## Checks

```powershell
npm ci --prefix testing
npm run test:supabase --prefix testing
node testing/test_frontend_save_safety.cjs
npm ci --prefix frontend
npm run build --prefix frontend
```

Tests use synthetic data and do not connect to production. A successful build or unit test is not a substitute for checking the deployed app, permissions, current backups, and phone SMS behavior.
