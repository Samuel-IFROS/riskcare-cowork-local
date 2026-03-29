# Supabase Integration (Cowork)

## Required env vars

Set these in `~/.eigent/.env` (backend runtime) or process env:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for cross-user admin sync)
- `SUPABASE_WORKERS_TABLE` (optional, default: `cowork_workers`)
- `SUPABASE_CLINICAL_PATIENTS_TABLE` (optional, default: `clinical_patients`)
- `SUPABASE_CLINICAL_SPECIALISTS_TABLE` (optional, default: `clinical_specialists`)
- `SUPABASE_CLINICAL_MEDICAL_RECORDS_TABLE` (optional, default: `clinical_medical_records`)
- `SUPABASE_CLINICAL_APPOINTMENTS_TABLE` (optional, default: `clinical_appointments`)
- `SUPABASE_CLINICAL_FILES_TABLE` (optional, default: `clinical_files`)

Frontend (`.env.development`) must expose:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## OAuth callback constraint

Google login is fixed to local callback:

- `http://localhost:3000/auth/callback`

Electron starts a local callback listener on port `3000` and forwards OAuth
`code` to the renderer.

## Workers table bootstrap

Run the SQL script in Supabase SQL Editor:

- `backend/sql/cowork_supabase_schema.sql`
- `backend/sql/clinical_supabase_schema.sql`

This script is idempotent and enforces:

- `cowork_` prefix for new table (`cowork_workers`)
- DRY/no-duplication check against existing worker-like tables

## Clinical sync flow

The desktop clinical module now supports:

- Google OAuth
- Microsoft OAuth (`azure` provider in Supabase)
- passwordless magic link by email
- explicit consent before reading or writing remote clinical data

Remote clinical sync uses these routes:

- `GET /clinical/snapshot`
- `PUT /clinical/snapshot`

The renderer keeps editing locally until the user explicitly authorizes
either:

- `Consultar desde Supabase`
- `Subir a Supabase`
