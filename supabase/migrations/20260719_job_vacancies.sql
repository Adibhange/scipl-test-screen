-- Run this ENTIRE script in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)

-- ═══════════════════════════════════════════════════
-- 1. MASTER TABLES
-- ═══════════════════════════════════════════════════

create table if not exists public.master_roles (
  id uuid primary key default gen_random_uuid(),
  value text unique not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.master_experiences (
  id uuid primary key default gen_random_uuid(),
  value text unique not null,
  label text not null,
  filled_dots integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.master_hiring_locations (
  id uuid primary key default gen_random_uuid(),
  value text unique not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.master_test_locations (
  id uuid primary key default gen_random_uuid(),
  value text unique not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════
-- 2. JOB VACANCIES TABLE (drop old, recreate)
-- ═══════════════════════════════════════════════════

drop table if exists public.job_vacancies;

create table public.job_vacancies (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  experience text not null,
  hiring_location text not null,
  test_locations text[] not null default '{}',
  openings integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint job_vacancies_role_experience_hiring_key unique (role, experience, hiring_location)
);

-- ═══════════════════════════════════════════════════
-- 3. ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════

alter table public.master_roles enable row level security;
alter table public.master_experiences enable row level security;
alter table public.master_hiring_locations enable row level security;
alter table public.master_test_locations enable row level security;
alter table public.job_vacancies enable row level security;

-- ═══════════════════════════════════════════════════
-- 4. RLS POLICIES — allow full access via service_role (server-side)
--    and read access for anonymous (candidate form)
-- ═══════════════════════════════════════════════════

-- master_roles
drop policy if exists "Allow all for service_role" on public.master_roles;
drop policy if exists "Allow anon read" on public.master_roles;
create policy "Allow all for service_role" on public.master_roles
  for all using (true) with check (true);
create policy "Allow anon read" on public.master_roles
  for select to anon using (true);

-- master_experiences
drop policy if exists "Allow all for service_role" on public.master_experiences;
drop policy if exists "Allow anon read" on public.master_experiences;
create policy "Allow all for service_role" on public.master_experiences
  for all using (true) with check (true);
create policy "Allow anon read" on public.master_experiences
  for select to anon using (true);

-- master_hiring_locations
drop policy if exists "Allow all for service_role" on public.master_hiring_locations;
drop policy if exists "Allow anon read" on public.master_hiring_locations;
create policy "Allow all for service_role" on public.master_hiring_locations
  for all using (true) with check (true);
create policy "Allow anon read" on public.master_hiring_locations
  for select to anon using (true);

-- master_test_locations
drop policy if exists "Allow all for service_role" on public.master_test_locations;
drop policy if exists "Allow anon read" on public.master_test_locations;
create policy "Allow all for service_role" on public.master_test_locations
  for all using (true) with check (true);
create policy "Allow anon read" on public.master_test_locations
  for select to anon using (true);

-- job_vacancies
drop policy if exists "Allow all for service_role" on public.job_vacancies;
drop policy if exists "Allow anon read" on public.job_vacancies;
create policy "Allow all for service_role" on public.job_vacancies
  for all using (true) with check (true);
create policy "Allow anon read" on public.job_vacancies
  for select to anon using (true);

-- ═══════════════════════════════════════════════════
-- 5. SEED DEFAULT DATA
-- ═══════════════════════════════════════════════════

insert into public.master_roles (value, label) values
  ('reactjs_developer', 'ReactJS Developer'),
  ('nodejs_developer', 'Node.js Developer'),
  ('sql_developer', 'SQL Developer'),
  ('manual_tester', 'Manual Tester')
on conflict (value) do nothing;

insert into public.master_experiences (value, label, filled_dots) values
  ('0-1', '0-1 Years', 1),
  ('1-3', '1-3 Years', 2),
  ('3-5', '3-5 Years', 3),
  ('5+', '5+ Years',  4)
on conflict (value) do nothing;

insert into public.master_hiring_locations (value, label) values
  ('pune',   'Pune Office'),
  ('thane',  'Thane Office'),
  ('remote', 'Remote')
on conflict (value) do nothing;

insert into public.master_test_locations (value, label) values
  ('home',         'Home'),
  ('pune_office',  'Pune Office'),
  ('thane_office', 'Thane Office')
on conflict (value) do nothing;
