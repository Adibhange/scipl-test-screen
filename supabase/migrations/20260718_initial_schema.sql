-- Run this migration in the Supabase SQL Editor (or with the Supabase CLI).
-- The app's route handlers use SUPABASE_SERVICE_ROLE_KEY; it must never be
-- exposed through a NEXT_PUBLIC_ variable.

create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  email text not null unique,
  role text not null,
  experience text not null,
  test_location text not null default 'home',
  hiring_location text,
  created_at timestamptz not null default now()
);

alter table public.candidates add column if not exists test_location text not null default 'home';
alter table public.candidates add column if not exists hiring_location text;
alter table public.candidates add column if not exists hiring_status text not null default 'screening';
alter table public.candidates add column if not exists expected_salary numeric;
alter table public.candidates add column if not exists offer_salary numeric;
alter table public.candidates add column if not exists hr_notes text;

create index if not exists candidates_email_idx on public.candidates (email);
create index if not exists candidates_created_at_idx on public.candidates (created_at desc);

create table if not exists public.question_documents (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.results (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('hr', 'interviewer', 'director')),
  created_at timestamptz not null default now()
);

create index if not exists results_created_at_idx on public.results (created_at desc);

alter table public.candidates enable row level security;
alter table public.question_documents enable row level security;
alter table public.results enable row level security;
alter table public.admin_users enable row level security;

-- No public policies are created: browser clients have no direct table access.
-- The Next.js server handles all reads and writes using the service-role key.

alter table public.candidates drop constraint if exists candidates_email_key;
alter table public.candidates add constraint candidates_email_key unique (email);

create table if not exists public.assessment_metadata (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  value text not null,
  label text not null,
  metadata jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint assessment_metadata_type_value_key unique (type, value)
);

alter table public.assessment_metadata enable row level security;
