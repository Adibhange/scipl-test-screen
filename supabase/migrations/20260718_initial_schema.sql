-- Run this migration in the Supabase SQL Editor (or with the Supabase CLI).
-- The app's route handlers use SUPABASE_SERVICE_ROLE_KEY; it must never be
-- exposed through a NEXT_PUBLIC_ variable.

create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  email text not null,
  role text not null,
  experience text not null,
  created_at timestamptz not null default now()
);

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

create index if not exists results_created_at_idx on public.results (created_at desc);

alter table public.candidates enable row level security;
alter table public.question_documents enable row level security;
alter table public.results enable row level security;

-- No public policies are created: browser clients have no direct table access.
-- The Next.js server handles all reads and writes using the service-role key.
