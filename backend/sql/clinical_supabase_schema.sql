-- RiskCare clinical data schema for Supabase
-- Idempotent bootstrap for JSON-backed clinical tables.

create table if not exists public.clinical_patients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clinical_specialists (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clinical_medical_records (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clinical_appointments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clinical_files (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists clinical_patients_user_id_idx
  on public.clinical_patients (user_id);
create index if not exists clinical_specialists_user_id_idx
  on public.clinical_specialists (user_id);
create index if not exists clinical_medical_records_user_id_idx
  on public.clinical_medical_records (user_id);
create index if not exists clinical_appointments_user_id_idx
  on public.clinical_appointments (user_id);
create index if not exists clinical_files_user_id_idx
  on public.clinical_files (user_id);
create index if not exists clinical_files_record_id_idx
  on public.clinical_files (record_id);

alter table public.clinical_patients enable row level security;
alter table public.clinical_specialists enable row level security;
alter table public.clinical_medical_records enable row level security;
alter table public.clinical_appointments enable row level security;
alter table public.clinical_files enable row level security;

drop policy if exists clinical_patients_owner_select on public.clinical_patients;
drop policy if exists clinical_patients_owner_write on public.clinical_patients;
create policy clinical_patients_owner_select
  on public.clinical_patients
  for select
  using (auth.uid() = user_id);
create policy clinical_patients_owner_write
  on public.clinical_patients
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists clinical_specialists_owner_select on public.clinical_specialists;
drop policy if exists clinical_specialists_owner_write on public.clinical_specialists;
create policy clinical_specialists_owner_select
  on public.clinical_specialists
  for select
  using (auth.uid() = user_id);
create policy clinical_specialists_owner_write
  on public.clinical_specialists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists clinical_medical_records_owner_select on public.clinical_medical_records;
drop policy if exists clinical_medical_records_owner_write on public.clinical_medical_records;
create policy clinical_medical_records_owner_select
  on public.clinical_medical_records
  for select
  using (auth.uid() = user_id);
create policy clinical_medical_records_owner_write
  on public.clinical_medical_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists clinical_appointments_owner_select on public.clinical_appointments;
drop policy if exists clinical_appointments_owner_write on public.clinical_appointments;
create policy clinical_appointments_owner_select
  on public.clinical_appointments
  for select
  using (auth.uid() = user_id);
create policy clinical_appointments_owner_write
  on public.clinical_appointments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists clinical_files_owner_select on public.clinical_files;
drop policy if exists clinical_files_owner_write on public.clinical_files;
create policy clinical_files_owner_select
  on public.clinical_files
  for select
  using (auth.uid() = user_id);
create policy clinical_files_owner_write
  on public.clinical_files
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
